import logging
import urllib.parse
from typing import Any, Dict, List
from django.conf import settings
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from routing_app.constants import UPSTREAM_TIMEOUT_SECONDS
from routing_app.domain.models import Location

logger = logging.getLogger("routing_app.geocoding")


class GeocodingError(Exception):
    def __init__(self, message: str, code: str = "UNABLE_TO_GEOCODE"):
        super().__init__(message)
        self.message = message
        self.code = code


class UpstreamServiceError(Exception):
    def __init__(self, message: str, code: str = "UPSTREAM_FAILURE"):
        super().__init__(message)
        self.message = message
        self.code = code


class UpstreamTimeoutError(Exception):
    def __init__(self, message: str, code: str = "UPSTREAM_TIMEOUT"):
        super().__init__(message)
        self.message = message
        self.code = code


def get_requests_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=2,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def autocomplete_places(query: str) -> List[Dict[str, Any]]:
    clean_query = query.strip()
    if not clean_query:
        return []

    token = getattr(settings, "MAPBOX_ACCESS_TOKEN", "").strip()
    if not token:
        logger.warning("Mapbox access token is missing for autocomplete")
        return []

    encoded = urllib.parse.quote(clean_query)
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}.json"
    params = {
        "access_token": token,
        "autocomplete": "true",
        "limit": 5,
    }

    session = get_requests_session()
    try:
        response = session.get(url, params=params, timeout=UPSTREAM_TIMEOUT_SECONDS)
    except requests.Timeout as exc:
        logger.warning("Geocoding autocomplete timed out: %s", exc)
        raise UpstreamTimeoutError("Geocoding service timed out") from exc
    except requests.RequestException as exc:
        logger.warning("Geocoding autocomplete request failed: %s", exc)
        raise UpstreamServiceError("Geocoding upstream connection error") from exc

    if response.status_code >= 500 or response.status_code == 429:
        raise UpstreamServiceError(f"Geocoding service returned status {response.status_code}")

    if response.status_code != 200:
        return []

    data = response.json()
    features = data.get("features", [])
    results: List[Dict[str, Any]] = []
    for feature in features:
        center = feature.get("center", [])
        if len(center) >= 2:
            results.append(
                {
                    "label": feature.get("place_name", clean_query),
                    "lng": float(center[0]),
                    "lat": float(center[1]),
                }
            )
    return results[:5]


def geocode_address(query: str) -> Location:
    clean_query = query.strip()
    if not clean_query:
        raise GeocodingError("Address string is empty")

    token = getattr(settings, "MAPBOX_ACCESS_TOKEN", "").strip()
    if not token:
        raise GeocodingError("Mapbox access token is not configured")

    encoded = urllib.parse.quote(clean_query)
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}.json"
    params = {
        "access_token": token,
        "limit": 1,
    }

    session = get_requests_session()
    try:
        response = session.get(url, params=params, timeout=UPSTREAM_TIMEOUT_SECONDS)
    except requests.Timeout as exc:
        raise UpstreamTimeoutError("Geocoding service timed out") from exc
    except requests.RequestException as exc:
        raise UpstreamServiceError("Geocoding upstream connection error") from exc

    if response.status_code >= 500 or response.status_code == 429:
        raise UpstreamServiceError(f"Geocoding service returned status {response.status_code}")

    if response.status_code != 200:
        raise GeocodingError(f"Failed to geocode address: {clean_query}")

    data = response.json()
    features = data.get("features", [])
    if not features:
        raise GeocodingError(f"No location found for: {clean_query}")

    first = features[0]
    center = first.get("center", [])
    if len(center) < 2:
        raise GeocodingError(f"Malformed geocoding response for: {clean_query}")

    return Location(
        lat=float(center[1]),
        lng=float(center[0]),
        label=first.get("place_name", clean_query),
    )
