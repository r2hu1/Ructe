from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Union
from routing_app.domain.models import (
    AnalyzeResult,
    Checkpoint,
    Coordinate,
    Location,
    Route,
)
from routing_app.domain.risk import classify_checkpoint_risk
from routing_app.services.checkpoints import place_checkpoints_along_route
from routing_app.services.eta import (
    compute_checkpoint_eta,
    ensure_utc_datetime,
    round_to_nearest_utc_hour,
)
from routing_app.services.geocoding import geocode_address
from routing_app.services.geometry import (
    compute_cumulative_distances,
    normalize_cumulative_distances,
)
from routing_app.services.heatmap import generate_corridor_heatmap
from routing_app.services.recommendation import rank_and_recommend_routes
from routing_app.services.risk_rollup import build_route_summary
from routing_app.services.routing_providers import (
    RoutingProvider,
    get_routing_provider,
)
from routing_app.services.weather import (
    deduplicate_coordinates,
    extract_weather_sample_for_eta,
    get_cached_or_fetch_weather,
)

logger = logging.getLogger("routing_app.pipeline")


def resolve_location(location_input: Union[str, Dict[str, Any]]) -> Location:
    if isinstance(location_input, str):
        return geocode_address(location_input)
    return Location(
        lat=float(location_input["lat"]),
        lng=float(location_input["lng"]),
        label=str(location_input.get("label", f"{location_input['lat']}, {location_input['lng']}")),
    )


def run_analyze_pipeline(
    origin_input: Union[str, Dict[str, Any]],
    destination_input: Union[str, Dict[str, Any]],
    departure_time: datetime,
    load_weight_lb: float,
    checkpoint_interval_miles: float,
    routing_provider: Union[RoutingProvider, None] = None,
) -> AnalyzeResult:
    utc_departure = ensure_utc_datetime(departure_time)
    origin_loc = resolve_location(origin_input)
    dest_loc = resolve_location(destination_input)

    provider = routing_provider or get_routing_provider()
    raw_routes = provider.get_routes(
        origin=Coordinate(lat=origin_loc.lat, lng=origin_loc.lng),
        destination=Coordinate(lat=dest_loc.lat, lng=dest_loc.lng),
    )

    intermediate_routes_data: List[Dict[str, Any]] = []
    all_checkpoint_coordinates: List[Coordinate] = []

    for raw_route in raw_routes:
        coords = raw_route.coordinates
        raw_cum = compute_cumulative_distances(coords)
        norm_cum = normalize_cumulative_distances(raw_cum, raw_route.distance_miles)

        placements = place_checkpoints_along_route(
            coordinates=coords,
            normalized_cumulative_distances=norm_cum,
            total_miles=raw_route.distance_miles,
            interval_miles=checkpoint_interval_miles,
        )

        for p in placements:
            all_checkpoint_coordinates.append(p.coordinate)

        intermediate_routes_data.append(
            {
                "raw_route": raw_route,
                "placements": placements,
                "coordinates": [[c.lat, c.lng] for c in coords],
            }
        )

    unique_pairs = deduplicate_coordinates(all_checkpoint_coordinates)
    weather_by_pair = get_cached_or_fetch_weather(unique_pairs, forecast_days=3)

    final_routes: List[Route] = []
    has_extrapolated_warning = False

    for item in intermediate_routes_data:
        raw_route = item["raw_route"]
        placements = item["placements"]
        coords_list = item["coordinates"]

        checkpoints: List[Checkpoint] = []
        for p in placements:
            cp_eta = compute_checkpoint_eta(
                departure_time=utc_departure,
                mile_marker=p.mile_marker,
                total_miles=raw_route.distance_miles,
                route_duration_seconds=raw_route.duration_seconds,
            )
            nearest_hour_dt = round_to_nearest_utc_hour(cp_eta)
            pair = (round(p.coordinate.lat, 2), round(p.coordinate.lng, 2))
            slots = weather_by_pair.get(pair, {})

            sample = extract_weather_sample_for_eta(slots, nearest_hour_dt)
            if sample.forecast_extrapolated:
                has_extrapolated_warning = True

            risk_res = classify_checkpoint_risk(
                wind_mph=sample.wind_speed_mph,
                rain_in_hr=sample.rain_in_hr,
                snow_in_hr=sample.snow_in_hr,
                load_weight_lb=load_weight_lb,
            )

            hour_index = max(0, int((nearest_hour_dt - utc_departure).total_seconds() // 3600))

            cp = Checkpoint(
                id=f"{raw_route.id}_cp_{p.index}",
                mile_marker=p.mile_marker,
                lat=p.coordinate.lat,
                lng=p.coordinate.lng,
                eta_utc=cp_eta.isoformat(),
                forecast_hour_index=hour_index,
                weather=sample,
                risk=risk_res,
                forecast_extrapolated=sample.forecast_extrapolated,
            )
            checkpoints.append(cp)

        arrival_time_dt = compute_checkpoint_eta(
            departure_time=utc_departure,
            mile_marker=raw_route.distance_miles,
            total_miles=raw_route.distance_miles,
            route_duration_seconds=raw_route.duration_seconds,
        )

        summary = build_route_summary(
            checkpoints=checkpoints,
            total_miles=raw_route.distance_miles,
            duration_seconds=raw_route.duration_seconds,
            arrival_time_utc=arrival_time_dt.isoformat(),
        )

        route_obj = Route(
            id=raw_route.id,
            label=raw_route.label,
            summary=summary,
            coordinates=coords_list,
            checkpoints=checkpoints,
        )
        final_routes.append(route_obj)

    recommendation = rank_and_recommend_routes(final_routes)
    heatmap_data = generate_corridor_heatmap(
        routes=final_routes,
        departure_time=utc_departure,
        load_weight_lb=load_weight_lb,
    )

    warnings: List[str] = []
    if has_extrapolated_warning:
        warnings.append(
            "Trip arrival extends beyond available forecast hours; weather for late checkpoints was extrapolated from the latest forecast slot."
        )

    return AnalyzeResult(
        routes=final_routes,
        recommended_route_id=recommendation.recommended_route_id,
        ranking=recommendation.ranking,
        all_routes_blocked=recommendation.all_routes_blocked,
        explanation=recommendation.explanation,
        heatmap=heatmap_data,
        warnings=warnings,
    )
