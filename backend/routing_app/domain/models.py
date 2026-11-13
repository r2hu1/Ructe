from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional
from routing_app.constants import RiskLevel


@dataclass(frozen=True)
class Coordinate:
    lat: float
    lng: float

    def to_dict(self) -> Dict[str, float]:
        return {"lat": self.lat, "lng": self.lng}


@dataclass(frozen=True)
class Location:
    lat: float
    lng: float
    label: str

    def to_dict(self) -> Dict[str, Any]:
        return {"lat": self.lat, "lng": self.lng, "label": self.label}


@dataclass(frozen=True)
class WeatherSample:
    time_utc: str
    wind_speed_mph: float
    rain_in_hr: float
    snow_in_hr: float
    forecast_extrapolated: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class RiskDrivers:
    dominant_factor: str
    load_rule_applied: Optional[str] = None
    wind_risk: int = 0
    rain_risk: int = 0
    snow_risk: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class RiskResult:
    level: RiskLevel
    score: int
    label: str
    drivers: RiskDrivers

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": int(self.level),
            "score": self.score,
            "label": self.label,
            "drivers": self.drivers.to_dict(),
        }


@dataclass
class Checkpoint:
    id: str
    mile_marker: float
    lat: float
    lng: float
    eta_utc: str
    forecast_hour_index: int
    weather: WeatherSample
    risk: RiskResult
    attributed_miles: float = 0.0
    forecast_extrapolated: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "mile_marker": round(self.mile_marker, 2),
            "lat": round(self.lat, 6),
            "lng": round(self.lng, 6),
            "eta_utc": self.eta_utc,
            "forecast_hour_index": self.forecast_hour_index,
            "weather": self.weather.to_dict(),
            "risk": self.risk.to_dict(),
            "attributed_miles": round(self.attributed_miles, 2),
            "forecast_extrapolated": self.forecast_extrapolated,
        }


@dataclass
class RouteSummary:
    total_miles: float
    duration_seconds: float
    duration_hours_minutes: str
    miles_by_level: Dict[str, float]
    no_travel_miles: float
    severe_miles: float
    high_miles: float
    avg_risk: float
    max_risk: str
    checkpoint_count: int
    worst_checkpoint: Optional[Dict[str, Any]]
    arrival_time: str
    has_no_travel: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_miles": round(self.total_miles, 2),
            "duration_seconds": round(self.duration_seconds, 1),
            "duration_hours_minutes": self.duration_hours_minutes,
            "miles_by_level": {k: round(v, 2) for k, v in self.miles_by_level.items()},
            "no_travel_miles": round(self.no_travel_miles, 2),
            "severe_miles": round(self.severe_miles, 2),
            "high_miles": round(self.high_miles, 2),
            "avg_risk": round(self.avg_risk, 3),
            "max_risk": self.max_risk,
            "checkpoint_count": self.checkpoint_count,
            "worst_checkpoint": self.worst_checkpoint,
            "arrival_time": self.arrival_time,
            "has_no_travel": self.has_no_travel,
        }


@dataclass
class Route:
    id: str
    label: str
    summary: RouteSummary
    coordinates: List[List[float]]
    checkpoints: List[Checkpoint]
    not_recommended: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "summary": self.summary.to_dict(),
            "coordinates": self.coordinates,
            "checkpoints": [c.to_dict() for c in self.checkpoints],
            "not_recommended": self.not_recommended,
        }


@dataclass
class HeatmapData:
    start_time_utc: str
    hours: int
    points: List[Dict[str, float]]
    scores: List[List[int]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start_time_utc": self.start_time_utc,
            "hours": self.hours,
            "points": self.points,
            "scores": self.scores,
        }


@dataclass
class AnalyzeResult:
    routes: List[Route]
    recommended_route_id: str
    ranking: List[Dict[str, Any]]
    all_routes_blocked: bool
    explanation: str
    heatmap: HeatmapData
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "routes": [r.to_dict() for r in self.routes],
            "recommended_route_id": self.recommended_route_id,
            "ranking": self.ranking,
            "all_routes_blocked": self.all_routes_blocked,
            "explanation": self.explanation,
            "heatmap": self.heatmap.to_dict(),
            "warnings": self.warnings,
        }
