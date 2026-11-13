import React from "react";
import { Route } from "../../api/types";
import { formatDistance, formatDuration, formatIsoDateTime } from "../../lib/format";
import { ROUTE_COLORS, getRiskTheme, RISK_THEMES, RiskLevel } from "../../lib/riskColors";

interface RouteCardProps {
  route: Route;
  isRecommended: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isRecommended,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}) => {
  const { summary } = route;
  const swatchColor = ROUTE_COLORS[route.id]?.stroke || "#3b82f6";
  const arrivalFormatted = formatIsoDateTime(summary.arrival_time);
  const totalM = Math.max(summary.total_miles, 0.001);

  const lowPct = (summary.miles_by_level.low / totalM) * 100;
  const modPct = (summary.miles_by_level.moderate / totalM) * 100;
  const highPct = (summary.miles_by_level.high / totalM) * 100;
  const sevPct = (summary.miles_by_level.severe / totalM) * 100;
  const noTrvPct = (summary.miles_by_level.no_travel / totalM) * 100;

  return (
    <div
      className={`route-card ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
        }
      }}
    >
      <div className="route-card-header">
        <div className="route-name-group">
          <div
            className="route-color-swatch"
            style={{ backgroundColor: swatchColor }}
          />
          <span className="route-card-title">{route.label}</span>
        </div>
        {route.not_recommended ? (
          <span className="badge badge-not-recommended">NOT RECOMMENDED</span>
        ) : isRecommended ? (
          <span className="badge badge-recommended">RECOMMENDED</span>
        ) : null}
      </div>

      <div className="route-stats-row">
        <div className="duration-miles">
          <span className="stat-duration">{formatDuration(summary.duration_seconds)}</span>
          <span className="stat-miles">{formatDistance(summary.total_miles)}</span>
        </div>
        <span className="stat-arrival">Arrive: {arrivalFormatted.local}</span>
      </div>

      <div className="risk-bar" title="Miles distribution by risk level">
        {lowPct > 0 && (
          <div
            className="risk-bar-segment"
            style={{ width: `${lowPct}%`, backgroundColor: RISK_THEMES[RiskLevel.LOW].color }}
          />
        )}
        {modPct > 0 && (
          <div
            className="risk-bar-segment"
            style={{ width: `${modPct}%`, backgroundColor: RISK_THEMES[RiskLevel.MODERATE].color }}
          />
        )}
        {highPct > 0 && (
          <div
            className="risk-bar-segment"
            style={{ width: `${highPct}%`, backgroundColor: RISK_THEMES[RiskLevel.HIGH].color }}
          />
        )}
        {sevPct > 0 && (
          <div
            className="risk-bar-segment"
            style={{ width: `${sevPct}%`, backgroundColor: RISK_THEMES[RiskLevel.SEVERE].color }}
          />
        )}
        {noTrvPct > 0 && (
          <div
            className="risk-bar-segment"
            style={{ width: `${noTrvPct}%`, backgroundColor: RISK_THEMES[RiskLevel.NO_TRAVEL].color }}
          />
        )}
      </div>

      <div className="route-risk-counts">
        <div className="risk-count-item">
          <div
            className="risk-dot"
            style={{ backgroundColor: RISK_THEMES[RiskLevel.NO_TRAVEL].color }}
          />
          <span>{summary.no_travel_miles.toFixed(1)} mi No Travel</span>
        </div>
        <div className="risk-count-item">
          <div
            className="risk-dot"
            style={{ backgroundColor: RISK_THEMES[RiskLevel.SEVERE].color }}
          />
          <span>{summary.severe_miles.toFixed(1)} mi Severe</span>
        </div>
        <div className="risk-count-item">
          <div
            className="risk-dot"
            style={{ backgroundColor: RISK_THEMES[RiskLevel.HIGH].color }}
          />
          <span>{summary.high_miles.toFixed(1)} mi High</span>
        </div>
        <div className="risk-count-item">
          <span>Avg: {summary.avg_risk.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
