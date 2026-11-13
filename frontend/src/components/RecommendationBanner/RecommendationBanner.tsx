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
    displayTitle = `Only 1 Route Available: ${recommendedRoute?.label || recommended_route_id}`;
  } else {
    displayTitle = `Recommended: ${recommendedRoute?.label || recommended_route_id}`;
  }

  let displayBadge = "";
  let badgeClass = "";
  if (all_routes_blocked) {
    displayBadge = "HAZARDOUS";
    badgeClass = "badge badge-not-recommended";
  } else if (isSingleRoute) {
    displayBadge = "AVAILABLE ROUTE";
    badgeClass = "badge badge-available";
  } else {
    displayBadge = "RECOMMENDED";
    badgeClass = "badge badge-recommended";
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
      displayText = `${recommendedRoute?.label || "Route A"} is the only available route (${durationStr}${severeMiles > 0 ? `, ${severeMiles.toFixed(1)} severe miles` : ""}). Evaluated weather risk across corridor.`;
    }
  }

  return (
    <div className={`recommendation-banner ${all_routes_blocked ? "blocked" : isSingleRoute ? "single" : ""}`}>
      <div className="banner-title-row">
        <div className="banner-title">
          {all_routes_blocked ? (
            <AlertTriangle size={18} color="#ef4444" />
          ) : (
            <CheckCircle2 size={18} color="#22c55e" />
          )}
          <span>{displayTitle}</span>
        </div>
        <span className={badgeClass}>{displayBadge}</span>
      </div>
      <p className="banner-explanation">{displayText}</p>
    </div>
  );
};