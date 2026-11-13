from datetime import datetime, timezone
import json
import urllib.parse
import responses
from routing_app.constants import HEATMAP_HOURS, MAX_GRID_POINTS
from routing_app.domain.models import Route, RouteSummary
from routing_app.services.heatmap import (
    compute_corridor_grid_points,
    generate_corridor_heatmap,
)


def make_corridor_route(route_id: str, total_miles: float, lat_start: float, lat_end: float) -> Route:
    summary = RouteSummary(
        total_miles=total_miles,
        duration_seconds=total_miles * 60.0,
        duration_hours_minutes="10h 0m",
        miles_by_level={"low": total_miles, "moderate": 0.0, "high": 0.0, "severe": 0.0, "no_travel": 0.0},
        no_travel_miles=0.0,
        severe_miles=0.0,
        high_miles=0.0,
        avg_risk=0.0,
        max_risk="LOW",
        checkpoint_count=2,
        worst_checkpoint=None,
        arrival_time="2026-11-13T20:00:00Z",
        has_no_travel=False,
    )
    return Route(
        id=route_id,
        label=route_id,
        summary=summary,
        coordinates=[[lat_start, -74.0], [lat_end, -74.0]],
        checkpoints=[],
    )


def test_corridor_grid_generation_cap():
    r1 = make_corridor_route("r1", 1200.0, 30.0, 45.0)
    r2 = make_corridor_route("r2", 1200.0, 30.0, 45.0)
    r3 = make_corridor_route("r3", 1200.0, 30.0, 45.0)

    points = compute_corridor_grid_points([r1, r2, r3])
    assert len(points) <= MAX_GRID_POINTS
    assert len(points) > 10


def test_corridor_offsets_perpendicular_to_north():
    r = make_corridor_route("r_north", 100.0, 35.0, 36.5)
    points = compute_corridor_grid_points([r])

    center_lng = -74.0
    left_lngs = [p[1] for p in points if p[1] < center_lng]
    right_lngs = [p[1] for p in points if p[1] > center_lng]

    assert len(left_lngs) > 0
    assert len(right_lngs) > 0


@responses.activate
def test_generate_corridor_heatmap_payload_shape(open_meteo_weather_fixture):
    r = make_corridor_route("r_short", 50.0, 40.0, 40.7)
    departure = datetime(2026, 11, 13, 10, 0, 0, tzinfo=timezone.utc)

    def open_meteo_callback(request):
        parsed_url = urllib.parse.urlparse(request.url)
        params = urllib.parse.parse_qs(parsed_url.query)
        lats = params.get("latitude", [""])[0].split(",")
        response_body = [open_meteo_weather_fixture for _ in range(len(lats))]
        return (200, {"Content-Type": "application/json"}, json.dumps(response_body))

    responses.add_callback(
        responses.GET,
        "https://api.open-meteo.com/v1/forecast",
        callback=open_meteo_callback,
    )

    heatmap_data = generate_corridor_heatmap(
        routes=[r],
        departure_time=departure,
        load_weight_lb=35000.0,
    )

    assert heatmap_data.hours == HEATMAP_HOURS
    assert len(heatmap_data.points) > 0
    assert len(heatmap_data.scores) == len(heatmap_data.points)

    for point_scores in heatmap_data.scores:
        assert len(point_scores) == HEATMAP_HOURS
        for score in point_scores:
            assert score in (0, 1, 2, 3, 4)
