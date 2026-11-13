from routing_app.domain.models import Route, RouteSummary
from routing_app.services.recommendation import rank_and_recommend_routes


def make_test_route(
    route_id: str,
    label: str,
    severe_miles: float,
    high_miles: float,
    avg_risk: float,
    duration_seconds: float,
    has_no_travel: bool = False,
    no_travel_miles: float = 0.0,
) -> Route:
    summary = RouteSummary(
        total_miles=100.0,
        duration_seconds=duration_seconds,
        duration_hours_minutes="1h 40m",
        miles_by_level={
            "low": 0.0,
            "moderate": 0.0,
            "high": high_miles,
            "severe": severe_miles,
            "no_travel": no_travel_miles,
        },
        no_travel_miles=no_travel_miles,
        severe_miles=severe_miles,
        high_miles=high_miles,
        avg_risk=avg_risk,
        max_risk="SEVERE" if severe_miles > 0 else "MODERATE",
        checkpoint_count=5,
        worst_checkpoint=None,
        arrival_time="2026-11-13T12:00:00Z",
        has_no_travel=has_no_travel,
    )
    return Route(
        id=route_id,
        label=label,
        summary=summary,
        coordinates=[[40.0, -74.0], [41.0, -74.0]],
        checkpoints=[],
    )


def test_tie_break_1_fewest_severe_miles():
    route_a = make_test_route("route_a", "Route A", severe_miles=15.0, high_miles=0.0, avg_risk=1.5, duration_seconds=3600.0)
    route_b = make_test_route("route_b", "Route B", severe_miles=0.0, high_miles=10.0, avg_risk=1.6, duration_seconds=4000.0)

    outcome = rank_and_recommend_routes([route_a, route_b])
    assert outcome.recommended_route_id == "route_b"
    assert outcome.ranking[0]["route_id"] == "route_b"
    assert "Route B recommended" in outcome.explanation


def test_tie_break_2_fewest_high_miles():
    route_a = make_test_route("route_a", "Route A", severe_miles=0.0, high_miles=20.0, avg_risk=1.2, duration_seconds=3600.0)
    route_b = make_test_route("route_b", "Route B", severe_miles=0.0, high_miles=5.0, avg_risk=1.3, duration_seconds=3800.0)

    outcome = rank_and_recommend_routes([route_a, route_b])
    assert outcome.recommended_route_id == "route_b"
    assert "tied on severe miles" in outcome.explanation


def test_tie_break_3_lowest_avg_risk():
    route_a = make_test_route("route_a", "Route A", severe_miles=0.0, high_miles=0.0, avg_risk=1.45, duration_seconds=3600.0)
    route_b = make_test_route("route_b", "Route B", severe_miles=0.0, high_miles=0.0, avg_risk=0.85, duration_seconds=3800.0)

    outcome = rank_and_recommend_routes([route_a, route_b])
    assert outcome.recommended_route_id == "route_b"
    assert "lowest overall weather risk" in outcome.explanation


def test_tie_break_4_shortest_duration():
    route_a = make_test_route("route_a", "Route A", severe_miles=0.0, high_miles=0.0, avg_risk=0.50, duration_seconds=3600.0)
    route_b = make_test_route("route_b", "Route B", severe_miles=0.0, high_miles=0.0, avg_risk=0.50, duration_seconds=4200.0)

    outcome = rank_and_recommend_routes([route_a, route_b])
    assert outcome.recommended_route_id == "route_a"


def test_no_travel_routes_sorted_last():
    route_blocked = make_test_route(
        "route_a",
        "Route A",
        severe_miles=0.0,
        high_miles=0.0,
        avg_risk=0.5,
        duration_seconds=3000.0,
        has_no_travel=True,
        no_travel_miles=5.0,
    )
    route_severe = make_test_route(
        "route_b",
        "Route B",
        severe_miles=25.0,
        high_miles=10.0,
        avg_risk=2.0,
        duration_seconds=5000.0,
        has_no_travel=False,
    )

    outcome = rank_and_recommend_routes([route_blocked, route_severe])
    assert outcome.recommended_route_id == "route_b"
    assert not outcome.all_routes_blocked
    assert route_blocked.not_recommended


def test_all_routes_blocked():
    route_a = make_test_route(
        "route_a",
        "Route A",
        severe_miles=10.0,
        high_miles=0.0,
        avg_risk=3.0,
        duration_seconds=3600.0,
        has_no_travel=True,
        no_travel_miles=15.0,
    )
    route_b = make_test_route(
        "route_b",
        "Route B",
        severe_miles=5.0,
        high_miles=0.0,
        avg_risk=3.0,
        duration_seconds=4000.0,
        has_no_travel=True,
        no_travel_miles=4.0,
    )

    outcome = rank_and_recommend_routes([route_a, route_b])
    assert outcome.all_routes_blocked
    assert outcome.recommended_route_id == "route_b"
    assert "All routes encounter severe weather requiring No Travel" in outcome.explanation


def test_tolerance_handling():
    route_a = make_test_route("route_a", "Route A", severe_miles=5.01, high_miles=10.0, avg_risk=1.0, duration_seconds=3600.0)
    route_b = make_test_route("route_b", "Route B", severe_miles=5.04, high_miles=2.0, avg_risk=1.0, duration_seconds=4000.0)

    outcome = rank_and_recommend_routes([route_a, route_b])
    assert outcome.recommended_route_id == "route_b"
