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
    <div className="space-y-3">
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
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 text-[12px] font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
            onClick={() => setTableExpanded(!tableExpanded)}
          >
            <span>
              {selectedRoute.label} Checkpoints ({selectedRoute.checkpoints.length})
            </span>
            {tableExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {tableExpanded && (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-[21px] border border-white/10 bg-slate-900/90 shadow-inner">
              <table className="w-full text-left text-[11px] text-slate-200">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold sticky top-0 border-b border-white/10">
                  <tr>
                    <th className="py-1.5 px-2.5">Mile</th>
                    <th className="py-1.5 px-2.5">ETA</th>
                    <th className="py-1.5 px-2.5">Risk</th>
                    <th className="py-1.5 px-2.5">Wind</th>
                    <th className="py-1.5 px-2.5">Precip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedRoute.checkpoints.map((cp) => {
                    const theme = getRiskTheme(cp.risk.level);
                    const etaFormatted = formatIsoDateTime(cp.eta_utc);
                    return (
                      <tr
                        key={cp.id}
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => setSelectedCheckpoint(cp)}
                      >
                        <td className="py-1.5 px-2.5 font-medium tabular-nums">
                          {formatDistance(cp.mile_marker)}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-400 tabular-nums">
                          {etaFormatted.local.split(" ")[0]}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider"
                            style={{ backgroundColor: theme.color }}
                          >
                            {theme.name}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 tabular-nums text-slate-300">
                          {formatSpeed(cp.weather.wind_speed_mph)}
                        </td>
                        <td className="py-1.5 px-2.5 tabular-nums text-slate-300">
                          {formatPrecipitation(cp.weather.rain_in_hr + cp.weather.snow_in_hr)}
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
