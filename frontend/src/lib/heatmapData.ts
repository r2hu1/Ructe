import { HeatmapData } from "../api/types";
import { GeoJSONFeatureCollection, GeoJSONPointFeature } from "./geo";

const featureCache = new Map<string, GeoJSONFeatureCollection<GeoJSONPointFeature>>();

export function getHeatmapGeoJSONForHour(
  heatmapData: HeatmapData | null,
  hourIndex: number
): GeoJSONFeatureCollection<GeoJSONPointFeature> {
  if (!heatmapData || !heatmapData.points || heatmapData.points.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const cacheKey = `${heatmapData.start_time_utc}_${hourIndex}`;
  const cached = featureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const features: GeoJSONPointFeature[] = [];
  const points = heatmapData.points;
  const scores = heatmapData.scores;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const ptScores = scores[i];
    const score = ptScores && hourIndex < ptScores.length ? ptScores[hourIndex] : 0;

    // Weight 0.15 for low risk (score 0), scaling up to 1.0 for severe/no-travel (score 4)
    // Ensures points along the trip corridor provide a subtle green baseline when low,
    // and intensify to yellow/amber/red when weather risk is elevated.
    const weight = 0.15 + (Math.min(score, 4) / 4.0) * 0.85;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [pt.lng, pt.lat],
      },
      properties: {
        score,
        weight,
      },
    });
  }

  const collection: GeoJSONFeatureCollection<GeoJSONPointFeature> = {
    type: "FeatureCollection",
    features,
  };

  featureCache.set(cacheKey, collection);
  return collection;
}

export function clearHeatmapCache(): void {
  featureCache.clear();
}
