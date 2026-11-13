import { useCallback, useEffect, useRef } from "react";

export function useAnimationFrameThrottle<T extends (...args: unknown[]) => void>(
  callback: T
): (...args: Parameters<T>) => void {
  const rafId = useRef<number | null>(null);
  const latestArgs = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    latestArgs.current = args;

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (latestArgs.current) {
          callbackRef.current(...latestArgs.current);
        }
        rafId.current = null;
      });
    }
  }, []);
}
