'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginationMeta } from '@repo/types';
import api, { apiErrorMessage } from './axios';

export interface ApiState<T> {
  data: T | undefined;
  meta: PaginationMeta | undefined;
  error: string | null;
  /** HTTP status of the last failure (e.g. 403), if any */
  status: number | null;
  loading: boolean;
  reload: () => void;
}

/**
 * GET an API path and unwrap the { success, data, meta } envelope.
 * Pass null to skip the request (e.g. when the user lacks permission).
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<Omit<ApiState<T>, 'reload'>>({
    data: undefined, meta: undefined, error: null, status: null, loading: path !== null,
  });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const latest = useRef(0);

  useEffect(() => {
    if (path === null) {
      setState({ data: undefined, meta: undefined, error: null, status: null, loading: false });
      return;
    }
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null, status: null }));
    api.get(path)
      .then((res) => {
        if (id !== latest.current) return;
        setState({ data: res.data?.data as T, meta: res.data?.meta, error: null, status: null, loading: false });
      })
      .catch((err) => {
        if (id !== latest.current) return;
        setState({
          data: undefined, meta: undefined, loading: false,
          error: apiErrorMessage(err, 'Could not load data'),
          status: err?.response?.status ?? null,
        });
      });
  }, [path, tick]);

  return { ...state, reload };
}

/** Wraps a mutating call with pending/error state for buttons and forms. */
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (err) {
      setError(apiErrorMessage(err));
      return undefined;
    } finally {
      setPending(false);
    }
  }, [fn]);
  return { run, pending, error, setError };
}
