import logging
from typing import Any, Dict, Optional
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from routing_app.serializers import AnalyzeRequestSerializer
from routing_app.services.analyze_pipeline import run_analyze_pipeline
from routing_app.services.geocoding import (
    GeocodingError,
    UpstreamServiceError,
    UpstreamTimeoutError,
    autocomplete_places,
)
from routing_app.services.routing_providers import (
    RoutingError,
    UpstreamRoutingError,
    UpstreamRoutingTimeoutError,
)
from routing_app.services.weather import (
    UpstreamWeatherError,
    UpstreamWeatherTimeoutError,
)

logger = logging.getLogger("routing_app.views")


def make_error_response(
    code: str,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
) -> Response:
    body: Dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return Response(body, status=status_code)


class HealthView(APIView):
    def get(self, request: Request) -> Response:
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class GeocodeAutocompleteView(APIView):
    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"suggestions": []}, status=status.HTTP_200_OK)

        try:
            suggestions = autocomplete_places(query)
            return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)
        except UpstreamTimeoutError as exc:
            return make_error_response(
                code=exc.code,
                message=exc.message,
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except UpstreamServiceError as exc:
            return make_error_response(
                code=exc.code,
                message=exc.message,
                status_code=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.exception("Unexpected autocomplete error: %s", exc)
            return make_error_response(
                code="AUTOCOMPLETE_FAILED",
                message="An unexpected error occurred during autocomplete",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AnalyzeView(APIView):
    def post(self, request: Request) -> Response:
        serializer = AnalyzeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return make_error_response(
                code="VALIDATION_ERROR",
                message="Invalid request parameters",
                status_code=status.HTTP_400_BAD_REQUEST,
                details=serializer.errors,
            )

        validated_data = serializer.validated_data
        try:
            result = run_analyze_pipeline(
                origin_input=validated_data["origin"],
                destination_input=validated_data["destination"],
                departure_time=validated_data["departure_time"],
                load_weight_lb=validated_data["load_weight_lb"],
                checkpoint_interval_miles=validated_data["checkpoint_interval_miles"],
            )
            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except (GeocodingError, RoutingError) as exc:
            return make_error_response(
                code=exc.code,
                message=exc.message,
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except (
            UpstreamServiceError,
            UpstreamRoutingError,
            UpstreamWeatherError,
        ) as exc:
            return make_error_response(
                code=exc.code,
                message=exc.message,
                status_code=status.HTTP_502_BAD_GATEWAY,
            )
        except (
            UpstreamTimeoutError,
            UpstreamRoutingTimeoutError,
            UpstreamWeatherTimeoutError,
        ) as exc:
            return make_error_response(
                code=exc.code,
                message=exc.message,
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as exc:
            logger.exception("Unhandled error in analyze pipeline: %s", exc)
            return make_error_response(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred while processing the analysis",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
