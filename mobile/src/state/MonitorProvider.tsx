import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { mergeEvents } from '../lib/aggregator';
import { fetchSource, HttpError, type Validators } from '../lib/feeds';
import { scheduleAfterFailure, scheduleAfterSuccess } from '../lib/schedule';
import { CONFLICT_ZONES, KNOWN_DEPLOYMENTS } from '../lib/seed';
import { SOURCES, type Source } from '../lib/sources';
import type { ConflictZone, FeedStatus, GeoEvent, MilitaryAsset } from '../lib/types';

const CACHE_KEY = 'gmm:sources:v2';

// Each source is polled on its own timer, as soon as that source says new content can exist
// (see lib/schedule.ts), rather than all sources on one shared interval.

interface SourceState {
  events: GeoEvent[];
  validators: Validators;
  ok: boolean | null;
  error?: string;
  lastChecked: number | null;
  lastChanged: number | null;
  nextCheck: number | null;
  schedule: string;
  failures: number;
}

type SourceStates = Record<string, SourceState>;

interface MonitorState {
  events: GeoEvent[];
  zones: ConflictZone[];
  assets: MilitaryAsset[];
  feeds: FeedStatus[];
  /** ISO timestamp of the most recent successful check of any source. */
  updatedAt: string | null;
  loading: boolean;
  /** True only during a user-initiated refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const initialState = (): SourceStates =>
  Object.fromEntries(
    SOURCES.map((s) => [
      s.id,
      {
        events: [],
        validators: {},
        ok: null,
        lastChecked: null,
        lastChanged: null,
        nextCheck: null,
        schedule: 'starting…',
        failures: 0,
      },
    ]),
  );

const toIso = (ms: number | null) => (ms == null ? null : new Date(ms).toISOString());

const MonitorContext = createContext<MonitorState | null>(null);

export function MonitorProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SourceStates>(initialState);
  const [refreshing, setRefreshing] = useState(false);

  const stateRef = useRef<SourceStates>(sources);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(new Map<string, Promise<void>>());
  const lastRequest = useRef(new Map<string, number>());
  const active = useRef(AppState.currentState !== 'background');

  const update = useCallback((id: string, patch: Partial<SourceState>) => {
    stateRef.current = { ...stateRef.current, [id]: { ...stateRef.current[id], ...patch } };
    setSources(stateRef.current);
  }, []);

  const clearTimer = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  // `poll` and `schedule` call each other, so `schedule` reaches `poll` through a ref.
  const pollRef = useRef<(source: Source) => Promise<void>>(async () => {});

  const schedule = useCallback(
    (source: Source, delayMs: number) => {
      clearTimer(source.id);
      if (!active.current) return;
      timers.current.set(
        source.id,
        setTimeout(() => pollRef.current(source), Math.max(0, delayMs)),
      );
    },
    [clearTimer],
  );

  const poll = useCallback(
    (source: Source): Promise<void> => {
      const running = inFlight.current.get(source.id);
      if (running) return running;

      // Respect the source's hard rate limit, even for pull-to-refresh.
      const sinceLast = Date.now() - (lastRequest.current.get(source.id) ?? 0);
      if (sinceLast < source.hardMinGapMs) {
        schedule(source, source.hardMinGapMs - sinceLast);
        return Promise.resolve();
      }

      clearTimer(source.id);
      lastRequest.current.set(source.id, Date.now());

      const run = (async () => {
        const prev = stateRef.current[source.id];
        let next;
        try {
          const result = await fetchSource(source, prev.validators);
          const now = Date.now();
          next = scheduleAfterSuccess(result.headers, source);
          update(source.id, {
            ...(result.changed ? { events: result.events, lastChanged: now } : null),
            validators: result.validators,
            ok: true,
            error: undefined,
            lastChecked: now,
            failures: 0,
          });
        } catch (e) {
          const failures = prev.failures + 1;
          const httpError = e instanceof HttpError ? e : null;
          next = scheduleAfterFailure(httpError?.status ?? null, httpError?.headers ?? null, failures, source);
          // Keep the last good events on failure: stale news beats an empty screen.
          update(source.id, {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
            lastChecked: Date.now(),
            failures,
          });
        } finally {
          inFlight.current.delete(source.id);
        }
        update(source.id, { nextCheck: Date.now() + next.delayMs, schedule: next.reason });
        schedule(source, next.delayMs);
      })();

      inFlight.current.set(source.id, run);
      return run;
    },
    [clearTimer, schedule, update],
  );
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  // Restore the last cached events instantly, then check every source.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw || cancelled) return;
        const cached: Record<string, Pick<SourceState, 'events' | 'validators' | 'lastChanged'>> = JSON.parse(raw);
        for (const source of SOURCES) {
          if (cached[source.id]) update(source.id, cached[source.id]);
        }
      })
      .catch(() => {})
      .finally(() => {
        // Stagger the first round so ~35 requests don't all fire in the same instant.
        if (!cancelled) SOURCES.forEach((s, i) => schedule(s, i * 150));
      });
    const pending = timers.current;
    return () => {
      cancelled = true;
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [schedule, update]);

  // Pause polling in the background; on return, immediately check any source that came due meanwhile.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const wasActive = active.current;
      active.current = state === 'active';
      if (!active.current) {
        SOURCES.forEach((s) => clearTimer(s.id));
      } else if (!wasActive) {
        for (const s of SOURCES) schedule(s, (stateRef.current[s.id].nextCheck ?? 0) - Date.now());
      }
    });
    return () => sub.remove();
  }, [clearTimer, schedule]);

  // Persist events and cache validators so the next launch starts with data.
  useEffect(() => {
    const cache = Object.fromEntries(
      Object.entries(sources).map(([id, s]) => [
        id,
        { events: s.events, validators: s.validators, lastChanged: s.lastChanged },
      ]),
    );
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => {});
  }, [sources]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(SOURCES.map((s) => poll(s)));
    } finally {
      setRefreshing(false);
    }
  }, [poll]);

  const value = useMemo<MonitorState>(() => {
    const states = SOURCES.map((s) => sources[s.id]);
    const events = mergeEvents(states.map((s) => s.events));
    const checked = states.filter((s) => s.ok).map((s) => s.lastChecked ?? 0);
    return {
      events,
      zones: CONFLICT_ZONES,
      assets: KNOWN_DEPLOYMENTS,
      feeds: SOURCES.map((source, i) => ({
        id: source.id,
        name: source.name,
        group: source.group,
        url: source.url,
        homepage: source.homepage,
        ok: states[i].ok,
        count: states[i].events.length,
        error: states[i].error,
        lastChecked: toIso(states[i].lastChecked),
        lastChanged: toIso(states[i].lastChanged),
        nextCheck: toIso(states[i].nextCheck),
        schedule: states[i].schedule,
      })),
      updatedAt: checked.length ? toIso(Math.max(...checked)) : null,
      loading: events.length === 0 && states.some((s) => s.ok === null),
      refreshing,
      error: states.every((s) => s.ok === false) ? 'All news feeds failed. Check your connection.' : null,
      refresh,
    };
  }, [sources, refreshing, refresh]);

  return <MonitorContext.Provider value={value}>{children}</MonitorContext.Provider>;
}

export function useMonitor(): MonitorState {
  const ctx = useContext(MonitorContext);
  if (!ctx) throw new Error('useMonitor must be used inside MonitorProvider');
  return ctx;
}
