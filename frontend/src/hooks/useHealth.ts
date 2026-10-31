import type { HealthResponse } from '@pulseops/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchHealth } from '@/lib/api';

export type HealthState =
  | { phase: 'loading' }
  | { phase: 'ready'; report: HealthResponse; roundTripMs: number; checkedAt: Date }
  | { phase: 'unreachable'; message: string; checkedAt: Date };

export function useHealth(intervalMs = 10_000) {
  const [state, setState] = useState<HealthState>({ phase: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsRefreshing(true);

    const startedAt = performance.now();
    try {
      const report = await fetchHealth(controller.signal);
      if (controller.signal.aborted) return;
      setState({
        phase: 'ready',
        report,
        roundTripMs: performance.now() - startedAt,
        checkedAt: new Date(),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        phase: 'unreachable',
        message: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
      });
    } finally {
      if (!controller.signal.aborted) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
      controllerRef.current?.abort();
    };
  }, [refresh, intervalMs]);

  return { state, refresh, isRefreshing };
}
