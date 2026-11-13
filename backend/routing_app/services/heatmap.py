from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple
from routing_app.constants import (
    CORRIDOR_OFFSET_MILES,
    CORRIDOR_STEP_MILES,
    HEATMAP_HOURS,
    MAX_GRID_POINTS,
)
from routing_app.domain.models import Coordinate, HeatmapData, Route
from routing_app.domain.risk import classify_checkpoint_risk
from routing_app.services.eta import ensure_utc_datetime, round_to_nearest_utc_hour
from routing_app.services.geometry import (
    calculate_bearing_degrees,
    calculate_lateral_offsets,
    compute_cumulative_distances,
    interpolate_coordinate,
    normalize_cumulative_distances,
)
from routing_app.services.weather import (
    deduplicate_coordinates,
    extract_weather_sample_for_eta,
    get_cached_or_fetch_weather,
)


def compute_corridor_grid_points(
    routes: List[Route],
) -> List[Tuple[float, float]]:
    if not routes:
        return []

    total_route_miles = sum(r.summary.total_miles for r in routes)
    estimated_steps = (total_route_miles / CORRIDOR_STEP_MILES) * 3.0
    effective_step = CORRIDOR_STEP_MILES
    if estimated_steps > 250.0:
        effective_step = max(CORRIDOR_STEP_MILES, (total_route_miles * 3.0) / 250.0)

    raw_grid: List[Coordinate] = []

    for route in routes:
        coords = [Coordinate(lat=c[0], lng=c[1]) for c in route.coordinates]
        if len(coords) < 2:
            continue

        raw_cum = compute_cumulative_distances(coords)
        norm_cum = normalize_cumulative_distances(raw_cum, route.summary.total_miles)
        total_m = norm_cum[-1] if norm_cum else 0.0

        current_dist = 0.0
        while current_dist <= total_m:
            center = interpolate_coordinate(coords, norm_cum, current_dist)
            ahead_dist = min(current_dist + 2.0, total_m)
            ahead = interpolate_coordinate(coords, norm_cum, ahead_dist)

            bearing = calculate_bearing_degrees(center, ahead)
            left_pt, right_pt = calculate_lateral_offsets(
                center, bearing, CORRIDOR_OFFSET_MILES
            )

            raw_grid.append(center)
            raw_grid.append(left_pt)
            raw_grid.append(right_pt)

            if current_dist >= total_m:
                break
            current_dist = min(current_dist + effective_step, total_m)

    unique_pairs = deduplicate_coordinates(raw_grid)
    if len(unique_pairs) > MAX_GRID_POINTS:
        stride = len(unique_pairs) / float(MAX_GRID_POINTS)
        unique_pairs = [unique_pairs[int(i * stride)] for i in range(MAX_GRID_POINTS)]

    return unique_pairs


def generate_corridor_heatmap(
    routes: List[Route],
    departure_time: datetime,
    load_weight_lb: float,
) -> HeatmapData:
    start_time = round_to_nearest_utc_hour(ensure_utc_datetime(departure_time))
    grid_pairs = compute_corridor_grid_points(routes)

    if not grid_pairs:
        return HeatmapData(
            start_time_utc=start_time.isoformat(),
            hours=HEATMAP_HOURS,
            points=[],
            scores=[],
        )

    weather_by_pair = get_cached_or_fetch_weather(grid_pairs, forecast_days=3)

    scores_matrix: List[List[int]] = []
    points_list: List[Dict[str, float]] = []

    for pair in grid_pairs:
        points_list.append({"lat": pair[0], "lng": pair[1]})
        slots = weather_by_pair.get(pair, {})
        point_scores: List[int] = []

        for h in range(HEATMAP_HOURS):
            target_hour = start_time + timedelta(hours=h)
            if slots:
                sample = extract_weather_sample_for_eta(slots, target_hour)
                risk_res = classify_checkpoint_risk(
                    wind_mph=sample.wind_speed_mph,
                    rain_in_hr=sample.rain_in_hr,
                    snow_in_hr=sample.snow_in_hr,
                    load_weight_lb=load_weight_lb,
                )
                point_scores.append(risk_res.score)
            else:
                point_scores.append(0)

        scores_matrix.append(point_scores)

    return HeatmapData(
        start_time_utc=start_time.isoformat(),
        hours=HEATMAP_HOURS,
        points=points_list,
        scores=scores_matrix,
    )
