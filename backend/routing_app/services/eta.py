from datetime import datetime, timedelta, timezone
from typing import Tuple


def ensure_utc_datetime(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        raise ValueError("Datetime must be timezone-aware")
    return dt.astimezone(timezone.utc)


def compute_checkpoint_eta(
    departure_time: datetime,
    mile_marker: float,
    total_miles: float,
    route_duration_seconds: float,
) -> datetime:
    utc_departure = ensure_utc_datetime(departure_time)
    if total_miles <= 0.0 or route_duration_seconds <= 0.0 or mile_marker <= 0.0:
        return utc_departure

    progress = min(max(mile_marker / total_miles, 0.0), 1.0)
    travel_seconds = progress * route_duration_seconds
    return utc_departure + timedelta(seconds=travel_seconds)


def round_to_nearest_utc_hour(dt: datetime) -> datetime:
    utc_dt = ensure_utc_datetime(dt)
    if utc_dt.minute >= 30:
        base = utc_dt.replace(minute=0, second=0, microsecond=0)
        return base + timedelta(hours=1)
    return utc_dt.replace(minute=0, second=0, microsecond=0)


def clamp_forecast_hour(
    target_dt: datetime,
    forecast_start_dt: datetime,
    max_forecast_hours: int,
) -> Tuple[datetime, int, bool]:
    utc_target = round_to_nearest_utc_hour(target_dt)
    utc_start = round_to_nearest_utc_hour(forecast_start_dt)

    raw_hour_diff = int((utc_target - utc_start).total_seconds() // 3600)

    if raw_hour_diff < 0:
        return utc_start, 0, False

    if raw_hour_diff >= max_forecast_hours:
        clamped_dt = utc_start + timedelta(hours=max_forecast_hours - 1)
        return clamped_dt, max_forecast_hours - 1, True

    return utc_target, raw_hour_diff, False
