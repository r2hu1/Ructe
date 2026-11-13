import { useEffect, useState } from "react";
import { fetchAutocomplete } from "../api/endpoints";
import { AutocompleteSuggestion } from "../api/types";
import { useDebouncedValue } from "./useDebouncedValue";

export function useGeocodeAutocomplete(input: string) {
  const debouncedQuery = useDebouncedValue(input, 300);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await fetchAutocomplete(debouncedQuery);
        if (!isCancelled) {
          setSuggestions(results);
        }
      } catch {
        if (!isCancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  return { suggestions, isLoading, setSuggestions };
}
