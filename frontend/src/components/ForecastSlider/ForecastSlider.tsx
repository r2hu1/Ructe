import React, { useEffect, useRef } from "react";
import { Eye, EyeOff, Pause, Play } from "lucide-react";
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
  } = useAppStore();

  const animationTimerRef = useRef<number | null>(null);
  const hourRef = useRef<number>(forecastHour);

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

  if (!analyzeResult || !analyzeResult.heatmap) {
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
        title={isPlaying ? "Pause Forecast" : "Play Forecast"}
        aria-label={isPlaying ? "Pause Forecast" : "Play Forecast"}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <div className="slider-group">
        <div className="slider-label-row">
          <span>
            Forecast: <strong>+{forecastHour}h</strong> ({timeFormatted.local})
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
