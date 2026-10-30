import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { fetchSnapshot } from '../lib/aggregator';
import { CONFLICT_ZONES, KNOWN_DEPLOYMENTS } from '../lib/seed';
import type { MonitorSnapshot } from '../lib/types';

const CACHE_KEY = 'gmm:snapshot:v1';
const REFRESH_INTERVAL_MS = 90_000;

interface MonitorState extends MonitorSnapshot {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY: MonitorSnapshot = {
  events: [],
  zones: CONFLICT_ZONES,
  assets: KNOWN_DEPLOYMENTS,
  feeds: [],
  updatedAt: null,
};

const MonitorContext = createContext<MonitorState | null>(null);

export function MonitorProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await fetchSnapshot();
      setSnapshot(next);
      setError(null);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Show the last cached snapshot immediately, then fetch fresh data.
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) {
          setSnapshot(JSON.parse(raw));
          setLoading(false);
        }
      })
      .catch(() => {})
      .finally(refresh);
  }, [refresh]);

  // Poll while the app is in the foreground; refresh on resume.
  useEffect(() => {
    let timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      clearInterval(timer);
      if (state === 'active') {
        refresh();
        timer = setInterval(refresh, REFRESH_INTERVAL_MS);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  return (
    <MonitorContext.Provider value={{ ...snapshot, loading, refreshing, error, refresh }}>
      {children}
    </MonitorContext.Provider>
  );
}

export function useMonitor(): MonitorState {
  const ctx = useContext(MonitorContext);
  if (!ctx) throw new Error('useMonitor must be used inside MonitorProvider');
  return ctx;
}
