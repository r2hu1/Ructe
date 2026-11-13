from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from django.conf import settings
from django.core.cache import cache
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from routing_app.constants import (
    UPSTREAM_TIMEOUT_SECONDS,
    WEATHER_CACHE_TTL_SECONDS,
    WEATHER_CHUNK_SIZE,
)
from routing_app.domain.models import Coordinate, WeatherSample

logger = logging.getLogger("routing_app.weather")

_weather_fallback_active = False


def was_weather_fallback_used() -> bool:
    global _weather_fallback_active
    return _weather_fallback_active


def set_weather_fallback_used(value: bool) -> None:
    global _weather_fallback_active
    _weather_fallback_active = value


class UpstreamWeatherError(Exception):
    def __init__(self, message: str, code: str = "UPSTREAM_WEATHER_FAILURE"):
        super().__init__(message)
        self.message = message
        self.code = code


class UpstreamWeatherTimeoutError(Exception):
    def __init__(self, message: str, code: str = "UPSTREAM_TIMEOUT"):
        super().__init__(message)
        self.message = message
        self.code = code


def create_weather_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=1,
        backoff_factor=0.2,
        status_forcelist=[500, 502, 503, 504],
        raise_on_status=False,
        respect_retry_after_header=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def deduplicate_coordinates(
    coordinates: List[Coordinate],
) -> List[Tuple[float, float]]:
    seen: Set[Tuple[float, float]] = set()
    unique: List[Tuple[float, float]] = []
    for coord in coordinates:
        rounded = (round(coord.lat, 2), round(coord.lng, 2))
        if rounded not in seen:
            seen.add(rounded)
            unique.append(rounded)
    return unique


def build_weather_cache_key(lat: float, lng: float, date_str: str) -> str:
    return f"wx:{round(lat, 2)}:{round(lng, 2)}:{date_str}"


def parse_open_meteo_location_data(
    location_data: Dict[str, Any],
) -> Dict[str, Dict[str, float]]:
    hourly = location_data.get("hourly", {})
    times = hourly.get("time", [])
    winds = hourly.get("wind_speed_10m", [])
    rains = hourly.get("rain", [])
    showers = hourly.get("showers", [])
    snows = hourly.get("snowfall", [])

    slots: Dict[str, Dict[str, float]] = {}
    for i in range(len(times)):
        raw_t = times[i]
        iso_key = raw_t.replace("Z", "").strip()
        wind_val = float(winds[i]) if i < len(winds) and winds[i] is not None else 0.0
        rain_val = float(rains[i]) if i < len(rains) and rains[i] is not None else 0.0
        shower_val = float(showers[i]) if i < len(showers) and showers[i] is not None else 0.0
        snow_val = float(snows[i]) if i < len(snows) and snows[i] is not None else 0.0

        slots[iso_key] = {
            "wind_speed_mph": wind_val,
            "rain_in_hr": rain_val + shower_val,
            "snow_in_hr": snow_val,
        }
    return slots


def fetch_open_meteo_chunk(
    lat_lng_pairs: List[Tuple[float, float]],
    forecast_days: int = 3,
) -> Dict[Tuple[float, float], Dict[str, Dict[str, float]]]:
    if not lat_lng_pairs:
        return {}

    lats_str = ",".join(str(p[0]) for p in lat_lng_pairs)
    lngs_str = ",".join(str(p[1]) for p in lat_lng_pairs)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lats_str,
        "longitude": lngs_str,
        "hourly": "wind_speed_10m,rain,showers,snowfall",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "timezone": "GMT",
        "forecast_days": forecast_days,
    }

    session = create_weather_session()
    try:
        response = session.get(url, params=params, timeout=UPSTREAM_TIMEOUT_SECONDS)
    except requests.Timeout as exc:
        logger.warning("Open-Meteo request timed out: %s", exc)
        raise UpstreamWeatherTimeoutError("Open-Meteo weather service timed out") from exc
    except requests.RequestException as exc:
        logger.warning("Open-Meteo connection error: %s", exc)
        raise UpstreamWeatherError("Open-Meteo weather service connection error") from exc

    if response.status_code >= 500 or response.status_code == 429:
        raise UpstreamWeatherError(
            f"Open-Meteo service returned HTTP {response.status_code}: {response.text[:200]}"
        )

    if response.status_code != 200:
        raise UpstreamWeatherError(
            f"Open-Meteo request failed with HTTP {response.status_code}: {response.text[:200]}"
        )

    data = response.json()
    items: List[Dict[str, Any]]
    if isinstance(data, list):
        items = data
    else:
        items = [data]

    results: Dict[Tuple[float, float], Dict[str, Dict[str, float]]] = {}
    count = min(len(items), len(lat_lng_pairs))
    for idx in range(count):
        pair = lat_lng_pairs[idx]
        parsed_slots = parse_open_meteo_location_data(items[idx])
        results[pair] = parsed_slots

    return results


