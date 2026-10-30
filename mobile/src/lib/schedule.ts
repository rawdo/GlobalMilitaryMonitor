// Decides when each source should next be fetched, based on what the source itself reports:
// HTTP cache headers say when its content can next change, Retry-After / 429 say when we may ask again.
// Kept free of runtime imports so it can be unit tested directly with Node.

export interface ScheduleLimits {
  /** Never poll more often than this, even if the source allows it (battery / politeness). */
  minIntervalMs: number;
  /** Never wait longer than this, even if the source says its content is fresh for longer. */
  maxIntervalMs: number;
  /** Used when the source gives no freshness information (defaults to minIntervalMs). */
  defaultIntervalMs?: number;
}

export interface HeaderReader {
  get(name: string): string | null;
}

export interface NextFetch {
  delayMs: number;
  reason: string;
}

const clamp = (value: number, { minIntervalMs, maxIntervalMs }: ScheduleLimits) =>
  Math.min(maxIntervalMs, Math.max(minIntervalMs, value));

/** Seconds the response stays fresh according to Cache-Control/Age or Expires/Date, or null if unstated. */
export function freshnessSeconds(headers: HeaderReader): number | null {
  const cacheControl = headers.get('cache-control') ?? '';
  if (/\b(no-cache|no-store)\b/i.test(cacheControl)) return 0;
  const maxAge = cacheControl.match(/\bmax-age=(\d+)/i);
  if (maxAge) {
    const age = Number(headers.get('age') ?? 0) || 0;
    return Math.max(0, Number(maxAge[1]) - age);
  }
  const expires = Date.parse(headers.get('expires') ?? '');
  if (!isNaN(expires)) {
    const date = Date.parse(headers.get('date') ?? '');
    const base = isNaN(date) ? Date.now() : date;
    return Math.max(0, Math.round((expires - base) / 1000));
  }
  return null;
}

/** Retry-After in seconds (delta-seconds or HTTP date), or null. */
export function retryAfterSeconds(headers: HeaderReader, now = Date.now()): number | null {
  const value = headers.get('retry-after');
  if (!value) return null;
  if (/^\d+$/.test(value.trim())) return Number(value);
  const date = Date.parse(value);
  return isNaN(date) ? null : Math.max(0, Math.round((date - now) / 1000));
}

export function formatInterval(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = s / 60;
  return Number.isInteger(m) ? `${m} min` : `${m.toFixed(1)} min`;
}

/** After a successful (200 or 304) response. */
export function scheduleAfterSuccess(headers: HeaderReader, limits: ScheduleLimits): NextFetch {
  const fresh = freshnessSeconds(headers);
  if (fresh == null) {
    const delayMs = limits.defaultIntervalMs ?? limits.minIntervalMs;
    return { delayMs, reason: `${formatInterval(delayMs)} (no cache info from source)` };
  }
  const delayMs = clamp(fresh * 1000, limits);
  const why =
    delayMs === fresh * 1000 ? 'source cache' : delayMs === limits.minIntervalMs ? 'minimum interval' : 'maximum interval';
  return { delayMs, reason: `${formatInterval(delayMs)} (${why})` };
}

/**
 * After a failure. Rate limits honour Retry-After when given; everything else backs off
 * exponentially from the minimum interval, so a broken feed doesn't drain the battery.
 */
export function scheduleAfterFailure(
  status: number | null,
  headers: HeaderReader | null,
  failures: number,
  limits: ScheduleLimits,
): NextFetch {
  const retryAfter = headers ? retryAfterSeconds(headers) : null;
  if (retryAfter != null) {
    const delayMs = clamp(retryAfter * 1000, limits);
    return { delayMs, reason: `${formatInterval(delayMs)} (source asked us to wait)` };
  }
  const delayMs = clamp(limits.minIntervalMs * 2 ** Math.max(0, failures - 1), limits);
  const what = status === 429 ? 'rate limited' : 'error';
  return { delayMs, reason: `${formatInterval(delayMs)} (${what}, backing off)` };
}
