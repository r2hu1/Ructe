from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging
from typing import List, Optional
from django.conf import settings
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from routing_app.constants import UPSTREAM_TIMEOUT_SECONDS
from routing_app.domain.models import Coordinate

logger = logging.getLogger("routing_app.routing_providers")

METERS_TO_MILES = 0.000621371
ROUTE_IDS = ["route_a", "route_b", "route_c"]
ROUTE_LABELS = ["Route A", "Route B", "Route C"]


class RoutingError(Exception):
    def __init__(self, message: str, code: str = "UNROUTABLE"):
        super().__init__(message)
        self.message = message
        self.code = code


class UpstreamRoutingError(Exception):
    def __init__(self, message: str, code: str = "UPSTREAM_ROUTING_FAILURE"):
        super().__init__(message)
        self.message = message
        self.code = code


class UpstreamRoutingTimeoutError(Exception):
    def __init__(self, message: str, code: str = "UPSTREAM_TIMEOUT"):
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass(frozen=True)
class RawRoute:
    id: str
    label: str
    distance_miles: float
    duration_seconds: float
    coordinates: List[Coordinate]


def create_resilient_session() -> requests.Session:
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


class RoutingProvider(ABC):
    @abstractmethod
    def get_routes(self, origin: Coordinate, destination: Coordinate) -> List[RawRoute]:
        pass


class MapboxRoutingProvider(RoutingProvider):
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token or getattr(settings, "MAPBOX_ACCESS_TOKEN", "").strip()

    def get_routes(self, origin: Coordinate, destination: Coordinate) -> List[RawRoute]:
        if not self.access_token:
            raise RoutingError("Mapbox access token is not configured")

        url = (
            f"https://api.mapbox.com/directions/v5/mapbox/driving/"
            f"{origin.lng},{origin.lat};{destination.lng},{destination.lat}"
        )
        params = {
            "alternatives": "true",
            "geometries": "geojson",
            "overview": "full",
            "steps": "false",
            "access_token": self.access_token,
        }

        session = create_resilient_session()
        try:
            response = session.get(url, params=params, timeout=UPSTREAM_TIMEOUT_SECONDS)
        except requests.Timeout as exc:
            logger.warning("Mapbox directions request timed out: %s", exc)
            raise UpstreamRoutingTimeoutError("Mapbox routing service timed out") from exc
        except requests.RequestException as exc:
            logger.warning("Mapbox directions connection error: %s", exc)
            raise UpstreamRoutingError("Mapbox routing connection error") from exc

        if response.status_code >= 500 or response.status_code == 429:
            raise UpstreamRoutingError(f"Mapbox returned status {response.status_code}")

        if response.status_code == 422 or response.status_code == 404:
            raise RoutingError("No route found between origin and destination")

        if response.status_code != 200:
            raise UpstreamRoutingError(f"Mapbox returned unexpected status {response.status_code}")

        data = response.json()
        routes_data = data.get("routes", [])
        if not routes_data:
            raise RoutingError("No routes returned by Mapbox")

        raw_routes: List[RawRoute] = []
        for idx, route_item in enumerate(routes_data[:3]):
            coords_raw = route_item.get("geometry", {}).get("coordinates", [])
            coords = [
                Coordinate(lat=float(c[1]), lng=float(c[0]))
                for c in coords_raw
                if len(c) >= 2
            ]
            distance_meters = float(route_item.get("distance", 0.0))
            duration_seconds = float(route_item.get("duration", 0.0))

            raw_routes.append(
                RawRoute(
                    id=ROUTE_IDS[idx],
                    label=ROUTE_LABELS[idx],
                    distance_miles=distance_meters * METERS_TO_MILES,
                    duration_seconds=duration_seconds,
                    coordinates=coords,
                )
            )

        return raw_routes


class OpenRouteServiceRoutingProvider(RoutingProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "ORS_API_KEY", "").strip()

    def get_routes(self, origin: Coordinate, destination: Coordinate) -> List[RawRoute]:
        if not self.api_key:
            raise RoutingError("OpenRouteService API key is not configured")

        url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
        }
        body = {
            "coordinates": [
                [origin.lng, origin.lat],
                [destination.lng, destination.lat],
            ],
            "alternative_routes": {
                "target_count": 3,
                "weight_factor": 1.4,
                "share_factor": 0.6,
            },
        }

        session = create_resilient_session()
        try:
            response = session.post(
                url, json=body, headers=headers, timeout=UPSTREAM_TIMEOUT_SECONDS
            )
        except requests.Timeout as exc:
            logger.warning("ORS directions request timed out: %s", exc)
            raise UpstreamRoutingTimeoutError("OpenRouteService timed out") from exc
        except requests.RequestException as exc:
            logger.warning("ORS directions connection error: %s", exc)
            raise UpstreamRoutingError("OpenRouteService connection error") from exc

        if response.status_code >= 500 or response.status_code == 429:
            raise UpstreamRoutingError(f"OpenRouteService returned status {response.status_code}")

        if response.status_code in (400, 404, 422):
            raise RoutingError("No route found between coordinates in OpenRouteService")

        if response.status_code != 200:
            raise UpstreamRoutingError(
                f"OpenRouteService returned unexpected status {response.status_code}"
            )

        data = response.json()
        features = data.get("features", [])
        if not features:
            raise RoutingError("No routes returned by OpenRouteService")

        raw_routes: List[RawRoute] = []
        for idx, feat in enumerate(features[:3]):
            coords_raw = feat.get("geometry", {}).get("coordinates", [])
            coords = [
                Coordinate(lat=float(c[1]), lng=float(c[0]))
                for c in coords_raw
                if len(c) >= 2
            ]
            summary = feat.get("properties", {}).get("summary", {})
            distance_meters = float(summary.get("distance", 0.0))
            duration_seconds = float(summary.get("duration", 0.0))

            raw_routes.append(
                RawRoute(
                    id=ROUTE_IDS[idx],
                    label=ROUTE_LABELS[idx],
                    distance_miles=distance_meters * METERS_TO_MILES,
                    duration_seconds=duration_seconds,
                    coordinates=coords,
                )
            )

        return raw_routes


def get_routing_provider(provider_name: Optional[str] = None) -> RoutingProvider:
    name = (provider_name or getattr(settings, "ROUTING_PROVIDER", "mapbox")).lower().strip()
    if name in ("openrouteservice", "ors"):
        return OpenRouteServiceRoutingProvider()
    return MapboxRoutingProvider()
