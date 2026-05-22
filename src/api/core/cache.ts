import { createFreshness, isExpired } from "./freshness";
import type { FreshnessInfo } from "../models/api";

const PREFIX = "mun-api-cache:";
const memory = new Map<string, { value: unknown; fetchedAt: number; ttlMs: number }>();

export interface CacheReadResult<T> {
  value: T | null;
  staleValue?: T;
  freshness: FreshnessInfo;
  fetchedAt: number | null;
  ttlMs: number | null;
}

export function cacheGet<T>(key: string): CacheReadResult<T> {
  const fromMemory = memory.get(key) as { value: T; fetchedAt: number; ttlMs: number } | undefined;
  if (fromMemory) return classify(fromMemory);

  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) {
      return { value: null, freshness: createFreshness("unavailable"), fetchedAt: null, ttlMs: null };
    }
    const parsed = JSON.parse(raw) as { value: T; fetchedAt: number; ttlMs: number };
    if (parsed && typeof parsed.fetchedAt === "number" && typeof parsed.ttlMs === "number") {
      memory.set(key, parsed);
      return classify(parsed);
    }
  } catch {
    // ignore — return unavailable
  }

  return { value: null, freshness: createFreshness("unavailable"), fetchedAt: null, ttlMs: null };
}

function classify<T>(entry: { value: T; fetchedAt: number; ttlMs: number }): CacheReadResult<T> {
  if (!isExpired(entry.fetchedAt, entry.ttlMs)) {
    return {
      value: entry.value,
      freshness: createFreshness("cached", entry.fetchedAt, entry.ttlMs),
      fetchedAt: entry.fetchedAt,
      ttlMs: entry.ttlMs,
    };
  }
  return {
    value: null,
    staleValue: entry.value,
    freshness: createFreshness("stale", entry.fetchedAt, entry.ttlMs),
    fetchedAt: entry.fetchedAt,
    ttlMs: entry.ttlMs,
  };
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): { fetchedAt: number; ttlMs: number } {
  const entry = { value, fetchedAt: Date.now(), ttlMs };
  memory.set(key, entry);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* localStorage quota — keep memory cache only */
  }
  return { fetchedAt: entry.fetchedAt, ttlMs };
}

export function cacheInvalidate(prefix?: string): void {
  for (const key of Array.from(memory.keys())) {
    if (!prefix || key.startsWith(prefix)) memory.delete(key);
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX) && (!prefix || k.startsWith(PREFIX + prefix))) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}
