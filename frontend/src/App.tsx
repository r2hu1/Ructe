import React, { Suspense, lazy } from "react";
import { Truck } from "lucide-react";
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
  const { isLoading, error, analyzeResult } = useAppStore();
  const { executeAnalysis } = useAnalyze();

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

        <div className="sidebar-pinned-form">
          <TripForm />
        </div>

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