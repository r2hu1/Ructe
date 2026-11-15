import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { formatDuration } from "../../lib/format";

export const RecommendationBanner: React.FC = () => {
  const { analyzeResult } = useAppStore();

  if (!analyzeResult) {
    return null;
  }

  const { all_routes_blocked, explanation, recommended_route_id, routes } = analyzeResult;
  const isSingleRoute = routes.length === 1;
  const recommendedRoute = routes.find((r) => r.id === recommended_route_id) || routes[0];

  let displayTitle = "";
  if (all_routes_blocked) {
    displayTitle = isSingleRoute ? "Route Blocked" : "All Routes Blocked";
  } else if (isSingleRoute) {
    displayTitle = `1 Route Available: ${recommendedRoute?.label || recommended_route_id}`;
  } else {
    displayTitle = `Recommended: ${recommendedRoute?.label || recommended_route_id}`;
  }

  let displayText = explanation;
  if (isSingleRoute && !all_routes_blocked) {
    const lower = explanation.toLowerCase();
    if (
      lower.includes("recommended") ||
      lower.includes("equal weather risk") ||
      lower.includes("across routes")
    ) {
      const durationStr = recommendedRoute
        ? formatDuration(recommendedRoute.summary.duration_seconds)
        : "";
      const severeMiles = recommendedRoute?.summary.severe_miles ?? 0;
      const noTravelMiles = recommendedRoute?.summary.no_travel_miles ?? 0;
      if (noTravelMiles > 0) {
        displayText = `Route contains ${noTravelMiles.toFixed(1)} no-travel miles. Travel not advised.`;
      } else if (severeMiles > 0) {
        displayText = `Single route available with ${severeMiles.toFixed(1)} severe miles (${durationStr}).`;
      } else {
        displayText = `Single route available with minimal weather risk (${durationStr}).`;
      }
    }
  }

  return (
    <div
      className={`p-3.5 rounded-[21px] border transition-all ${
        all_routes_blocked
          ? "bg-red-950/40 border-red-500/40 text-red-200"
          : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 font-bold text-[13px] tracking-tight">
          {all_routes_blocked ? (
            <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          )}
          <span>{displayTitle}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-[21px] text-[10px] font-bold uppercase tracking-wider ${
            all_routes_blocked
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : isSingleRoute
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {all_routes_blocked
            ? "HAZARDOUS"
            : isSingleRoute
              ? "AVAILABLE"
              : "RECOMMENDED"}
        </span>
      </div>
      <p className="text-[12px] leading-relaxed opacity-90">{displayText}</p>
    </div>
  );
};
