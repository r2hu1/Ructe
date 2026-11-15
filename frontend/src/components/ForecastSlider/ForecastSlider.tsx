import React, { useEffect, useRef, useState } from "react";
import { Layers, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { computeForecastTimeAtHour } from "../../lib/format";
import { useAppStore } from "../../store/useAppStore";

export const ForecastSlider: React.FC = () => {
  const {
    analyzeResult,
    forecastHour,
    setForecastHour,
    isPlaying,
    setIsPlaying,
    heatmapEnabled,
    setHeatmapEnabled,
    isLoading,
  } = useAppStore();

  const animationTimerRef = useRef<number | null>(null);
  const hourRef = useRef<number>(forecastHour);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      if (isPlaying) {
        setIsPlaying(false);
      }
    }
  }, [isLoading, isPlaying, setIsPlaying]);

  useEffect(() => {
    hourRef.current = forecastHour;
  }, [forecastHour]);

  useEffect(() => {
    if (isPlaying) {
      animationTimerRef.current = window.setInterval(() => {
        const next = hourRef.current >= 48 ? 0 : hourRef.current + 1;
        setForecastHour(next);
      }, 700);
    } else if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
      }
    };
  }, [isPlaying, setForecastHour]);

  const toggleAudioBriefing = () => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!analyzeResult) {
      return;
    }

    const { recommended_route_id, routes, explanation } = analyzeResult;
    const recommended = routes.find((r) => r.id === recommended_route_id) || routes[0];
    const textToSpeak = `Weather-Aware Routing Briefing. ${explanation}. Expected duration is ${recommended?.summary?.duration_hours_minutes}. Overall maximum risk level is ${recommended?.summary?.max_risk}.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (isLoading || !analyzeResult || !analyzeResult.heatmap) {
    return null;
  }

  const { start_time_utc } = analyzeResult.heatmap;
  const timeFormatted = computeForecastTimeAtHour(start_time_utc, forecastHour);
  const progressPercent = (forecastHour / 48) * 100;

  return (
    <div className="absolute bottom-6 right-6 z-20 flex items-center bg-[#0c0a09]/92 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_1px_3px_rgba(255,255,255,0.06)] p-1.5 pl-2 select-none text-white">
      {/* Primary Play/Pause in Indigo */}
      <button
        type="button"
        className="size-8 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-shrink-0"
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? "Pause timeline" : "Play timeline"}
        aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* Rewind */}
      <button
        type="button"
        className="size-7 ml-1 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none flex-shrink-0"
        onClick={() => {
          setIsPlaying(false);
          setForecastHour(0);
        }}
        title="Reset to departure (0h)"
        aria-label="Reset to departure time"
      >
        <RotateCcw size={12} />
      </button>

      {/* Scrubber track & timestamp */}
      <div className="flex flex-col justify-center px-3 w-44 sm:w-56">
        <div className="flex items-center justify-between text-[11px] leading-tight mb-1">
          <span className="font-semibold text-indigo-400 tabular-nums">
            +{forecastHour}h
          </span>
          <span className="text-stone-400 text-[10px] tabular-nums truncate max-w-[120px]">
            {timeFormatted.local}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={48}
          step={1}
          value={forecastHour}
          onChange={(e) => setForecastHour(Number(e.target.value))}
          className="apple-range"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%, rgba(255,255,255,0.15) 100%)`,
          }}
          aria-label="48-hour timeline slider"
        />
      </div>

      {/* Divider */}
      <div className="h-5 w-[1px] bg-white/15 mx-1 flex-shrink-0" />

      {/* Audio briefing */}
      <button
        type="button"
        className={`size-7 rounded-full flex items-center justify-center transition-all focus:outline-none flex-shrink-0 mr-1 ${
          isSpeaking
            ? "bg-red-500/20 text-red-400 ring-1 ring-red-400"
            : "text-stone-400 hover:text-white hover:bg-white/10"
        }`}
        onClick={toggleAudioBriefing}
        title={isSpeaking ? "Stop voice briefing" : "Audio voice briefing"}
        aria-label="Audio voice briefing"
      >
        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      {/* Heatmap toggle pill in Indigo */}
      <button
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all focus:outline-none ${
          heatmapEnabled
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white border border-white/10"
        }`}
        onClick={() => setHeatmapEnabled(!heatmapEnabled)}
        aria-pressed={heatmapEnabled}
        title="Toggle weather corridor heatmap"
      >
        <Layers size={12} />
        <span>Heatmap</span>
      </button>
    </div>
  );
};
