import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { ApiException } from "../../api/client";

interface ErrorStateProps {
  error: ApiException;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  let friendlyTitle = "Unable to complete route analysis";
  let friendlyHelp = error.message;

  if (error.code === "UNABLE_TO_GEOCODE") {
    friendlyTitle = "Location Not Found";
    friendlyHelp = "Please verify the origin and destination addresses and select from autocomplete.";
  } else if (error.code === "UNROUTABLE") {
    friendlyTitle = "No Driving Route Found";
    friendlyHelp = "The routing engine could not find a drivable route between those locations.";
  } else if (error.code === "UPSTREAM_FAILURE" || error.code === "UPSTREAM_WEATHER_FAILURE") {
    friendlyTitle = "Weather or Routing Service Unavailable";
    friendlyHelp = "One of our upstream data providers encountered an issue. Please try again in a few moments.";
  } else if (error.code === "UPSTREAM_TIMEOUT") {
    friendlyTitle = "Request Timed Out";
    friendlyHelp = "The request to upstream data providers took too long. Please retry.";
  } else if (error.code === "VALIDATION_ERROR") {
    friendlyTitle = "Invalid Parameters";
  }

  return (
    <div className="p-4 rounded-[21px] bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-[12px] space-y-2">
      <div className="flex items-center gap-2 font-bold text-[13px] text-[#DC2626]">
        <AlertCircle size={16} />
        <span>{friendlyTitle}</span>
      </div>
      <p className="leading-relaxed opacity-90">{friendlyHelp}</p>
      {error.details && (
        <pre className="text-[11px] bg-white/70 p-2 rounded-[12px] border border-[#FCA5A5]/50 overflow-x-auto text-[#1E293B]">
          {JSON.stringify(error.details, null, 2)}
        </pre>
      )}
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[21px] text-[11px] font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
        onClick={onRetry}
      >
        <RotateCcw size={12} />
        <span>Try Again</span>
      </button>
    </div>
  );
};
