import pytest
from routing_app.constants import RiskLevel
from routing_app.domain.risk import classify_checkpoint_risk


def test_wind_45_to_55_at_load_boundary():
    without_escalation = classify_checkpoint_risk(
        wind_mph=50.0,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=30000.0,
    )
    assert without_escalation.level == RiskLevel.SEVERE
    assert without_escalation.drivers.load_rule_applied is None

    with_escalation = classify_checkpoint_risk(
        wind_mph=50.0,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=30001.0,
    )
    assert with_escalation.level == RiskLevel.NO_TRAVEL
    assert with_escalation.drivers.load_rule_applied == "wind_45_54_over_30000"
    assert with_escalation.drivers.dominant_factor == "wind"


def test_wind_35_to_45_at_load_boundary():
    without_escalation = classify_checkpoint_risk(
        wind_mph=40.0,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=40000.0,
    )
    assert without_escalation.level == RiskLevel.HIGH
    assert without_escalation.drivers.load_rule_applied is None

    with_escalation = classify_checkpoint_risk(
        wind_mph=40.0,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=40001.0,
    )
    assert with_escalation.level == RiskLevel.SEVERE
    assert with_escalation.drivers.load_rule_applied == "wind_35_44_over_40000"
    assert with_escalation.drivers.dominant_factor == "wind"


def test_wind_above_fifty_five_no_travel_for_zero_load():
    result = classify_checkpoint_risk(
        wind_mph=56.0,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=0.0,
    )
    assert result.level == RiskLevel.NO_TRAVEL
    assert result.score == 4
    assert result.drivers.dominant_factor == "wind"


def test_load_rule_never_lowers_base_risk():
    rain_severe = classify_checkpoint_risk(
        wind_mph=38.0,
        rain_in_hr=0.75,
        snow_in_hr=0.0,
        load_weight_lb=20000.0,
    )
    assert rain_severe.level == RiskLevel.SEVERE
    assert rain_severe.drivers.dominant_factor == "rain"

    rain_no_travel_with_wind_high_load = classify_checkpoint_risk(
        wind_mph=40.0,
        rain_in_hr=1.20,
        snow_in_hr=0.0,
        load_weight_lb=45000.0,
    )
    assert rain_no_travel_with_wind_high_load.level == RiskLevel.NO_TRAVEL
    assert rain_no_travel_with_wind_high_load.drivers.dominant_factor == "rain"


@pytest.mark.parametrize(
    "wind, rain, snow, load, expected_level, expected_factor",
    [
        (38.0, 0.15, 0.1, 20000.0, RiskLevel.HIGH, "wind"),
        (15.0, 0.85, 0.7, 20000.0, RiskLevel.SEVERE, "rain"),
        (20.0, 0.05, 3.2, 20000.0, RiskLevel.NO_TRAVEL, "snow"),
        (46.0, 0.80, 0.2, 35000.0, RiskLevel.NO_TRAVEL, "wind"),
    ],
)
def test_combinations_resolve_to_maximum(
    wind: float,
    rain: float,
    snow: float,
    load: float,
    expected_level: RiskLevel,
    expected_factor: str,
):
    result = classify_checkpoint_risk(
        wind_mph=wind,
        rain_in_hr=rain,
        snow_in_hr=snow,
        load_weight_lb=load,
    )
    assert result.level == expected_level
    assert result.drivers.dominant_factor == expected_factor
