from dataclasses import dataclass
from typing import List
from routing_app.domain.models import Coordinate
from routing_app.services.geometry import interpolate_coordinate


@dataclass(frozen=True)
class CheckpointPlacement:
    index: int
    mile_marker: float
    coordinate: Coordinate


def generate_checkpoint_mile_markers(
    total_miles: float,
    interval_miles: float,
) -> List[float]:
    if total_miles <= 0.0:
        return [0.0]

    markers = [0.0]
    current = float(interval_miles)
    snap_epsilon = 0.05

    while current < (total_miles - snap_epsilon):
        markers.append(round(current, 3))
        current += float(interval_miles)

    markers.append(round(total_miles, 3))
    return markers


def place_checkpoints_along_route(
    coordinates: List[Coordinate],
    normalized_cumulative_distances: List[float],
    total_miles: float,
    interval_miles: float,
) -> List[CheckpointPlacement]:
    if not coordinates:
        return []

    markers = generate_checkpoint_mile_markers(
        total_miles=total_miles,
        interval_miles=interval_miles,
    )

    placements: List[CheckpointPlacement] = []
    for idx, marker in enumerate(markers):
        coord = interpolate_coordinate(
            coordinates=coordinates,
            cumulative_distances=normalized_cumulative_distances,
            target_distance_miles=marker,
        )
        placements.append(
            CheckpointPlacement(
                index=idx,
                mile_marker=marker,
                coordinate=coord,
            )
        )

    return placements
