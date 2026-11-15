import React, { Suspense, lazy, useEffect, useState } from "react";
import { ChevronUp, SlidersHorizontal, Truck } from "lucide-react";
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
    <div className="relative w-screen h-dvh overflow-hidden bg-[#0c0a09] font-sans text-white">
      {/* Light Basemap Canvas */}
      <main className="absolute inset-0 z-0 w-full h-full">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[#0c0a09] text-stone-400 font-medium text-[16px]">
              Loading interactive map...
            </div>
          }
        >
          <MapView />
        </Suspense>
      </main>

      {/* Floating Apple Stone Black Sidebar */}
      <aside className="absolute top-4 left-4 bottom-4 z-20 w-[420px] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] flex flex-col rounded-[21px] bg-[#0c0a09]/88 backdrop-blur-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden">
        {/* Header bar */}
        <header className="px-5 py-4 border-b border-white/10 bg-[#1c1917]/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-[21px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Truck size={17} />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-white tracking-tight leading-tight">
                Weather-Aware Routing
              </h1>
              <p className="text-[12px] font-normal text-stone-400 leading-none mt-0.5">
                Dynamic corridor risk analysis & load rules
              </p>
            </div>
          </div>
        </header>

        {showInputs ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {analyzeResult && (
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <span className="text-[13px] font-semibold text-white">
                  Trip Configuration
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[13px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => setShowInputs(false)}
                  title="Hide inputs"
                >
                  <ChevronUp size={16} />
                  <span>Hide</span>
                </button>
              </div>
            )}
            <TripForm />
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-white/10 bg-[#1c1917]/90 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white truncate">
                {originInput || "Origin"} → {destinationInput || "Destination"}
              </div>
              <div className="text-[11px] font-normal text-stone-400 tabular-nums mt-0.5">
                {Number(loadWeightLb).toLocaleString()} lb • {checkpointInterval} mi intervals
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[21px] text-[12px] font-semibold text-indigo-400 bg-white/5 border border-white/15 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setShowInputs(true)}
              title="Edit parameters"
            >
              <SlidersHorizontal size={13} />
              <span>Edit</span>
            </button>
          </div>
        )}

        {/* Scrollable Results Section */}
        {(error || isLoading || analyzeResult) && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && <ErrorState error={error} onRetry={executeAnalysis} />}

            {isLoading && <SkeletonLoader />}

            {!isLoading && analyzeResult && (
              <div className="space-y-4">
                <RecommendationBanner />
                <RouteCards />
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default App;
