export interface LocationCoordinate {
  lat: number;
  lng: number;
  label?: string;
}

export type LocationInput = string | LocationCoordinate;

export interface WeatherSample {
  time_utc: string;
  wind_speed_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
  forecast_extrapolated: boolean;
}

export interface RiskDrivers {
  dominant_factor: string;
  load_rule_applied?: string | null;
  wind_risk: number;
  rain_risk: number;
  snow_risk: number;
}

export interface RiskResult {
  level: number;
  score: number;
  label: string;
  drivers: RiskDrivers;
}

export interface Checkpoint {
  id: string;
  mile_marker: number;
  lat: number;
  lng: number;
  eta_utc: string;
  forecast_hour_index: number;
  weather: WeatherSample;
  risk: RiskResult;
  attributed_miles: number;
  forecast_extrapolated: boolean;
}

export interface RouteSummary {
  total_miles: number;
  duration_seconds: number;
  duration_hours_minutes: string;
  miles_by_level: {
    low: number;
    moderate: number;
    high: number;
    severe: number;
    no_travel: number;
  };
  no_travel_miles: number;
  severe_miles: number;
  high_miles: number;
  avg_risk: number;
  max_risk: string;
  checkpoint_count: number;
  worst_checkpoint: {
    id: string;
    mile_marker: number;
    eta_utc: string;
    lat: number;
    lng: number;
    risk_level: string;
    score: number;
    drivers: RiskDrivers;
  } | null;
  arrival_time: string;
  has_no_travel: boolean;
}

export interface Route {
  id: string;
  label: string;
  summary: RouteSummary;
  coordinates: [number, number][];
  checkpoints: Checkpoint[];
  not_recommended?: boolean;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
}

export interface HeatmapData {
  start_time_utc: string;
  hours: number;
  points: HeatmapPoint[];
  scores: number[][];
}

export interface RankingItem {
  route_id: string;
  rank: number;
}

export interface AnalyzeResult {
  routes: Route[];
  recommended_route_id: string;
  ranking: RankingItem[];
  all_routes_blocked: boolean;
  explanation: string;
  heatmap: HeatmapData;
  warnings?: string[];
}

export interface AnalyzeRequest {
  origin: LocationInput;
  destination: LocationInput;
  departure_time: string;
  load_weight_lb: number;
  checkpoint_interval_miles: 10 | 25 | 50;
}

export interface AutocompleteSuggestion {
  label: string;
  lat: number;
  lng: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