def generate_fallback_weather_slots(
    lat: float,
    lng: float,
    start_dt: datetime,
    forecast_days: int = 3,
) -> Dict[str, Dict[str, float]]:
    slots: Dict[str, Dict[str, float]] = {}
    base_wind = 10.0 + (abs(int(lat * 10)) % 15)
    base_rain = 0.0
    if (abs(int(lng * 10)) % 5) == 0:
        base_rain = 0.15

    total_hours = forecast_days * 24
    for h in range(total_hours):
        slot_dt = start_dt + timedelta(hours=h)
        iso_key = slot_dt.strftime("%Y-%m-%dT%H:00")
        hour_wind_var = ((h * 2 + int(lat)) % 7) - 3
        current_wind = max(4.0, base_wind + hour_wind_var)
        current_rain = base_rain if (h % 12 < 3) else 0.0
        current_snow = 0.0
        if lat > 42.0 and current_rain > 0.0:
            current_snow = 0.6
            current_rain = 0.0

        slots[iso_key] = {
            "wind_speed_mph": round(current_wind, 1),
            "rain_in_hr": round(current_rain, 2),
            "snow_in_hr": round(current_snow, 2),
        }
    return slots


def get_cached_or_fetch_weather(
    unique_pairs: List[Tuple[float, float]],
    forecast_days: int = 3,
    today_str: Optional[str] = None,
) -> Dict[Tuple[float, float], Dict[str, Dict[str, float]]]:
    current_date = today_str or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    weather_by_pair: Dict[Tuple[float, float], Dict[str, Dict[str, float]]] = {}
    missing_pairs: List[Tuple[float, float]] = []

    for pair in unique_pairs:
        cache_key = build_weather_cache_key(pair[0], pair[1], current_date)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            weather_by_pair[pair] = cached_data
        else:
            missing_pairs.append(pair)

    if missing_pairs:
        chunks = [
            missing_pairs[i : i + WEATHER_CHUNK_SIZE]
            for i in range(0, len(missing_pairs), WEATHER_CHUNK_SIZE)
        ]
        ttl = getattr(settings, "WEATHER_CACHE_TTL_SECONDS", WEATHER_CACHE_TTL_SECONDS)
        fallback_needed = False

        if len(chunks) == 1:
            try:
                chunk_results = fetch_open_meteo_chunk(chunks[0], forecast_days)
                for pair, slots in chunk_results.items():
                    weather_by_pair[pair] = slots
                    cache_key = build_weather_cache_key(pair[0], pair[1], current_date)
                    cache.set(cache_key, slots, timeout=ttl)
            except (UpstreamWeatherError, UpstreamWeatherTimeoutError) as exc:
                logger.warning("Weather fetch failed, falling back: %s", exc)
                fallback_needed = True
        else:
            try:
                with ThreadPoolExecutor(max_workers=min(4, len(chunks))) as executor:
                    future_to_chunk = {
                        executor.submit(fetch_open_meteo_chunk, chunk, forecast_days): chunk
                        for chunk in chunks
                    }
                    for future in as_completed(future_to_chunk):
                        chunk_results = future.result()
                        for pair, slots in chunk_results.items():
                            weather_by_pair[pair] = slots
                            cache_key = build_weather_cache_key(pair[0], pair[1], current_date)
                            cache.set(cache_key, slots, timeout=ttl)
            except (UpstreamWeatherError, UpstreamWeatherTimeoutError) as exc:
                logger.warning("Concurrent weather fetch failed, falling back: %s", exc)
                fallback_needed = True

        if fallback_needed:
            set_weather_fallback_used(True)
            now_dt = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
            for pair in missing_pairs:
                if pair not in weather_by_pair:
                    fallback_slots = generate_fallback_weather_slots(pair[0], pair[1], now_dt, forecast_days)
                    weather_by_pair[pair] = fallback_slots
                    cache_key = build_weather_cache_key(pair[0], pair[1], current_date)
                    cache.set(cache_key, fallback_slots, timeout=ttl)

    return weather_by_pair


def extract_weather_sample_for_eta(
    slots: Dict[str, Dict[str, float]],
    target_utc: datetime,
) -> WeatherSample:
    if not slots:
        raise UpstreamWeatherError("No weather slots available for location")

    sorted_times = sorted(slots.keys())
    target_str = target_utc.strftime("%Y-%m-%dT%H:00")

    if target_str in slots:
        selected_slot = slots[target_str]
        selected_time = target_str
        extrapolated = False
    else:
        target_timestamp = target_utc.timestamp()
        best_time = sorted_times[0]
        min_diff = float("inf")

        for time_str in sorted_times:
            dt = datetime.fromisoformat(time_str).replace(tzinfo=timezone.utc)
            diff = abs(dt.timestamp() - target_timestamp)
            if diff < min_diff:
                min_diff = diff
                best_time = time_str

        selected_slot = slots[best_time]
        selected_time = best_time
        latest_available_dt = datetime.fromisoformat(sorted_times[-1]).replace(tzinfo=timezone.utc)
        extrapolated = target_utc > latest_available_dt

    return WeatherSample(
        time_utc=selected_time,
        wind_speed_mph=selected_slot["wind_speed_mph"],
        rain_in_hr=selected_slot["rain_in_hr"],
        snow_in_hr=selected_slot["snow_in_hr"],
        forecast_extrapolated=extrapolated,
    )
