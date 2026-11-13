from dataclasses import dataclass
from typing import Any, Dict, List, Tuple
from routing_app.constants import TOLERANCE_AVG_RISK, TOLERANCE_MILES
from routing_app.domain.models import Route


@dataclass(frozen=True)
class RecommendationOutcome:
    recommended_route_id: str
    ranking: List[Dict[str, Any]]
    all_routes_blocked: bool
    explanation: str


def compute_route_sort_key(route: Route) -> Tuple[int, float, float, float, float, int]:
    has_no_travel = 1 if route.summary.has_no_travel else 0
    quantized_no_travel = (
        round(route.summary.no_travel_miles / TOLERANCE_MILES) * TOLERANCE_MILES
    )
    quantized_severe = (
        round(route.summary.severe_miles / TOLERANCE_MILES) * TOLERANCE_MILES
    )
    quantized_high = (
        round(route.summary.high_miles / TOLERANCE_MILES) * TOLERANCE_MILES
    )
    quantized_avg_risk = (
        round(route.summary.avg_risk / TOLERANCE_AVG_RISK) * TOLERANCE_AVG_RISK
    )
    quantized_duration = int(round(route.summary.duration_seconds))

    return (
        has_no_travel,
        quantized_no_travel,
        quantized_severe,
        quantized_high,
        quantized_avg_risk,
        quantized_duration,
    )


def generate_recommendation_explanation(
    routes: List[Route],
    recommended: Route,
    all_blocked: bool,
) -> str:
    if not routes:
        return "No routes available to analyze."

    if len(routes) == 1:
        return (
            f"{recommended.label} is the only available route with "
            f"{recommended.summary.severe_miles:.1f} severe miles and "
            f"{recommended.summary.duration_hours_minutes} travel time."
        )

    if all_blocked:
        return (
            f"Warning: All routes encounter severe weather requiring No Travel. "
            f"{recommended.label} has the fewest No Travel miles "
            f"({recommended.summary.no_travel_miles:.1f} mi)."
        )

    fastest_route = min(routes, key=lambda r: r.summary.duration_seconds)
    time_diff_sec = recommended.summary.duration_seconds - fastest_route.summary.duration_seconds
    time_diff_min = int(round(time_diff_sec / 60.0))

    if time_diff_min <= 0:
        time_clause = f"It is also the fastest route ({recommended.summary.duration_hours_minutes})."
    else:
        time_clause = f"It is {time_diff_min} minutes slower than the fastest route."

    other_routes = [r for r in routes if r.id != recommended.id]
    severe_diffs = [
        f"{r.summary.severe_miles:.1f} on {r.label}" for r in other_routes
    ]
    high_diffs = [
        f"{r.summary.high_miles:.1f} on {r.label}" for r in other_routes
    ]

    has_severe_diff = any(
        abs(r.summary.severe_miles - recommended.summary.severe_miles) >= TOLERANCE_MILES
        for r in other_routes
    )
    if has_severe_diff:
        diff_str = " and ".join(severe_diffs)
        return (
            f"{recommended.label} recommended: {recommended.summary.severe_miles:.1f} severe miles "
            f"vs {diff_str}. {time_clause}"
        )

    has_high_diff = any(
        abs(r.summary.high_miles - recommended.summary.high_miles) >= TOLERANCE_MILES
        for r in other_routes
    )
    if has_high_diff:
        diff_str = " and ".join(high_diffs)
        return (
            f"{recommended.label} recommended: tied on severe miles, but "
            f"{recommended.summary.high_miles:.1f} high miles vs {diff_str}. {time_clause}"
        )

    has_avg_risk_diff = any(
        abs(r.summary.avg_risk - recommended.summary.avg_risk) >= TOLERANCE_AVG_RISK
        for r in other_routes
    )
    if has_avg_risk_diff:
        return (
            f"{recommended.label} recommended: lowest overall weather risk score "
            f"({recommended.summary.avg_risk:.3f}). {time_clause}"
        )

    return (
        f"{recommended.label} recommended: equal weather risk across routes; "
        f"{time_clause}"
    )


def rank_and_recommend_routes(routes: List[Route]) -> RecommendationOutcome:
    if not routes:
        return RecommendationOutcome(
            recommended_route_id="",
            ranking=[],
            all_routes_blocked=False,
            explanation="No routes available.",
        )

    sorted_routes = sorted(routes, key=compute_route_sort_key)
    all_blocked = all(r.summary.has_no_travel for r in sorted_routes)

    for route in sorted_routes:
        route.not_recommended = route.summary.has_no_travel

    recommended = sorted_routes[0]
    ranking = [
        {"route_id": r.id, "rank": idx + 1}
        for idx, r in enumerate(sorted_routes)
    ]

    explanation = generate_recommendation_explanation(
        routes=sorted_routes,
        recommended=recommended,
        all_blocked=all_blocked,
    )

    return RecommendationOutcome(
        recommended_route_id=recommended.id,
        ranking=ranking,
        all_routes_blocked=all_blocked,
        explanation=explanation,
    )
