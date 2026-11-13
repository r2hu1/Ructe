from datetime import datetime, timedelta, timezone
import json
import urllib.parse
from django.test import override_settings
import pytest
from rest_framework import status
from rest_framework.test import APIClient
import responses


@pytest.fixture
def api_client():
    return APIClient()


def test_health_endpoint(api_client):
    response = api_client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


@responses.activate
@override_settings(MAPBOX_ACCESS_TOKEN="test-token")
def test_geocode_autocomplete_endpoint(api_client, mapbox_geocoding_fixture):
    responses.add(
        responses.GET,
        "https://api.mapbox.com/geocoding/v5/mapbox.places/new%20york.json",
        json=mapbox_geocoding_fixture,
        status=200,
    )
    response = api_client.get("/api/geocode/autocomplete?q=new york")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 2
    assert data["suggestions"][0]["label"] == "New York, New York, United States"


def test_analyze_validation_errors(api_client):
    past_time = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
    response_past = api_client.post(
        "/api/analyze",
        data={
            "origin": {"lat": 40.71, "lng": -74.00, "label": "NYC"},
            "destination": {"lat": 34.05, "lng": -118.24, "label": "LA"},
            "departure_time": past_time,
            "load_weight_lb": 35000.0,
            "checkpoint_interval_miles": 25,
        },
        format="json",
    )
    assert response_past.status_code == status.HTTP_400_BAD_REQUEST
    assert response_past.json()["error"]["code"] == "VALIDATION_ERROR"

    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    response_weight = api_client.post(
        "/api/analyze",
        data={
            "origin": {"lat": 40.71, "lng": -74.00, "label": "NYC"},
            "destination": {"lat": 34.05, "lng": -118.24, "label": "LA"},
            "departure_time": future_time,
            "load_weight_lb": 95000.0,
            "checkpoint_interval_miles": 25,
        },
        format="json",
    )
    assert response_weight.status_code == status.HTTP_400_BAD_REQUEST
    assert response_weight.json()["error"]["code"] == "VALIDATION_ERROR"

    response_interval = api_client.post(
        "/api/analyze",
        data={
            "origin": {"lat": 40.71, "lng": -74.00, "label": "NYC"},
            "destination": {"lat": 34.05, "lng": -118.24, "label": "LA"},
            "departure_time": future_time,
            "load_weight_lb": 35000.0,
            "checkpoint_interval_miles": 15,
        },
        format="json",
    )
    assert response_interval.status_code == status.HTTP_400_BAD_REQUEST
    assert response_interval.json()["error"]["code"] == "VALIDATION_ERROR"


@responses.activate
@override_settings(MAPBOX_ACCESS_TOKEN="test-token", ROUTING_PROVIDER="mapbox")
def test_analyze_end_to_end_success(
    api_client,
    mapbox_directions_fixture,
    open_meteo_weather_fixture,
):
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    responses.add(
        responses.GET,
        "https://api.mapbox.com/directions/v5/mapbox/driving/-74.0,40.71;-118.24,34.05",
        json=mapbox_directions_fixture,
        status=200,
    )

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

    response = api_client.post(
        "/api/analyze",
        data={
            "origin": {"lat": 40.71, "lng": -74.0, "label": "New York"},
            "destination": {"lat": 34.05, "lng": -118.24, "label": "Los Angeles"},
            "departure_time": future_time,
            "load_weight_lb": 35000.0,
            "checkpoint_interval_miles": 25,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "routes" in data
    assert len(data["routes"]) == 2
    assert "recommended_route_id" in data
    assert "ranking" in data
    assert "explanation" in data
    assert "heatmap" in data
    assert data["heatmap"]["hours"] == 49


@responses.activate
@override_settings(MAPBOX_ACCESS_TOKEN="test-token", ROUTING_PROVIDER="mapbox")
def test_analyze_upstream_failure_mappings(api_client):
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    responses.add(
        responses.GET,
        "https://api.mapbox.com/directions/v5/mapbox/driving/-74.0,40.71;-118.24,34.05",
        status=500,
    )

    response_502 = api_client.post(
        "/api/analyze",
        data={
            "origin": {"lat": 40.71, "lng": -74.0, "label": "New York"},
            "destination": {"lat": 34.05, "lng": -118.24, "label": "Los Angeles"},
            "departure_time": future_time,
            "load_weight_lb": 35000.0,
            "checkpoint_interval_miles": 25,
        },
        format="json",
    )
    assert response_502.status_code == status.HTTP_502_BAD_GATEWAY
    assert response_502.json()["error"]["code"] == "UPSTREAM_ROUTING_FAILURE"
