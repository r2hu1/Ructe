import { useCallback, useEffect, useRef } from "react";

export function useAnimationFrameThrottle<Args extends unknown[]>(
  callback: (...args: Args) => void
): (...args: Args) => void {
  const rafId = useRef<number | null>(null);
  const latestArgs = useRef<Args | null>(null);
  const callbackRef = useRef<(...args: Args) => void>(callback);

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

  return useCallback((...args: Args) => {
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
