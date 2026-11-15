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
}) => {
  const theme = getRiskTheme(checkpoint.risk.level);
  const etaFormatted = formatIsoDateTime(checkpoint.eta_utc);
  const totalPrecip = (checkpoint.weather.rain_in_hr || 0) + (checkpoint.weather.snow_in_hr || 0);

  return (
    <div className="min-w-[220px] font-sans text-[12px] text-white">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <strong className="text-[14px] font-bold text-white">
          Mile {formatDistance(checkpoint.mile_marker)}
        </strong>
        <span
          className="px-2 py-0.5 rounded-[21px] text-[10px] font-bold text-white uppercase tracking-wider"
          style={{ backgroundColor: theme.color }}
        >
          {theme.name}
        </span>
      </div>

      <div className="space-y-1.5 text-stone-200">
        <div className="flex justify-between">
          <span className="text-stone-400">ETA (Local):</span>
          <span className="font-semibold tabular-nums text-white">{etaFormatted.local}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Wind Speed:</span>
          <span className="font-semibold tabular-nums text-white">
            {formatSpeed(checkpoint.weather.wind_speed_mph)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Precipitation:</span>
          <span className="font-semibold tabular-nums text-white">
            {formatPrecipitation(totalPrecip)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Dominant Risk:</span>
          <span className="font-semibold capitalize text-indigo-400">
            {checkpoint.risk.drivers.dominant_factor}
          </span>
        </div>
        {checkpoint.risk.drivers.load_rule_applied && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] text-red-400 font-medium">
            Load Escalation: {checkpoint.risk.drivers.load_rule_applied}
          </div>
        )}
      </div>
    </div>
  );
};
