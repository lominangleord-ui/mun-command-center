import { useEffect, useRef, useState, useCallback } from "react";

export type AsyncStatus = "idle" | "loading" | "ready" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

/**
 * Standard async resource hook used by all API-backed UI panels.
 *
 * Guarantees:
 * - never throws into render
 * - always cleans up state on unmount or dependency change
 * - exposes a `refresh` function for manual reloads
 * - never sets state after unmount (avoids React act warnings)
 */
export function useApiResource<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>
): AsyncState<T> & { refresh: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle", data: null, error: null });
  const aliveRef = useRef(true);
  const generationRef = useRef(0);

  const run = useCallback(async () => {
    const generation = ++generationRef.current;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await loader();
      if (!aliveRef.current || generation !== generationRef.current) return;
      setState({ status: "ready", data, error: null });
    } catch (err) {
      if (!aliveRef.current || generation !== generationRef.current) return;
      const message = err instanceof Error ? err.message : "Unexpected error";
      setState({ status: "error", data: null, error: message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    aliveRef.current = true;
    run();
    return () => {
      aliveRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refresh: run };
}
