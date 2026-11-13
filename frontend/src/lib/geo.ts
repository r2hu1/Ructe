import { Checkpoint, Route } from "../api/types";
import { ROUTE_COLORS, getRiskColor } from "./riskColors";

export interface GeoJSONPointFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

export interface GeoJSONLineFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection<T> {
  type: "FeatureCollection";
  features: T[];
}

export function createRoutesGeoJSON(
  routes: Route[]
): GeoJSONFeatureCollection<GeoJSONLineFeature> {
  const features: GeoJSONLineFeature[] = routes.map((r) => {
    const coords: [number, number][] = r.coordinates.map((c) => [c[1], c[0]]);
    const color = ROUTE_COLORS[r.id]?.stroke || "#2563eb";
    const outline = ROUTE_COLORS[r.id]?.outline || "#1e3a8a";

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
      properties: {
        id: r.id,
        label: r.label,
        color,
        outline,
        not_recommended: r.not_recommended,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

export function createCheckpointsGeoJSON(
  checkpoints: Checkpoint[]
): GeoJSONFeatureCollection<GeoJSONPointFeature> {
  const features: GeoJSONPointFeature[] = checkpoints.map((cp) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [cp.lng, cp.lat],
    },
    properties: {
      id: cp.id,
      mile_marker: cp.mile_marker,
      lat: cp.lat,
      lng: cp.lng,
      eta_utc: cp.eta_utc,
      score: cp.risk.score,
      level: cp.risk.level,
      label: cp.risk.label,
      color: getRiskColor(cp.risk.level),
      wind_speed_mph: cp.weather.wind_speed_mph,
      rain_in_hr: cp.weather.rain_in_hr,
      snow_in_hr: cp.weather.snow_in_hr,
      dominant_factor: cp.risk.drivers.dominant_factor,
      load_rule_applied: cp.risk.drivers.load_rule_applied || "",
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

export function createEndpointMarkersGeoJSON(
  origin: { lat: number; lng: number; label: string },
  destination: { lat: number; lng: number; label: string }
): GeoJSONFeatureCollection<GeoJSONPointFeature> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [origin.lng, origin.lat],
        },
        properties: {
          type: "origin",
          label: origin.label,
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [destination.lng, destination.lat],
        },
        properties: {
          type: "destination",
          label: destination.label,
        },
      },
    ],
  };
}

export function computeRoutesBoundingBox(
  routes: Route[]
): [[number, number], [number, number]] | null {
  if (!routes || routes.length === 0) {
    return null;
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const route of routes) {
    for (const coord of route.coordinates) {
      const lat = coord[0];
      const lng = coord[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  if (minLng === Infinity || minLat === Infinity) {
    return null;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
