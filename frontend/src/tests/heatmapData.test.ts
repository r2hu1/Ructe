import { describe, expect, it } from "vitest";
import { HeatmapData } from "../api/types";
import { clearHeatmapCache, getHeatmapGeoJSONForHour } from "../lib/heatmapData";

describe("heatmapData builder", () => {
  it("builds GeoJSON features for given hour", () => {
    clearHeatmapCache();
    const mockData: HeatmapData = {
      start_time_utc: "2026-11-13T10:00:00Z",
      hours: 49,
      points: [
        { lat: 40.0, lng: -74.0 },
        { lat: 41.0, lng: -74.5 },
      ],
      scores: [
        [0, 1, 2, 3],
        [4, 3, 2, 1],
      ],
    };

    const hour0 = getHeatmapGeoJSONForHour(mockData, 0);
    expect(hour0.features.length).toBe(2);
    expect(hour0.features[0].properties.score).toBe(0);
    expect(hour0.features[1].properties.score).toBe(4);

    const hour1 = getHeatmapGeoJSONForHour(mockData, 1);
    expect(hour1.features[0].properties.score).toBe(1);
    expect(hour1.features[1].properties.score).toBe(3);
  });
});
