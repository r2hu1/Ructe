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
    <div className="error-banner">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
        <AlertCircle size={18} />
        <span>{friendlyTitle}</span>
      </div>
      <p style={{ marginTop: "4px" }}>{friendlyHelp}</p>
      {error.details && (
        <pre
          style={{
            fontSize: "0.72rem",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            padding: "6px",
            borderRadius: "4px",
            marginTop: "6px",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(error.details, null, 2)}
        </pre>
      )}
      <button
        type="button"
        onClick={onRetry}
        style={{
          alignSelf: "flex-start",
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "transparent",
          border: "1px solid #ef4444",
          color: "#fee2e2",
          padding: "5px 10px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        <RotateCcw size={14} />
        <span>Try Again</span>
      </button>
    </div>
  );
};
