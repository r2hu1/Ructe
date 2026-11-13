import React from "react";
import { X } from "lucide-react";
import { Checkpoint } from "../../api/types";
import {
  formatDistance,
  formatIsoDateTime,
  formatPrecipitation,
  formatSpeed,
} from "../../lib/format";
import { getRiskTheme } from "../../lib/riskColors";

interface CheckpointPopupProps {
  checkpoint: Checkpoint;
  onClose: () => void;
}

export const CheckpointPopup: React.FC<CheckpointPopupProps> = ({
  checkpoint,
  onClose,
}) => {
  const theme = getRiskTheme(checkpoint.risk.level);
  const etaFormatted = formatIsoDateTime(checkpoint.eta_utc);

  return (
    <div
      style={{
        minWidth: "220px",
        fontSize: "0.82rem",
        color: "#ffffff",
        backgroundColor: "#1e293b",
        padding: "2px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
          borderBottom: "1px solid #334155",
          paddingBottom: "8px",
        }}
      >
        <strong style={{ fontSize: "0.9rem", color: "#ffffff" }}>
          Mile {formatDistance(checkpoint.mile_marker)}
        </strong>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="chip"
            style={{
              backgroundColor: theme.bgColor,
              color: theme.textColor,
              border: `1px solid ${theme.borderColor}`,
              fontWeight: 700,
            }}
          >
            {checkpoint.risk.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <div>
          <span style={{ color: "#cbd5e1" }}>ETA Local: </span>
          <strong style={{ color: "#ffffff" }}>{etaFormatted.local}</strong>
        </div>
        <div>
          <span style={{ color: "#cbd5e1" }}>ETA UTC: </span>
          <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{etaFormatted.utc}</span>
        </div>
        <div style={{ marginTop: "4px" }}>
          <span style={{ color: "#cbd5e1" }}>Wind (sustained): </span>
          <strong style={{ color: "#ffffff" }}>{formatSpeed(checkpoint.weather.wind_speed_mph)}</strong>
        </div>
        <div>
          <span style={{ color: "#cbd5e1" }}>Rain: </span>
          <strong style={{ color: "#ffffff" }}>{formatPrecipitation(checkpoint.weather.rain_in_hr)}</strong>
        </div>
        <div>
          <span style={{ color: "#cbd5e1" }}>Snow: </span>
          <strong style={{ color: "#ffffff" }}>{formatPrecipitation(checkpoint.weather.snow_in_hr)}</strong>
        </div>

        <div style={{ marginTop: "6px", borderTop: "1px solid #334155", paddingTop: "6px" }}>
          <span style={{ color: "#cbd5e1" }}>Dominant Factor: </span>
          <strong style={{ color: "#ffffff", textTransform: "capitalize" }}>
            {checkpoint.risk.drivers.dominant_factor}
          </strong>
        </div>
        {checkpoint.risk.drivers.load_rule_applied && (
          <div style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "2px" }}>
            <span>Load rule applied: </span>
            <strong style={{ color: "#fca5a5" }}>{checkpoint.risk.drivers.load_rule_applied}</strong>
          </div>
        )}
      </div>
    </div>
  );
};
