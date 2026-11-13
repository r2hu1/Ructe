import React from "react";
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
    <div style={{ minWidth: "200px", fontSize: "0.8rem", color: "#f8fafc" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          borderBottom: "1px solid #334155",
          paddingBottom: "6px",
        }}
      >
        <strong>Mile {formatDistance(checkpoint.mile_marker)}</strong>
        <span
          className="chip"
          style={{
            backgroundColor: theme.bgColor,
            color: theme.textColor,
            border: `1px solid ${theme.borderColor}`,
          }}
        >
          {checkpoint.risk.label}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div>
          <span style={{ color: "#94a3b8" }}>ETA Local: </span>
          <span>{etaFormatted.local}</span>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>ETA UTC: </span>
          <span>{etaFormatted.utc}</span>
        </div>
        <div style={{ marginTop: "4px" }}>
          <span style={{ color: "#94a3b8" }}>Wind (sustained): </span>
          <strong>{formatSpeed(checkpoint.weather.wind_speed_mph)}</strong>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Rain: </span>
          <strong>{formatPrecipitation(checkpoint.weather.rain_in_hr)}</strong>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>Snow: </span>
          <strong>{formatPrecipitation(checkpoint.weather.snow_in_hr)}</strong>
        </div>

        <div style={{ marginTop: "6px", borderTop: "1px solid #334155", paddingTop: "4px" }}>
          <span style={{ color: "#94a3b8" }}>Dominant Factor: </span>
          <span style={{ textTransform: "capitalize" }}>
            {checkpoint.risk.drivers.dominant_factor}
          </span>
        </div>
        {checkpoint.risk.drivers.load_rule_applied && (
          <div style={{ color: "#fca5a5", fontSize: "0.75rem" }}>
            <span>Load rule applied: </span>
            <strong>{checkpoint.risk.drivers.load_rule_applied}</strong>
          </div>
        )}
      </div>
    </div>
  );
};
