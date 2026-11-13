import React, { Suspense, lazy, useEffect, useState } from "react";
import { ChevronUp, Plus, Truck } from "lucide-react";
import { useAppStore } from "./store/useAppStore";
import { TripForm } from "./components/TripForm/TripForm";
import { RecommendationBanner } from "./components/RecommendationBanner/RecommendationBanner";
import { RouteCards } from "./components/RouteCards/RouteCards";
import { SkeletonLoader } from "./components/SkeletonLoader/SkeletonLoader";
import { ErrorState } from "./components/ErrorState/ErrorState";
import { useAnalyze } from "./hooks/useAnalyze";

const MapView = lazy(() =>
  import("./components/MapView/MapView").then((module) => ({
    default: module.MapView,
  }))
);

export const App: React.FC = () => {
  const {
    isLoading,
    error,
    analyzeResult,
    originInput,
    destinationInput,
    loadWeightLb,
    checkpointInterval,
  } = useAppStore();
  const { executeAnalysis } = useAnalyze();
  const [showInputs, setShowInputs] = useState<boolean>(true);

  useEffect(() => {
    if (analyzeResult) {
      setShowInputs(false);
    } else {
      setShowInputs(true);
    }
  }, [analyzeResult]);

  return (
    <div className="app-container">
      <main className="map-container">
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
              }}
            >
              Loading interactive map...
            </div>
          }
        >
          <MapView />
        </Suspense>
      </main>

      <aside className="sidebar">
        <header className="sidebar-header">
          <h1 className="sidebar-title">
            <Truck size={20} color="#38bdf8" />
            <span>Weather-Aware Routing</span>
          </h1>
          <p className="sidebar-subtitle">
            Dynamic corridor risk analysis & load escalation engine
          </p>
        </header>

        {showInputs ? (
          <div className="sidebar-pinned-form">
            {analyzeResult && (
              <div className="form-toggle-row">
                <span className="form-toggle-label">Trip Configuration</span>
                <button
                  type="button"
                  className="form-hide-btn"
                  onClick={() => setShowInputs(false)}
                  title="Hide inputs"
                >
                  <ChevronUp size={15} />
                  <span>Hide</span>
                </button>
              </div>
            )}
            <TripForm />
          </div>
        ) : (
          <div className="new-analysis-bar">
            <div className="trip-summary-chip">
              <span className="chip-locations">
                {originInput || "Origin"} → {destinationInput || "Destination"}
              </span>
              <span className="chip-meta">
                {Number(loadWeightLb).toLocaleString()} lb • {checkpointInterval} mi intervals
              </span>
            </div>
            <button
              type="button"
              className="new-analysis-btn"
              onClick={() => setShowInputs(true)}
              title="Configure and run a new route analysis"
            >
              <Plus size={15} />
              <span>New Analysis</span>
            </button>
          </div>
        )}

        <div className="sidebar-content">
          {!isLoading && error && <ErrorState error={error} onRetry={executeAnalysis} />}

          {isLoading && <SkeletonLoader />}

          {!isLoading && analyzeResult && (
            <>
              <RecommendationBanner />
              <RouteCards />
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default App;