from datetime import datetime, timedelta, timezone
import pytest
from routing_app.services.eta import (
    clamp_forecast_hour,
    compute_checkpoint_eta,
    ensure_utc_datetime,
    round_to_nearest_utc_hour,
)


def test_linear_eta_computation():
    departure = datetime(2026, 11, 13, 10, 0, 0, tzinfo=timezone.utc)
    total_miles = 100.0
    duration_seconds = 3600.0

    eta_start = compute_checkpoint_eta(departure, 0.0, total_miles, duration_seconds)
    assert eta_start == departure

    eta_mid = compute_checkpoint_eta(departure, 50.0, total_miles, duration_seconds)
    assert eta_mid == departure + timedelta(minutes=30)

    eta_end = compute_checkpoint_eta(departure, 100.0, total_miles, duration_seconds)
    assert eta_end == departure + timedelta(hours=1)


def test_timezone_conversion_and_naive_rejection():
    tz_minus_5 = timezone(timedelta(hours=-5))
    dt_local = datetime(2026, 11, 13, 10, 0, 0, tzinfo=tz_minus_5)
    dt_utc = ensure_utc_datetime(dt_local)

    assert dt_utc.tzinfo == timezone.utc
    assert dt_utc.hour == 15

    naive_dt = datetime(2026, 11, 13, 10, 0, 0)
    with pytest.raises(ValueError):
        ensure_utc_datetime(naive_dt)


@pytest.mark.parametrize(
    "minute, second, expected_hour",
    [
        (0, 0, 10),
        (29, 59, 10),
        (30, 0, 11),
        (45, 0, 11),
        (59, 59, 11),
    ],
)
def test_forecast_hour_rounding_boundaries(minute: int, second: int, expected_hour: int):
    base_dt = datetime(2026, 11, 13, 10, minute, second, tzinfo=timezone.utc)
    rounded = round_to_nearest_utc_hour(base_dt)
    assert rounded.hour == expected_hour
    assert rounded.minute == 0
    assert rounded.second == 0


def test_forecast_horizon_clamp():
    start = datetime(2026, 11, 13, 0, 0, 0, tzinfo=timezone.utc)
    max_hours = 49

    target_within = datetime(2026, 11, 13, 12, 15, 0, tzinfo=timezone.utc)
    clamped_dt, hour_idx, extrapolated = clamp_forecast_hour(target_within, start, max_hours)
    assert hour_idx == 12
    assert not extrapolated
    assert clamped_dt.hour == 12

    target_beyond = datetime(2026, 11, 16, 10, 0, 0, tzinfo=timezone.utc)
    clamped_dt, hour_idx, extrapolated = clamp_forecast_hour(target_beyond, start, max_hours)
    assert hour_idx == 48
    assert extrapolated
    assert clamped_dt == start + timedelta(hours=48)
