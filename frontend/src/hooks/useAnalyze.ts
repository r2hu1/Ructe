import { useCallback } from "react";
import { ApiException } from "../api/client";
import { analyzeRoutes } from "../api/endpoints";
import { AnalyzeRequest, LocationInput } from "../api/types";
import { useAppStore } from "../store/useAppStore";

export function useAnalyze() {
  const {
    originInput,
    originCoords,
    destinationInput,
    destinationCoords,
    departureTime,
    loadWeightLb,
    checkpointInterval,
    setIsLoading,
    setIsUpdating,
    setError,
    setAnalyzeResult,
    resetAnalysis,
  } = useAppStore();

  const executeAnalysis = useCallback(async () => {
    const origin: LocationInput = originCoords
      ? { lat: originCoords.lat, lng: originCoords.lng, label: originCoords.label || originInput }
      : originInput.trim();

    const destination: LocationInput = destinationCoords
      ? { lat: destinationCoords.lat, lng: destinationCoords.lng, label: destinationCoords.label || destinationInput }
      : destinationInput.trim();

    if (!origin || !destination) {
      setError(new ApiException("VALIDATION_ERROR", "Origin and destination are required", 400));
      return;
    }

    const depDate = new Date(departureTime);
    if (isNaN(depDate.getTime())) {
      setError(new ApiException("VALIDATION_ERROR", "Invalid departure date and time", 400));
      return;
    }

    const payload: AnalyzeRequest = {
      origin,
      destination,
      departure_time: depDate.toISOString(),
      load_weight_lb: Number(loadWeightLb),
      checkpoint_interval_miles: checkpointInterval,
    };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    resetAnalysis();
    setIsLoading(true);
    setIsUpdating(false);
    setError(null);

    try {
      const result = await analyzeRoutes(payload);
      setAnalyzeResult(result);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err);
      } else {
        setError(new ApiException("UNKNOWN_ERROR", "An unexpected error occurred", 500));
      }
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, [
    originInput,
    originCoords,
    destinationInput,
    destinationCoords,
    departureTime,
    loadWeightLb,
    checkpointInterval,
    setIsLoading,
    setIsUpdating,
    setError,
    setAnalyzeResult,
    resetAnalysis,
  ]);

  return { executeAnalysis };
}
