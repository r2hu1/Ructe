import math
from typing import List, Tuple
from routing_app.constants import EARTH_RADIUS_MILES
from routing_app.domain.models import Coordinate


def haversine_distance_miles(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_MILES * c


def compute_cumulative_distances(
    coordinates: List[Coordinate],
) -> List[float]:
    if not coordinates:
        return []
    cumulative = [0.0]
    for i in range(1, len(coordinates)):
        dist = haversine_distance_miles(
            coordinates[i - 1].lat,
            coordinates[i - 1].lng,
            coordinates[i].lat,
            coordinates[i].lng,
        )
        cumulative.append(cumulative[-1] + dist)
    return cumulative


def normalize_cumulative_distances(
    cumulative_distances: List[float],
    provider_reported_miles: float,
) -> List[float]:
    if not cumulative_distances:
        return []
    total_computed = cumulative_distances[-1]
    if total_computed <= 0.0 or provider_reported_miles <= 0.0:
        return list(cumulative_distances)
    scale = provider_reported_miles / total_computed
    normalized = [dist * scale for dist in cumulative_distances]
    normalized[-1] = provider_reported_miles
    return normalized


def interpolate_coordinate(
    coordinates: List[Coordinate],
    cumulative_distances: List[float],
    target_distance_miles: float,
) -> Coordinate:
    if not coordinates:
        raise ValueError("Cannot interpolate in empty coordinates list")
    if len(coordinates) == 1 or target_distance_miles <= 0.0:
        return coordinates[0]
    if target_distance_miles >= cumulative_distances[-1]:
        return coordinates[-1]

    for i in range(len(cumulative_distances) - 1):
        start_dist = cumulative_distances[i]
        end_dist = cumulative_distances[i + 1]
        if start_dist <= target_distance_miles <= end_dist:
            segment_length = end_dist - start_dist
            if segment_length <= 0.0:
                return coordinates[i]
            t = (target_distance_miles - start_dist) / segment_length
            lat = coordinates[i].lat + t * (coordinates[i + 1].lat - coordinates[i].lat)
            lng = coordinates[i].lng + t * (coordinates[i + 1].lng - coordinates[i].lng)
            return Coordinate(lat=lat, lng=lng)

    return coordinates[-1]


def calculate_bearing_degrees(
    start: Coordinate,
    end: Coordinate,
) -> float:
    phi1 = math.radians(start.lat)
    phi2 = math.radians(end.lat)
    delta_lambda = math.radians(end.lng - start.lng)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing_rad = math.atan2(y, x)
    return (math.degrees(bearing_rad) + 360.0) % 360.0


def calculate_destination_point(
    start: Coordinate,
    bearing_degrees: float,
    distance_miles: float,
) -> Coordinate:
    delta = distance_miles / EARTH_RADIUS_MILES
    theta = math.radians(bearing_degrees)
    phi1 = math.radians(start.lat)
    lambda1 = math.radians(start.lng)

    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta) + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    )
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2),
    )
    return Coordinate(lat=math.degrees(phi2), lng=math.degrees(lambda2))


def calculate_lateral_offsets(
    point: Coordinate,
    bearing_degrees: float,
    offset_miles: float,
) -> Tuple[Coordinate, Coordinate]:
    left_bearing = (bearing_degrees - 90.0 + 360.0) % 360.0
    right_bearing = (bearing_degrees + 90.0) % 360.0
    left_point = calculate_destination_point(point, left_bearing, offset_miles)
    right_point = calculate_destination_point(point, right_bearing, offset_miles)
    return left_point, right_point
