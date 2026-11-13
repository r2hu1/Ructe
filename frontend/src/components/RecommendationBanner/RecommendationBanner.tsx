import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export const RecommendationBanner: React.FC = () => {
  const { analyzeResult } = useAppStore();

  if (!analyzeResult) {
    return null;
  }

  const { all_routes_blocked, explanation, recommended_route_id, routes } = analyzeResult;
  const recommendedRoute = routes.find((r) => r.id === recommended_route_id);

  return (
    <div className={`recommendation-banner ${all_routes_blocked ? "blocked" : ""}`}>
      <div className="banner-title-row">
        <div className="banner-title">
          {all_routes_blocked ? (
            <>
              <AlertTriangle size={18} color="#ef4444" />
              <span>All Routes Blocked</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} color="#22c55e" />
              <span>Recommended: {recommendedRoute?.label || recommended_route_id}</span>
            </>
          )}
        </div>
        {all_routes_blocked ? (
          <span className="badge badge-not-recommended">HAZARDOUS</span>
        ) : (
          <span className="badge badge-recommended">RECOMMENDED</span>
        )}
      </div>
      <p className="banner-explanation">{explanation}</p>
    </div>
  );
};
