import React, { useState } from "react";
import { ArrowRight, Calendar, Loader2, MapPin, Navigation, Scale, Truck } from "lucide-react";
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
    originInput.trim().length > 0 &&
    destinationInput.trim().length > 0 &&
    departureTime.length > 0 &&
    loadWeightLb >= 0 &&
    loadWeightLb <= 90000;

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="origin-input">
          Origin Address
        </label>
        <div className="input-wrapper">
          <MapPin size={16} className="input-icon" />
          <input
            id="origin-input"
            type="text"
            className="form-input"
            value={originInput}
            onChange={(e) => {
              setOriginInput(e.target.value);
              setOriginActive(true);
            }}
            onFocus={() => setOriginActive(true)}
            onBlur={() => {
              setTimeout(() => setOriginActive(false), 200);
            }}
            placeholder="e.g. Chicago, IL"
            autoComplete="off"
            required
          />
          {originAutocomp.isLoading && (
            <Loader2
              size={14}
              className="input-icon"
              style={{ left: "auto", right: "12px", animation: "spin 1s linear infinite" }}
            />
          )}
        </div>
        {originActive && originAutocomp.suggestions.length > 0 && (
          <ul className="autocomplete-dropdown">
            {originAutocomp.suggestions.map((item, idx) => (
              <li
                key={idx}
                className="autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectOrigin(item);
                }}
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="dest-input">
          Destination Address
        </label>
        <div className="input-wrapper">
          <Navigation size={16} className="input-icon" />
          <input
            id="dest-input"
            type="text"
            className="form-input"
            value={destinationInput}
            onChange={(e) => {
              setDestinationInput(e.target.value);
              setDestActive(true);
            }}
            onFocus={() => setDestActive(true)}
            onBlur={() => {
              setTimeout(() => setDestActive(false), 200);
            }}
            placeholder="e.g. Atlanta, GA"
            autoComplete="off"
            required
          />
          {destAutocomp.isLoading && (
            <Loader2
              size={14}
              className="input-icon"
              style={{ left: "auto", right: "12px", animation: "spin 1s linear infinite" }}
            />
          )}
        </div>
        {destActive && destAutocomp.suggestions.length > 0 && (
          <ul className="autocomplete-dropdown">
            {destAutocomp.suggestions.map((item, idx) => (
              <li
                key={idx}
                className="autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectDest(item);
                }}
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>

        <div className="form-group">
          <label className="form-label" htmlFor="departure-time-input">
            Departure (Local)
          </label>
          <div className="input-wrapper">
            <Calendar size={16} className="input-icon" />
            <input
              id="departure-time-input"
              type="datetime-local"
              className="form-input"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="load-weight-input">
            Load Weight (lb)
          </label>
          <div className="input-wrapper">
            <Scale size={16} className="input-icon" />
            <input
              id="load-weight-input"
              type="number"
              className="form-input"
              value={loadWeightLb}
              min={0}
              max={90000}
              step={500}
              onChange={(e) => setLoadWeightLb(Number(e.target.value))}
              required
            />
          </div>
        </div>

      <div className="form-group">
        <label className="form-label">
          Checkpoint Interval (mi)
        </label>
        <div className="segmented-control" role="radiogroup">
          {([10, 25, 50] as const).map((interval) => (
            <button
              key={interval}
              type="button"
              className={`segment-btn ${checkpointInterval === interval ? "active" : ""}`}
              onClick={() => setCheckpointInterval(interval)}
              role="radio"
              aria-checked={checkpointInterval === interval}
            >
              {interval} mi
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={!isFormValid || isLoading}
      >
        <Truck size={18} />
        <span>{isLoading ? "Computing Routes..." : isUpdating ? "Recomputing..." : "Analyze Routes"}</span>
        <ArrowRight size={16} />
      </button>
    </form>
  );
};
