import React from "react";
import { Truck } from "lucide-react";
import { useAppStore } from "./store/useAppStore";
import { TripForm } from "./components/TripForm/TripForm";
import { RecommendationBanner } from "./components/RecommendationBanner/RecommendationBanner";
import { RouteCards } from "./components/RouteCards/RouteCards";
import { SkeletonLoader } from "./components/SkeletonLoader/SkeletonLoader";
import { ErrorState } from "./components/ErrorState/ErrorState";
import { MapView } from "./components/MapView/MapView";
import { useAnalyze } from "./hooks/useAnalyze";

export const App: React.FC = () => {
  const { isLoading, error, analyzeResult } = useAppStore();
  const { executeAnalysis } = useAnalyze();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1 className="sidebar-title">
            <Truck size={22} color="#3b82f6" />
            <span>Weather-Aware Routing</span>
          </h1>
          <p className="sidebar-subtitle">
            Dynamic corridor risk analysis & load escalation engine
          </p>
        </header>

        <div className="sidebar-content">
          <TripForm />

          {error && <ErrorState error={error} onRetry={executeAnalysis} />}

          {isLoading && !analyzeResult && <SkeletonLoader />}

          {analyzeResult && (
            <>
              <RecommendationBanner />
              <RouteCards />
            </>
          )}
        </div>
      </aside>

      <main className="map-container">
        <MapView />
      </main>
    </div>
  );
};

export default App;
