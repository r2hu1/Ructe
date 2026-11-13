from typing import Any, Dict, List, Optional
from routing_app.constants import RISK_LEVEL_NAMES, RiskLevel
from routing_app.domain.models import Checkpoint, RouteSummary


def calculate_segment_attributed_miles(
    mile_markers: List[float],
    total_miles: float,
) -> List[float]:
    n = len(mile_markers)
    if n == 0:
        return []
    if n == 1:
        return [round(total_miles, 4)]
    if n == 2:
        gap = mile_markers[1] - mile_markers[0]
        half_gap = round(gap / 2.0, 4)
        return [half_gap, round(total_miles - half_gap, 4)]

    attributed: List[float] = []
    attributed.append(round((mile_markers[1] - mile_markers[0]) / 2.0, 4))

    for i in range(1, n - 1):
        prev_gap = mile_markers[i] - mile_markers[i - 1]
        next_gap = mile_markers[i + 1] - mile_markers[i]
        seg_miles = (prev_gap + next_gap) / 2.0
        attributed.append(round(seg_miles, 4))

    last_half = round((mile_markers[n - 1] - mile_markers[n - 2]) / 2.0, 4)
    attributed.append(last_half)

    curr_sum = sum(attributed)
    diff = total_miles - curr_sum
    attributed[-1] = round(attributed[-1] + diff, 4)

    return attributed


def format_duration_display(duration_seconds: float) -> str:
    total_seconds = max(0, int(round(duration_seconds)))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def build_route_summary(
    checkpoints: List[Checkpoint],
    total_miles: float,
    duration_seconds: float,
    arrival_time_utc: str,
) -> RouteSummary:
    if not checkpoints:
        return RouteSummary(
            total_miles=total_miles,
            duration_seconds=duration_seconds,
            duration_hours_minutes=format_duration_display(duration_seconds),
            miles_by_level={
                "low": 0.0,
                "moderate": 0.0,
                "high": 0.0,
                "severe": 0.0,
                "no_travel": 0.0,
            },
            no_travel_miles=0.0,
            severe_miles=0.0,
            high_miles=0.0,
            avg_risk=0.0,
            max_risk=RISK_LEVEL_NAMES[RiskLevel.LOW],
            checkpoint_count=0,
            worst_checkpoint=None,
            arrival_time=arrival_time_utc,
            has_no_travel=False,
        )

    mile_markers = [cp.mile_marker for cp in checkpoints]
    attributed_miles = calculate_segment_attributed_miles(mile_markers, total_miles)

    miles_by_level: Dict[str, float] = {
        "low": 0.0,
        "moderate": 0.0,
        "high": 0.0,
        "severe": 0.0,
        "no_travel": 0.0,
    }

    weighted_risk_sum = 0.0
    highest_risk_level = RiskLevel.LOW
    worst_cp_candidate: Optional[Checkpoint] = None

    for cp, miles in zip(checkpoints, attributed_miles):
        cp.attributed_miles = miles
        score = cp.risk.score
        weighted_risk_sum += miles * score

        if cp.risk.level == RiskLevel.LOW:
            miles_by_level["low"] += miles
        elif cp.risk.level == RiskLevel.MODERATE:
            miles_by_level["moderate"] += miles
        elif cp.risk.level == RiskLevel.HIGH:
            miles_by_level["high"] += miles
        elif cp.risk.level == RiskLevel.SEVERE:
            miles_by_level["severe"] += miles
        elif cp.risk.level == RiskLevel.NO_TRAVEL:
            miles_by_level["no_travel"] += miles

        if cp.risk.level >= highest_risk_level:
            if worst_cp_candidate is None or cp.risk.level > highest_risk_level:
                highest_risk_level = cp.risk.level
                worst_cp_candidate = cp
            elif cp.risk.level == highest_risk_level:
                candidate_max_metric = max(
                    worst_cp_candidate.weather.wind_speed_mph,
                    worst_cp_candidate.weather.rain_in_hr * 50.0,
                    worst_cp_candidate.weather.snow_in_hr * 20.0,
                )
                current_max_metric = max(
                    cp.weather.wind_speed_mph,
                    cp.weather.rain_in_hr * 50.0,
                    cp.weather.snow_in_hr * 20.0,
                )
                if current_max_metric > candidate_max_metric:
                    worst_cp_candidate = cp

    avg_risk = weighted_risk_sum / total_miles if total_miles > 0.0 else 0.0
    no_travel_miles = miles_by_level["no_travel"]
    severe_miles = miles_by_level["severe"]
    high_miles = miles_by_level["high"]
    has_no_travel = (no_travel_miles > 0.001) or (highest_risk_level == RiskLevel.NO_TRAVEL)

    worst_cp_dict: Optional[Dict[str, Any]] = None
    if worst_cp_candidate is not None:
        worst_cp_dict = {
            "id": worst_cp_candidate.id,
            "mile_marker": worst_cp_candidate.mile_marker,
            "eta_utc": worst_cp_candidate.eta_utc,
            "lat": worst_cp_candidate.lat,
            "lng": worst_cp_candidate.lng,
            "risk_level": worst_cp_candidate.risk.label,
            "score": worst_cp_candidate.risk.score,
            "drivers": worst_cp_candidate.risk.drivers.to_dict(),
        }

    return RouteSummary(
        total_miles=round(total_miles, 2),
        duration_seconds=round(duration_seconds, 1),
        duration_hours_minutes=format_duration_display(duration_seconds),
        miles_by_level=miles_by_level,
        no_travel_miles=round(no_travel_miles, 2),
        severe_miles=round(severe_miles, 2),
        high_miles=round(high_miles, 2),
        avg_risk=round(avg_risk, 3),
        max_risk=RISK_LEVEL_NAMES[highest_risk_level],
        checkpoint_count=len(checkpoints),
        worst_checkpoint=worst_cp_dict,
        arrival_time=arrival_time_utc,
        has_no_travel=has_no_travel,
    )
