import { apiClient } from "./client";
import {
  AnalyzeRequest,
  AnalyzeResult,
  AutocompleteSuggestion,
} from "./types";

export async function analyzeRoutes(request: AnalyzeRequest): Promise<AnalyzeResult> {
  return apiClient<AnalyzeResult>("/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchAutocomplete(
  query: string
): Promise<AutocompleteSuggestion[]> {
  const clean = query.trim();
  if (!clean) {
    return [];
  }
  const encoded = encodeURIComponent(clean);
  const data = await apiClient<{ suggestions: AutocompleteSuggestion[] }>(
    `/geocode/autocomplete?q=${encoded}`
  );
  return data.suggestions || [];
}

export async function checkHealth(): Promise<{ status: string }> {
  return apiClient<{ status: string }>("/health");
}
