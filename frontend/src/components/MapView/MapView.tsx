import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Checkpoint } from "../../api/types";
import {
  computeRoutesBoundingBox,
  createCheckpointsGeoJSON,
  createRoutesGeoJSON,
} from "../../lib/geo";
import { getHeatmapGeoJSONForHour } from "../../lib/heatmapData";
import { useAppStore } from "../../store/useAppStore";
import { useAnimationFrameThrottle } from "../../hooks/useAnimationFrameThrottle";
import { ForecastSlider } from "../ForecastSlider/ForecastSlider";
import { Legend } from "../Legend/Legend";
import { CheckpointPopup } from "../CheckpointPopup/CheckpointPopup";

const DEFAULT_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ||
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    analyzeResult,
    selectedRouteId,
    hoveredRouteId,
    selectedCheckpoint,
    setSelectedCheckpoint,
    heatmapEnabled,
    forecastHour,
  } = useAppStore();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DEFAULT_STYLE_URL,
      center: [-98.5795, 39.8283],
      zoom: 3.8,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left");

    map.on("load", () => {
      map.addSource("heatmap-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "heatmap-source",
        layout: { visibility: "visible" },
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "rgba(34, 197, 94, 0.4)",
            0.4,
            "rgba(234, 179, 8, 0.6)",
            0.6,
            "rgba(249, 115, 22, 0.8)",
            0.8,
            "rgba(239, 68, 68, 0.9)",
            1.0,
            "rgba(127, 29, 29, 0.95)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 8, 28],
          "heatmap-opacity": 0.75,
        },
      });

      map.addSource("routes-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "routes-casing-layer",
        type: "line",
        source: "routes-source",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#090d16",
          "line-width": 7,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "routes-line-layer",
        type: "line",
        source: "routes-source",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4.5,
          "line-opacity": 0.9,
        },
      });

      map.addSource("checkpoints-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "checkpoints-layer",
        type: "circle",
        source: "checkpoints-source",
        paint: {
          "circle-radius": 6,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      map.on("click", "checkpoints-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = feat.properties as Record<string, any>;
        const geom = feat.geometry as GeoJSON.Point;

        const cpData: Checkpoint = {
          id: props.id,
          mile_marker: props.mile_marker,
          lat: props.lat,
          lng: props.lng,
          eta_utc: props.eta_utc,
          forecast_hour_index: 0,
          weather: {
            time_utc: props.eta_utc,
            wind_speed_mph: props.wind_speed_mph,
            rain_in_hr: props.rain_in_hr,
            snow_in_hr: props.snow_in_hr,
            forecast_extrapolated: false,
          },
          risk: {
            level: props.level,
            score: props.score,
            label: props.label,
            drivers: {
              dominant_factor: props.dominant_factor,
              load_rule_applied: props.load_rule_applied || null,
              wind_risk: 0,
              rain_risk: 0,
              snow_risk: 0,
            },
          },
          attributed_miles: 0,
          forecast_extrapolated: false,
        };

        setSelectedCheckpoint(cpData);

        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popupNode = document.createElement("div");
        popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: "300px" })
          .setLngLat(geom.coordinates as [number, number])
          .setDOMContent(popupNode)
          .addTo(map);

        import("react-dom/client").then(({ createRoot }) => {
          const root = createRoot(popupNode);
          root.render(
            <CheckpointPopup
              checkpoint={cpData}
              onClose={() => popupRef.current?.remove()}
            />
          );
        });
      });

      map.on("mouseenter", "checkpoints-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "checkpoints-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setSelectedCheckpoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer("heatmap-layer")) {
      map.setLayoutProperty(
        "heatmap-layer",
        "visibility",
        heatmapEnabled ? "visible" : "none"
      );
    }
  }, [heatmapEnabled, mapLoaded]);

  const updateHeatmapDataThrottled = useAnimationFrameThrottle(
    (hour: number) => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !analyzeResult) return;
      const source = map.getSource("heatmap-source") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        const geojson = getHeatmapGeoJSONForHour(analyzeResult.heatmap, hour);
        source.setData(geojson as any);
      }
    }
  );

  useEffect(() => {
    updateHeatmapDataThrottled(forecastHour);
  }, [forecastHour, analyzeResult, updateHeatmapDataThrottled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!analyzeResult || !analyzeResult.routes || analyzeResult.routes.length === 0) {
      const routesSource = map.getSource("routes-source") as maplibregl.GeoJSONSource | undefined;
      if (routesSource) routesSource.setData({ type: "FeatureCollection", features: [] });

      const cpSource = map.getSource("checkpoints-source") as maplibregl.GeoJSONSource | undefined;
      if (cpSource) cpSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const routesGeoJSON = createRoutesGeoJSON(analyzeResult.routes);
    const routesSource = map.getSource("routes-source") as maplibregl.GeoJSONSource | undefined;
    if (routesSource) {
      routesSource.setData(routesGeoJSON as any);
    }

    const targetRouteId = hoveredRouteId || selectedRouteId || analyzeResult.recommended_route_id;
    const activeRoute =
      analyzeResult.routes.find((r) => r.id === targetRouteId) || analyzeResult.routes[0];

    if (activeRoute) {
      const cpGeoJSON = createCheckpointsGeoJSON(activeRoute.checkpoints);
      const cpSource = map.getSource("checkpoints-source") as maplibregl.GeoJSONSource | undefined;
      if (cpSource) {
        cpSource.setData(cpGeoJSON as any);
      }
    }

    if (map.getLayer("routes-line-layer")) {
      map.setPaintProperty("routes-line-layer", "line-opacity", [
        "case",
        ["==", ["get", "id"], targetRouteId],
        1.0,
        0.3,
      ]);
      map.setPaintProperty("routes-line-layer", "line-width", [
        "case",
        ["==", ["get", "id"], targetRouteId],
        5.5,
        3.0,
      ]);
    }

    const bbox = computeRoutesBoundingBox(analyzeResult.routes);
    if (bbox) {
      map.fitBounds(bbox, {
        padding: { top: 60, bottom: 90, left: 60, right: 60 },
        duration: 1200,
        maxZoom: 12,
      });
    }
  }, [analyzeResult, selectedRouteId, hoveredRouteId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedCheckpoint) return;

    map.flyTo({
      center: [selectedCheckpoint.lng, selectedCheckpoint.lat],
      zoom: Math.max(map.getZoom(), 8),
      duration: 800,
    });
  }, [selectedCheckpoint, mapLoaded]);

  return (
    <div className="map-container" ref={mapContainerRef}>
      <Legend />
      <ForecastSlider />
    </div>
  );
};
