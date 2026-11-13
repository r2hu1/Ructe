import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Pause, Play, Volume2, VolumeX } from "lucide-react";
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

  return (
    <div className="forecast-dock">
      <button
        type="button"
        className="play-btn"
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? "Pause Forecast Animation" : "Play 48h Forecast Animation"}
        aria-label={isPlaying ? "Pause Forecast Animation" : "Play 48h Forecast Animation"}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <div className="slider-group">
        <div className="slider-label-row">
          <span>
            Forecast Animation: <strong>+{forecastHour}h</strong> ({timeFormatted.local})
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {timeFormatted.utc}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={48}
          step={1}
          value={forecastHour}
          onChange={(e) => setForecastHour(Number(e.target.value))}
          className="slider-input"
          aria-label="48-hour Weather Forecast Slider"
        />
      </div>

      <button
        type="button"
        className={`heatmap-toggle-btn ${isSpeaking ? "active" : ""}`}
        onClick={toggleAudioBriefing}
        title={isSpeaking ? "Stop Voice Briefing" : "Listen to Weather Audio Briefing"}
        aria-label="Voice Weather Briefing"
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isSpeaking ? <VolumeX size={15} color="#ef4444" /> : <Volume2 size={15} />}
          <span>{isSpeaking ? "Stop Audio" : "Audio Brief"}</span>
        </span>
      </button>

      <button
        type="button"
        className={`heatmap-toggle-btn ${heatmapEnabled ? "active" : ""}`}
        onClick={() => setHeatmapEnabled(!heatmapEnabled)}
        aria-pressed={heatmapEnabled}
        title="Toggle Weather Risk Heatmap"
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {heatmapEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>Heatmap</span>
        </span>
      </button>
    </div>
  );
};
