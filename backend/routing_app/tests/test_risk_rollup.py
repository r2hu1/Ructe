import math
import pytest
from routing_app.constants import RiskLevel
from routing_app.domain.models import (
    Checkpoint,
    RiskDrivers,
    RiskResult,
    WeatherSample,
)
from routing_app.services.risk_rollup import (
    build_route_summary,
    calculate_segment_attributed_miles,
)


def make_test_checkpoint(
    cp_id: str,
    mile: float,
    level: RiskLevel,
    wind: float = 10.0,
    rain: float = 0.0,
    snow: float = 0.0,
) -> Checkpoint:
    weather = WeatherSample(
        time_utc="2026-11-13T10:00:00Z",
        wind_speed_mph=wind,
        rain_in_hr=rain,
        snow_in_hr=snow,
    )
    drivers = RiskDrivers(dominant_factor="none")
    risk = RiskResult(
        level=level,
        score=int(level),
        label=level.name,
        drivers=drivers,
    )
    return Checkpoint(
        id=cp_id,
        mile_marker=mile,
        lat=40.0,
        lng=-74.0,
        eta_utc="2026-11-13T10:00:00Z",
        forecast_hour_index=0,
        weather=weather,
        risk=risk,
    )


def test_segment_mile_attribution_sums_to_total_miles():
    markers = [0.0, 25.0, 50.0, 75.0, 100.0]
    total_miles = 100.0
    attributed = calculate_segment_attributed_miles(markers, total_miles)

    assert len(attributed) == 5
    assert attributed[0] == 12.5
    assert attributed[1] == 25.0
    assert attributed[2] == 25.0
    assert attributed[3] == 25.0
    assert attributed[4] == 12.5
    assert math.isclose(sum(attributed), total_miles, abs_tol=1e-4)


def test_single_and_two_checkpoint_edge_cases():
    single_markers = [0.0]
    single_attr = calculate_segment_attributed_miles(single_markers, 0.0)
    assert single_attr == [0.0]
    assert math.isclose(sum(single_attr), 0.0)

    two_markers = [0.0, 10.0]
    two_attr = calculate_segment_attributed_miles(two_markers, 10.0)
    assert two_attr == [5.0, 5.0]
    assert math.isclose(sum(two_attr), 10.0)


def test_build_route_summary_weighted_average_and_worst_checkpoint():
    cp1 = make_test_checkpoint("cp1", 0.0, RiskLevel.LOW)
    cp2 = make_test_checkpoint("cp2", 50.0, RiskLevel.SEVERE, wind=50.0)
    cp3 = make_test_checkpoint("cp3", 100.0, RiskLevel.MODERATE)

    checkpoints = [cp1, cp2, cp3]
    summary = build_route_summary(
        checkpoints=checkpoints,
        total_miles=100.0,
        duration_seconds=7200.0,
        arrival_time_utc="2026-11-13T12:00:00Z",
    )

    assert summary.total_miles == 100.0
    assert summary.duration_hours_minutes == "2h 0m"
    assert summary.max_risk == "SEVERE"
    assert not summary.has_no_travel
    assert summary.severe_miles == 50.0
    assert summary.miles_by_level["low"] == 25.0
    assert summary.miles_by_level["moderate"] == 25.0

    expected_avg = (25.0 * 0 + 50.0 * 3 + 25.0 * 1) / 100.0
    assert math.isclose(summary.avg_risk, expected_avg, abs_tol=1e-3)
    assert summary.worst_checkpoint is not None
    assert summary.worst_checkpoint["id"] == "cp2"
    assert summary.worst_checkpoint["risk_level"] == "SEVERE"
