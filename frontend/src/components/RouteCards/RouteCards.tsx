import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { RouteCard } from "../RouteCard/RouteCard";
import { formatDistance, formatIsoDateTime, formatPrecipitation, formatSpeed } from "../../lib/format";
import { getRiskTheme } from "../../lib/riskColors";

export const RouteCards: React.FC = () => {
  const {
    analyzeResult,
    selectedRouteId,
    hoveredRouteId,
    setSelectedRouteId,
    setHoveredRouteId,
    setSelectedCheckpoint,
  } = useAppStore();

  const [tableExpanded, setTableExpanded] = useState<boolean>(false);

  if (!analyzeResult || !analyzeResult.routes || analyzeResult.routes.length === 0) {
    return null;
  }

  const selectedRoute =
    analyzeResult.routes.find((r) => r.id === selectedRouteId) || analyzeResult.routes[0];

  return (
    <div className="route-cards-list">
      {analyzeResult.routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          isRecommended={route.id === analyzeResult.recommended_route_id}
          isSingleRoute={analyzeResult.routes.length === 1}
          isSelected={route.id === selectedRouteId}
          isHovered={route.id === hoveredRouteId}
          onSelect={() => setSelectedRouteId(route.id)}
          onHover={(hovered) => setHoveredRouteId(hovered ? route.id : null)}
        />
      ))}

      {selectedRoute && (
        <div className="checkpoint-table-wrapper">
          <button
            type="button"
            className="table-toggle-btn"
            onClick={() => setTableExpanded(!tableExpanded)}
          >
            <span>
              {selectedRoute.label} Checkpoint Details ({selectedRoute.checkpoints.length})
            </span>
            {tableExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {tableExpanded && (
            <div style={{ maxHeight: "260px", overflowY: "auto" }}>
              <table className="checkpoint-table">
                <thead>
                  <tr>
                    <th>Mile</th>
                    <th>ETA</th>
                    <th>Wind</th>
                    <th>Rain</th>
                    <th>Snow</th>
                    <th>Risk</th>
                    <th>Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRoute.checkpoints.map((cp) => {
                    const theme = getRiskTheme(cp.risk.level);
                    const etaFormatted = formatIsoDateTime(cp.eta_utc);

                    return (
                      <tr
                        key={cp.id}
                        onClick={() => setSelectedCheckpoint(cp)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{formatDistance(cp.mile_marker)}</td>
                        <td title={`${etaFormatted.utc}`}>{etaFormatted.local}</td>
                        <td>{formatSpeed(cp.weather.wind_speed_mph)}</td>
                        <td>{formatPrecipitation(cp.weather.rain_in_hr)}</td>
                        <td>{formatPrecipitation(cp.weather.snow_in_hr)}</td>
                        <td>
                          <span
                            className="chip"
                            style={{
                              backgroundColor: theme.bgColor,
                              color: theme.textColor,
                              border: `1px solid ${theme.borderColor}`,
                            }}
                          >
                            {cp.risk.label}
                          </span>
                        </td>
                        <td>
                          {cp.risk.drivers.load_rule_applied
                            ? "Load Esc."
                            : cp.risk.drivers.dominant_factor}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
