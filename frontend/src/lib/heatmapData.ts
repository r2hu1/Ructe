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

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [pt.lng, pt.lat],
      },
      properties: {
        score,
        weight: score / 4.0,
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
