import pytest
from routing_app.constants import RiskLevel
from routing_app.domain.risk import (
    classify_checkpoint_risk,
    classify_rain,
    classify_snow,
    classify_wind,
)


@pytest.mark.parametrize(
    "wind_mph, expected_level",
    [
        (0.0, RiskLevel.LOW),
        (24.9, RiskLevel.LOW),
        (25.0, RiskLevel.MODERATE),
        (34.9, RiskLevel.MODERATE),
        (35.0, RiskLevel.HIGH),
        (44.9, RiskLevel.HIGH),
        (45.0, RiskLevel.SEVERE),
        (54.9, RiskLevel.SEVERE),
        (55.0, RiskLevel.NO_TRAVEL),
        (65.0, RiskLevel.NO_TRAVEL),
    ],
)
def test_wind_threshold_boundaries(wind_mph: float, expected_level: RiskLevel):
    assert classify_wind(wind_mph) == expected_level


@pytest.mark.parametrize(
    "rain_in_hr, expected_level",
    [
        (0.0, RiskLevel.LOW),
        (0.09, RiskLevel.LOW),
        (0.10, RiskLevel.MODERATE),
        (0.24, RiskLevel.MODERATE),
        (0.25, RiskLevel.HIGH),
        (0.49, RiskLevel.HIGH),
        (0.50, RiskLevel.SEVERE),
        (1.00, RiskLevel.SEVERE),
        (1.01, RiskLevel.NO_TRAVEL),
        (2.50, RiskLevel.NO_TRAVEL),
    ],
)
def test_rain_threshold_boundaries(rain_in_hr: float, expected_level: RiskLevel):
    assert classify_rain(rain_in_hr) == expected_level


@pytest.mark.parametrize(
    "snow_in_hr, expected_level",
    [
        (0.0, RiskLevel.LOW),
        (0.49, RiskLevel.LOW),
        (0.50, RiskLevel.MODERATE),
        (0.99, RiskLevel.MODERATE),
        (1.00, RiskLevel.HIGH),
        (1.99, RiskLevel.HIGH),
        (2.00, RiskLevel.SEVERE),
        (3.00, RiskLevel.SEVERE),
        (3.01, RiskLevel.NO_TRAVEL),
        (4.50, RiskLevel.NO_TRAVEL),
    ],
)
def test_snow_threshold_boundaries(snow_in_hr: float, expected_level: RiskLevel):
    assert classify_snow(snow_in_hr) == expected_level


def test_rain_exact_one_inch_is_severe():
    result = classify_checkpoint_risk(
        wind_mph=10.0,
        rain_in_hr=1.00,
        snow_in_hr=0.0,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.SEVERE
    assert result.score == 3
    assert result.label == "SEVERE"
    assert result.drivers.dominant_factor == "rain"


def test_rain_one_point_zero_one_is_no_travel():
    result = classify_checkpoint_risk(
        wind_mph=10.0,
        rain_in_hr=1.01,
        snow_in_hr=0.0,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.NO_TRAVEL
    assert result.score == 4
    assert result.label == "NO_TRAVEL"
    assert result.drivers.dominant_factor == "rain"


def test_snow_exact_three_inches_is_severe():
    result = classify_checkpoint_risk(
        wind_mph=10.0,
        rain_in_hr=0.0,
        snow_in_hr=3.00,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.SEVERE
    assert result.score == 3
    assert result.label == "SEVERE"
    assert result.drivers.dominant_factor == "snow"


def test_snow_three_point_zero_one_is_no_travel():
    result = classify_checkpoint_risk(
        wind_mph=10.0,
        rain_in_hr=0.0,
        snow_in_hr=3.01,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.NO_TRAVEL
    assert result.score == 4
    assert result.label == "NO_TRAVEL"
    assert result.drivers.dominant_factor == "snow"


def test_wind_fifty_four_point_nine_is_severe():
    result = classify_checkpoint_risk(
        wind_mph=54.9,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.SEVERE
    assert result.score == 3
    assert result.label == "SEVERE"
    assert result.drivers.dominant_factor == "wind"


def test_wind_fifty_five_is_no_travel():
    result = classify_checkpoint_risk(
        wind_mph=55.0,
        rain_in_hr=0.0,
        snow_in_hr=0.0,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.NO_TRAVEL
    assert result.score == 4
    assert result.label == "NO_TRAVEL"
    assert result.drivers.dominant_factor == "wind"


def test_all_conditions_low_has_none_dominant_factor():
    result = classify_checkpoint_risk(
        wind_mph=15.0,
        rain_in_hr=0.05,
        snow_in_hr=0.1,
        load_weight_lb=20000.0,
    )
    assert result.level == RiskLevel.LOW
    assert result.score == 0
    assert result.drivers.dominant_factor == "none"
    assert result.drivers.load_rule_applied is None
