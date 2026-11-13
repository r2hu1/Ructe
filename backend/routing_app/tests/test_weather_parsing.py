from datetime import datetime, timezone
import json
import math
import urllib.parse
import responses
from routing_app.domain.models import Coordinate
from routing_app.services.weather import (
    deduplicate_coordinates,
    extract_weather_sample_for_eta,
    get_cached_or_fetch_weather,
    parse_open_meteo_location_data,
)


def test_parse_open_meteo_rain_showers_and_snow(open_meteo_weather_fixture):
    parsed = parse_open_meteo_location_data(open_meteo_weather_fixture)
    assert "2026-11-13T01:00" in parsed

    slot_1 = parsed["2026-11-13T01:00"]
    assert math.isclose(slot_1["wind_speed_mph"], 38.5)
    assert math.isclose(slot_1["rain_in_hr"], 0.60)
    assert math.isclose(slot_1["snow_in_hr"], 0.2)

    slot_2 = parsed["2026-11-13T02:00"]
    assert math.isclose(slot_2["wind_speed_mph"], 56.1)
    assert math.isclose(slot_2["rain_in_hr"], 1.15)
    assert math.isclose(slot_2["snow_in_hr"], 3.2)


def test_deduplicate_coordinates():
    coords = [
        Coordinate(lat=40.7128, lng=-74.0060),
        Coordinate(lat=40.7140, lng=-74.0080),
        Coordinate(lat=34.0522, lng=-118.2437),
    ]
    unique = deduplicate_coordinates(coords)
    assert len(unique) == 2
    assert (40.71, -74.01) in unique
    assert (34.05, -118.24) in unique


def test_extract_weather_sample_nearest_hour(open_meteo_weather_fixture):
    parsed = parse_open_meteo_location_data(open_meteo_weather_fixture)
    target_dt = datetime(2026, 11, 13, 1, 14, 0, tzinfo=timezone.utc)
    sample = extract_weather_sample_for_eta(parsed, target_dt)

    assert sample.time_utc == "2026-11-13T01:00"
    assert math.isclose(sample.wind_speed_mph, 38.5)
    assert not sample.forecast_extrapolated


def test_extract_weather_sample_extrapolated(open_meteo_weather_fixture):
    parsed = parse_open_meteo_location_data(open_meteo_weather_fixture)
    target_dt = datetime(2026, 11, 13, 10, 0, 0, tzinfo=timezone.utc)
    sample = extract_weather_sample_for_eta(parsed, target_dt)

    assert sample.time_utc == "2026-11-13T02:00"
    assert sample.forecast_extrapolated


@responses.activate
def test_weather_chunking_over_50_locations(open_meteo_weather_fixture):
    total_locations = 75
    coords = [Coordinate(lat=30.0 + i * 0.1, lng=-90.0) for i in range(total_locations)]
    unique = deduplicate_coordinates(coords)
    assert len(unique) == 75

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

    results = get_cached_or_fetch_weather(unique, forecast_days=3, today_str="test-date-chunk")
    assert len(results) == 75
    assert len(responses.calls) == 2
