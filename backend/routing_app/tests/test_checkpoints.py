import math
import pytest
from routing_app.domain.models import Coordinate
from routing_app.services.checkpoints import (
    generate_checkpoint_mile_markers,
    place_checkpoints_along_route,
)


@pytest.mark.parametrize(
    "interval, expected_count",
    [
        (10, 11),
        (25, 5),
        (50, 3),
    ],
)
def test_checkpoint_placement_counts_100_miles(interval: int, expected_count: int):
    markers = generate_checkpoint_mile_markers(100.0, float(interval))
    assert len(markers) == expected_count
    assert markers[0] == 0.0
    assert markers[-1] == 100.0


def test_final_checkpoint_always_at_destination_non_multiple():
    markers = generate_checkpoint_mile_markers(73.4, 25.0)
    assert markers == [0.0, 25.0, 50.0, 73.4]
    assert markers[-1] == 73.4


def test_short_trip_checkpoints():
    markers = generate_checkpoint_mile_markers(8.2, 25.0)
    assert markers == [0.0, 8.2]


def test_place_checkpoints_along_route_interpolation():
    coords = [
        Coordinate(lat=34.0, lng=-118.0),
        Coordinate(lat=35.0, lng=-118.0),
    ]
    cum_dist = [0.0, 50.0]
    total_miles = 50.0
    interval_miles = 25.0

    placements = place_checkpoints_along_route(
        coordinates=coords,
        normalized_cumulative_distances=cum_dist,
        total_miles=total_miles,
        interval_miles=interval_miles,
    )

    assert len(placements) == 3
    assert placements[0].mile_marker == 0.0
    assert math.isclose(placements[0].coordinate.lat, 34.0)

    assert placements[1].mile_marker == 25.0
    assert math.isclose(placements[1].coordinate.lat, 34.5)

    assert placements[2].mile_marker == 50.0
    assert math.isclose(placements[2].coordinate.lat, 35.0)
