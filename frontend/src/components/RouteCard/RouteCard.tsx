import React from "react";
import { Route } from "../../api/types";
import { formatDistance, formatIsoDateTime } from "../../lib/format";
import { ROUTE_COLORS, RISK_THEMES, RiskLevel } from "../../lib/riskColors";

interface RouteCardProps {
  route: Route;
  isRecommended: boolean;
  isSingleRoute?: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isRecommended,
  isSingleRoute,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}) => {
  const { summary } = route;
  const swatchColor = ROUTE_COLORS[route.id]?.stroke || "#6366f1";
  const arrivalFormatted = formatIsoDateTime(summary.arrival_time);
  const totalM = Math.max(summary.total_miles, 0.001);

  const lowPct = (summary.miles_by_level.low / totalM) * 100;
  const modPct = (summary.miles_by_level.moderate / totalM) * 100;
  const highPct = (summary.miles_by_level.high / totalM) * 100;
  const sevPct = (summary.miles_by_level.severe / totalM) * 100;
  const noTrvPct = (summary.miles_by_level.no_travel / totalM) * 100;

  return (
    <div
      className={`p-3.5 rounded-[21px] border cursor-pointer transition-all ${
        isSelected
          ? "bg-[#292524]/90 border-indigo-500 shadow-[0_4px_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500"
          : isHovered
            ? "bg-[#292524]/60 border-white/20"
            : "bg-[#1c1917]/70 border-white/10 hover:bg-[#292524]/40"
      }`}
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: swatchColor }}
          />
          <h4 className="text-[14px] font-bold text-white">{route.label}</h4>
        </div>
        <div>
          {summary.has_no_travel ? (
            <span className="px-2 py-0.5 rounded-[21px] text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
              No Travel
            </span>
          ) : isRecommended && !isSingleRoute ? (
            <span className="px-2 py-0.5 rounded-[21px] text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Recommended
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-[21px] text-[10px] font-bold uppercase bg-white/5 text-stone-400 border border-white/10">
              Alternative
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-bold text-white tabular-nums">
            {summary.duration_hours_minutes}
          </span>
          <span className="text-[12px] text-stone-400 tabular-nums">
            {formatDistance(summary.total_miles)}
          </span>
        </div>
        <div className="text-[11px] text-stone-400 tabular-nums">
          Arrives {arrivalFormatted.local}
        </div>
      </div>

      {/* Stacked Risk Proportion Bar */}
      <div className="flex h-1.5 w-full rounded-[21px] overflow-hidden bg-stone-700/50 mb-2.5">
        {lowPct > 0 && (
          <div
            style={{ width: `${lowPct}%`, backgroundColor: RISK_THEMES[RiskLevel.LOW].color }}
            title={`Low: ${summary.miles_by_level.low.toFixed(1)} mi`}
          />
        )}
        {modPct > 0 && (
          <div
            style={{ width: `${modPct}%`, backgroundColor: RISK_THEMES[RiskLevel.MODERATE].color }}
            title={`Moderate: ${summary.miles_by_level.moderate.toFixed(1)} mi`}
          />
        )}
        {highPct > 0 && (
          <div
            style={{ width: `${highPct}%`, backgroundColor: RISK_THEMES[RiskLevel.HIGH].color }}
            title={`High: ${summary.miles_by_level.high.toFixed(1)} mi`}
          />
        )}
        {sevPct > 0 && (
          <div
            style={{ width: `${sevPct}%`, backgroundColor: RISK_THEMES[RiskLevel.SEVERE].color }}
            title={`Severe: ${summary.miles_by_level.severe.toFixed(1)} mi`}
          />
        )}
        {noTrvPct > 0 && (
          <div
            style={{ width: `${noTrvPct}%`, backgroundColor: RISK_THEMES[RiskLevel.NO_TRAVEL].color }}
            title={`No Travel: ${summary.miles_by_level.no_travel.toFixed(1)} mi`}
          />
        )}
      </div>

      {/* Risk Metrics Row */}
      <div className="flex items-center justify-between text-[11px] text-stone-400 tabular-nums pt-1 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: RISK_THEMES[RiskLevel.SEVERE].color }}
          />
          <span>{summary.severe_miles.toFixed(1)} mi severe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: RISK_THEMES[RiskLevel.HIGH].color }}
          />
          <span>{summary.high_miles.toFixed(1)} mi high</span>
        </div>
        <div className="text-[10px] font-semibold text-stone-500">
          Avg: {summary.avg_risk.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
