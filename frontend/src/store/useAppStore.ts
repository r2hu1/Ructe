import { create } from "zustand";
import { AnalyzeResult, Checkpoint, LocationCoordinate } from "../api/types";
import { ApiException } from "../api/client";

export function getDefaultDepartureDateTime(): string {
  const d = new Date(Date.now() + 3600 * 1000);
  const minutes = d.getMinutes();
  const remainder = minutes % 15;
  const addMinutes = remainder === 0 ? 0 : 15 - remainder;
  d.setMinutes(minutes + addMinutes);
  d.setSeconds(0);
  d.setMilliseconds(0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

interface AppState {
  analyzeResult: AnalyzeResult | null;
  selectedRouteId: string | null;
  hoveredRouteId: string | null;
  selectedCheckpoint: Checkpoint | null;
  heatmapEnabled: boolean;
  forecastHour: number;
  isPlaying: boolean;

  originInput: string;
  originCoords: LocationCoordinate | null;
  destinationInput: string;
  destinationCoords: LocationCoordinate | null;
  departureTime: string;
  loadWeightLb: number;
  checkpointInterval: 10 | 25 | 50;

  isLoading: boolean;
  isUpdating: boolean;
  error: ApiException | null;

  setAnalyzeResult: (result: AnalyzeResult) => void;
  setSelectedRouteId: (id: string | null) => void;
  setHoveredRouteId: (id: string | null) => void;
  setSelectedCheckpoint: (cp: Checkpoint | null) => void;
  setHeatmapEnabled: (enabled: boolean) => void;
  setForecastHour: (hour: number) => void;
  setIsPlaying: (playing: boolean) => void;

  setOriginInput: (input: string) => void;
  setOriginCoords: (coords: LocationCoordinate | null) => void;
  setDestinationInput: (input: string) => void;
  setDestinationCoords: (coords: LocationCoordinate | null) => void;
  setDepartureTime: (time: string) => void;
  setLoadWeightLb: (weight: number) => void;
  setCheckpointInterval: (interval: 10 | 25 | 50) => void;

  setIsLoading: (loading: boolean) => void;
  setIsUpdating: (updating: boolean) => void;
  setError: (err: ApiException | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  analyzeResult: null,
  selectedRouteId: null,
  hoveredRouteId: null,
  selectedCheckpoint: null,
  heatmapEnabled: true,
  forecastHour: 0,
  isPlaying: false,

  originInput: "Chicago, IL",
  originCoords: null,
  destinationInput: "Atlanta, GA",
  destinationCoords: null,
  departureTime: getDefaultDepartureDateTime(),
  loadWeightLb: 42000,
  checkpointInterval: 25,

  isLoading: false,
  isUpdating: false,
  error: null,

  setAnalyzeResult: (result) =>
    set({
      analyzeResult: result,
      selectedRouteId: result.recommended_route_id,
      selectedCheckpoint: null,
      error: null,
    }),
  setSelectedRouteId: (id) => set({ selectedRouteId: id, selectedCheckpoint: null }),
  setHoveredRouteId: (id) => set({ hoveredRouteId: id }),
  setSelectedCheckpoint: (cp) => set({ selectedCheckpoint: cp }),
  setHeatmapEnabled: (enabled) => set({ heatmapEnabled: enabled }),
  setForecastHour: (hour) => set({ forecastHour: hour }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setOriginInput: (input) => set({ originInput: input, originCoords: null }),
  setOriginCoords: (coords) => set({ originCoords: coords }),
  setDestinationInput: (input) => set({ destinationInput: input, destinationCoords: null }),
  setDestinationCoords: (coords) => set({ destinationCoords: coords }),
  setDepartureTime: (time) => set({ departureTime: time }),
  setLoadWeightLb: (weight) => set({ loadWeightLb: weight }),
  setCheckpointInterval: (interval) => set({ checkpointInterval: interval }),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsUpdating: (updating) => set({ isUpdating: updating }),
  setError: (err) => set({ error: err }),
}));
