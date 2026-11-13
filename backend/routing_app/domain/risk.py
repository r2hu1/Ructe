from typing import Optional, Tuple
from routing_app.constants import (
    LOAD_THRESHOLD_HEAVY_LB,
    LOAD_THRESHOLD_MAX_LB,
    RAIN_CUTOFF_HIGH,
    RAIN_CUTOFF_LOW,
    RAIN_CUTOFF_MODERATE,
    RAIN_CUTOFF_SEVERE,
    RISK_LEVEL_NAMES,
    SNOW_CUTOFF_HIGH,
    SNOW_CUTOFF_LOW,
    SNOW_CUTOFF_MODERATE,
    SNOW_CUTOFF_SEVERE,
    WIND_CUTOFF_HIGH,
    WIND_CUTOFF_LOW,
    WIND_CUTOFF_MODERATE,
    WIND_CUTOFF_SEVERE,
    RiskLevel,
)
from routing_app.domain.models import RiskDrivers, RiskResult


def classify_wind(wind_mph: float) -> RiskLevel:
    if wind_mph < WIND_CUTOFF_LOW:
        return RiskLevel.LOW
    if wind_mph < WIND_CUTOFF_MODERATE:
        return RiskLevel.MODERATE
    if wind_mph < WIND_CUTOFF_HIGH:
        return RiskLevel.HIGH
    if wind_mph < WIND_CUTOFF_SEVERE:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_rain(rain_in_hr: float) -> RiskLevel:
    if rain_in_hr < RAIN_CUTOFF_LOW:
        return RiskLevel.LOW
    if rain_in_hr < RAIN_CUTOFF_MODERATE:
        return RiskLevel.MODERATE
    if rain_in_hr < RAIN_CUTOFF_HIGH:
        return RiskLevel.HIGH
    if rain_in_hr <= RAIN_CUTOFF_SEVERE:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_snow(snow_in_hr: float) -> RiskLevel:
    if snow_in_hr < SNOW_CUTOFF_LOW:
        return RiskLevel.LOW
    if snow_in_hr < SNOW_CUTOFF_MODERATE:
        return RiskLevel.MODERATE
    if snow_in_hr < SNOW_CUTOFF_HIGH:
        return RiskLevel.HIGH
    if snow_in_hr <= SNOW_CUTOFF_SEVERE:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def evaluate_load_escalation(
    wind_mph: float,
    load_weight_lb: float,
    base_risk: RiskLevel,
) -> Tuple[RiskLevel, Optional[str]]:
    if wind_mph >= WIND_CUTOFF_SEVERE:
        return RiskLevel.NO_TRAVEL, None

    if (
        WIND_CUTOFF_HIGH <= wind_mph < WIND_CUTOFF_SEVERE
        and load_weight_lb > LOAD_THRESHOLD_HEAVY_LB
    ):
        if RiskLevel.NO_TRAVEL > base_risk:
            return RiskLevel.NO_TRAVEL, "wind_45_54_over_30000"
        return base_risk, None

    if (
        WIND_CUTOFF_MODERATE <= wind_mph < WIND_CUTOFF_HIGH
        and load_weight_lb > LOAD_THRESHOLD_MAX_LB
    ):
        if RiskLevel.SEVERE > base_risk:
            return RiskLevel.SEVERE, "wind_35_44_over_40000"
        return base_risk, None

    return base_risk, None


def determine_dominant_factor(
    final_risk: RiskLevel,
    wind_risk: RiskLevel,
    rain_risk: RiskLevel,
    snow_risk: RiskLevel,
    load_rule_applied: Optional[str],
) -> str:
    if load_rule_applied is not None:
        return "wind"
    if final_risk == RiskLevel.LOW:
        return "none"
    if wind_risk == final_risk:
        return "wind"
    if rain_risk == final_risk:
        return "rain"
    if snow_risk == final_risk:
        return "snow"
    return "none"


def classify_checkpoint_risk(
    wind_mph: float,
    rain_in_hr: float,
    snow_in_hr: float,
    load_weight_lb: float,
) -> RiskResult:
    wind_risk = classify_wind(wind_mph)
    rain_risk = classify_rain(rain_in_hr)
    snow_risk = classify_snow(snow_in_hr)

    base_risk = max(wind_risk, rain_risk, snow_risk)
    final_risk, load_rule_applied = evaluate_load_escalation(
        wind_mph=wind_mph,
        load_weight_lb=load_weight_lb,
        base_risk=base_risk,
    )

    dominant_factor = determine_dominant_factor(
        final_risk=final_risk,
        wind_risk=wind_risk,
        rain_risk=rain_risk,
        snow_risk=snow_risk,
        load_rule_applied=load_rule_applied,
    )

    drivers = RiskDrivers(
        dominant_factor=dominant_factor,
        load_rule_applied=load_rule_applied,
        wind_risk=int(wind_risk),
        rain_risk=int(rain_risk),
        snow_risk=int(snow_risk),
    )

    return RiskResult(
        level=final_risk,
        score=int(final_risk),
        label=RISK_LEVEL_NAMES[final_risk],
        drivers=drivers,
    )
