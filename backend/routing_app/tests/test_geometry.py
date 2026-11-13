import math
import pytest
from routing_app.domain.models import Coordinate
from routing_app.services.geometry import (
    calculate_bearing_degrees,
    calculate_lateral_offsets,
    compute_cumulative_distances,
    haversine_distance_miles,
    interpolate_coordinate,
    normalize_cumulative_distances,
)


def test_haversine_accuracy_known_city_pairs():
    nyc_lat, nyc_lng = 40.7128, -74.0060
    la_lat, la_lng = 34.0522, -118.2437
    dist_nyc_la = haversine_distance_miles(nyc_lat, nyc_lng, la_lat, la_lng)
    assert 2440.0 < dist_nyc_la < 2460.0

    london_lat, london_lng = 51.5074, -0.1278
    paris_lat, paris_lng = 48.8566, 2.3522
    dist_london_paris = haversine_distance_miles(london_lat, london_lng, paris_lat, paris_lng)
    assert 210.0 < dist_london_paris < 216.0


def test_cumulative_distances_and_normalization():
    coords = [
        Coordinate(lat=40.0, lng=-74.0),
        Coordinate(lat=40.5, lng=-74.0),
        Coordinate(lat=41.0, lng=-74.0),
    ]
    raw_cum = compute_cumulative_distances(coords)
    assert len(raw_cum) == 3
    assert raw_cum[0] == 0.0
    assert raw_cum[1] > 0.0
    assert raw_cum[2] > raw_cum[1]

    provider_miles = 100.0
    normalized = normalize_cumulative_distances(raw_cum, provider_miles)
    assert len(normalized) == 3
    assert normalized[0] == 0.0
    assert normalized[-1] == 100.0
    assert math.isclose(normalized[1], 50.0, rel_tol=1e-2)


def test_interpolate_coordinate_start_end_mid():
    coords = [
        Coordinate(lat=30.0, lng=-90.0),
        Coordinate(lat=32.0, lng=-90.0),
    ]
    cum_dist = [0.0, 100.0]

    start = interpolate_coordinate(coords, cum_dist, 0.0)
    assert math.isclose(start.lat, 30.0)
    assert math.isclose(start.lng, -90.0)

    end = interpolate_coordinate(coords, cum_dist, 100.0)
    assert math.isclose(end.lat, 32.0)
    assert math.isclose(end.lng, -90.0)

    mid = interpolate_coordinate(coords, cum_dist, 50.0)
    assert math.isclose(mid.lat, 31.0)
    assert math.isclose(mid.lng, -90.0)


def test_bearing_and_lateral_offsets():
    start = Coordinate(lat=0.0, lng=0.0)
    end = Coordinate(lat=1.0, lng=0.0)
    bearing = calculate_bearing_degrees(start, end)
    assert math.isclose(bearing, 0.0, abs_tol=1e-1)

    left, right = calculate_lateral_offsets(start, bearing, 15.0)
    assert left.lng < 0.0
    assert right.lng > 0.0
