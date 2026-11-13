from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Union
from rest_framework import serializers
from routing_app.constants import (
    ALLOWED_CHECKPOINT_INTERVALS,
    DEFAULT_CHECKPOINT_INTERVAL_MILES,
    MAX_LOAD_WEIGHT_LB,
    MIN_LOAD_WEIGHT_LB,
)


class LocationField(serializers.Field):
    def to_internal_value(self, data: Any) -> Union[str, Dict[str, Any]]:
        if isinstance(data, str):
            clean = data.strip()
            if not clean:
                raise serializers.ValidationError("Location address string cannot be empty.")
            return clean

        if isinstance(data, dict):
            lat = data.get("lat")
            lng = data.get("lng")
            if lat is None or lng is None:
                raise serializers.ValidationError(
                    "Location object must include 'lat' and 'lng' properties."
                )
            try:
                lat_f = float(lat)
                lng_f = float(lng)
            except (TypeError, ValueError):
                raise serializers.ValidationError("Coordinates must be numeric.")

            if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
                raise serializers.ValidationError("Coordinates outside geographic range.")

            label = str(data.get("label", f"{lat_f:.4f}, {lng_f:.4f}"))
            return {"lat": lat_f, "lng": lng_f, "label": label}

        raise serializers.ValidationError(
            "Location must be an address string or a {lat, lng, label} object."
        )

    def to_representation(self, value: Any) -> Any:
        return value


class AnalyzeRequestSerializer(serializers.Serializer):
    origin = LocationField(required=True)
    destination = LocationField(required=True)
    departure_time = serializers.DateTimeField(required=True)
    load_weight_lb = serializers.FloatField(
        required=True,
        min_value=MIN_LOAD_WEIGHT_LB,
        max_value=MAX_LOAD_WEIGHT_LB,
    )
    checkpoint_interval_miles = serializers.ChoiceField(
        choices=ALLOWED_CHECKPOINT_INTERVALS,
        default=DEFAULT_CHECKPOINT_INTERVAL_MILES,
        required=False,
    )

    def validate_departure_time(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise serializers.ValidationError(
                "departure_time must be timezone-aware (e.g. UTC or ISO 8601 with offset)."
            )

        utc_val = value.astimezone(timezone.utc)
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1, minutes=2)
        if utc_val < one_hour_ago:
            raise serializers.ValidationError(
                "departure_time cannot be earlier than 1 hour in the past."
            )

        return value
