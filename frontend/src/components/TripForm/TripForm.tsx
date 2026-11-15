import React, { useState } from "react";
import { ArrowRight, Calendar, Loader2, MapPin, Navigation, Scale } from "lucide-react";
import { useGeocodeAutocomplete } from "../../hooks/useGeocodeAutocomplete";
import { useAppStore } from "../../store/useAppStore";
import { useAnalyze } from "../../hooks/useAnalyze";

export const TripForm: React.FC = () => {
  const {
    originInput,
    setOriginInput,
    setOriginCoords,
    destinationInput,
    setDestinationInput,
    setDestinationCoords,
    departureTime,
    setDepartureTime,
    loadWeightLb,
    setLoadWeightLb,
    checkpointInterval,
    setCheckpointInterval,
    isLoading,
    isUpdating,
  } = useAppStore();

  const { executeAnalysis } = useAnalyze();

  const [originActive, setOriginActive] = useState(false);
  const [destActive, setDestActive] = useState(false);

  const originAutocomp = useGeocodeAutocomplete(originInput);
  const destAutocomp = useGeocodeAutocomplete(destinationInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAnalysis();
  };

  const handleSelectOrigin = (suggestion: { label: string; lat: number; lng: number }) => {
    setOriginInput(suggestion.label);
    setOriginCoords({ lat: suggestion.lat, lng: suggestion.lng, label: suggestion.label });
    setOriginActive(false);
  };

  const handleSelectDest = (suggestion: { label: string; lat: number; lng: number }) => {
    setDestinationInput(suggestion.label);
    setDestinationCoords({ lat: suggestion.lat, lng: suggestion.lng, label: suggestion.label });
    setDestActive(false);
  };

  const isFormValid =
    originInput.trim().length > 1 &&
    destinationInput.trim().length > 1 &&
    departureTime.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Origin field */}
      <div className="relative">
        <label className="block text-[12px] font-semibold text-stone-200 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-indigo-400" />
            <span>Origin</span>
          </span>
          {originAutocomp.isLoading && (
            <Loader2 size={12} className="animate-spin text-indigo-400" />
          )}
        </label>
        <input
          type="text"
          value={originInput}
          onChange={(e) => {
            setOriginInput(e.target.value);
            setOriginCoords(null);
            setOriginActive(true);
          }}
          onFocus={() => setOriginActive(true)}
          placeholder="City, state, or address (e.g. Chicago, IL)"
          className="w-full px-3.5 py-2.5 rounded-[21px] bg-[#1c1917]/90 border border-white/10 text-[13px] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />

        {originActive && originAutocomp.suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#0c0a09]/95 backdrop-blur-2xl border border-white/15 rounded-[21px] shadow-2xl overflow-hidden py-1">
            {originAutocomp.suggestions.map((s, idx) => (
              <button
                key={`${s.label}-${idx}`}
                type="button"
                className="w-full text-left px-3.5 py-2 text-[12px] text-stone-200 hover:bg-indigo-500/15 hover:text-indigo-300 transition-colors truncate"
                onClick={() => handleSelectOrigin(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Destination field */}
      <div className="relative">
        <label className="block text-[12px] font-semibold text-stone-200 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Navigation size={13} className="text-indigo-400" />
            <span>Destination</span>
          </span>
          {destAutocomp.isLoading && (
            <Loader2 size={12} className="animate-spin text-indigo-400" />
          )}
        </label>
        <input
          type="text"
          value={destinationInput}
          onChange={(e) => {
            setDestinationInput(e.target.value);
            setDestinationCoords(null);
            setDestActive(true);
          }}
          onFocus={() => setDestActive(true)}
          placeholder="City, state, or address (e.g. Atlanta, GA)"
          className="w-full px-3.5 py-2.5 rounded-[21px] bg-[#1c1917]/90 border border-white/10 text-[13px] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />

        {destActive && destAutocomp.suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#0c0a09]/95 backdrop-blur-2xl border border-white/15 rounded-[21px] shadow-2xl overflow-hidden py-1">
            {destAutocomp.suggestions.map((s, idx) => (
              <button
                key={`${s.label}-${idx}`}
                type="button"
                className="w-full text-left px-3.5 py-2 text-[12px] text-stone-200 hover:bg-indigo-500/15 hover:text-indigo-300 transition-colors truncate"
                onClick={() => handleSelectDest(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Departure Time */}
      <div>
        <label className="block text-[12px] font-semibold text-stone-200 mb-1.5 flex items-center gap-1.5">
          <Calendar size={13} className="text-indigo-400" />
          <span>Departure Time</span>
        </label>
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-[21px] bg-[#1c1917]/90 border border-white/10 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
      </div>

      {/* Cargo Weight Slider */}
      <div className="p-3.5 rounded-[21px] bg-[#1c1917]/70 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold text-stone-200 flex items-center gap-1.5">
            <Scale size={13} className="text-indigo-400" />
            <span>Cargo Weight</span>
          </span>
          <span className="font-bold text-indigo-400 tabular-nums bg-white/5 border border-white/10 px-2 py-0.5 rounded-[21px] text-[11px]">
            {Number(loadWeightLb).toLocaleString()} lb
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={80000}
          step={1000}
          value={loadWeightLb}
          onChange={(e) => setLoadWeightLb(Number(e.target.value))}
          className="apple-range"
        />
        <div className="flex justify-between text-[10px] text-stone-400">
          <span>Empty (0 lb)</span>
          <span>Light (25k)</span>
          <span>Max (80k)</span>
        </div>
      </div>

      {/* Sampling Interval */}
      <div className="space-y-1.5">
        <label className="block text-[12px] font-semibold text-stone-200">
          Sampling Interval
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([10, 25, 50] as const).map((interval) => (
            <button
              key={interval}
              type="button"
              className={`py-2 text-[12px] font-semibold rounded-[21px] border transition-all ${
                checkpointInterval === interval
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_2px_12px_rgba(99,102,241,0.35)]"
                  : "bg-[#1c1917]/70 text-stone-300 border-white/10 hover:bg-[#292524]"
              }`}
              onClick={() => setCheckpointInterval(interval)}
            >
              {interval} mi
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button in Indigo */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading || isUpdating}
        className="w-full mt-2 py-3 px-4 rounded-[21px] font-bold text-[13px] text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(79,70,229,0.35)] flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Analyzing Weather Corridor...</span>
          </>
        ) : (
          <>
            <span>Analyze Routes</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
};
