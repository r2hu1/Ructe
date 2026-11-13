import json
from pathlib import Path
import pytest

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def mapbox_directions_fixture():
    with open(FIXTURES_DIR / "mapbox_directions.json", "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def open_meteo_weather_fixture():
    with open(FIXTURES_DIR / "open_meteo_weather.json", "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def mapbox_geocoding_fixture():
    with open(FIXTURES_DIR / "mapbox_geocoding.json", "r", encoding="utf-8") as f:
        return json.load(f)
