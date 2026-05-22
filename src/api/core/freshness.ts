import type { CacheStatus, FreshnessInfo } from "../models/api";

export function createFreshness(
  cacheStatus: CacheStatus,
  fetchedAt = Date.now(),
  ttlMs?: number
): FreshnessInfo {
  return {
    fetchedAt: new Date(fetchedAt).toISOString(),
    lastUpdated: new Date(fetchedAt).toISOString(),
    cacheStatus,
    ttlMs,
    ageMs: Date.now() - fetchedAt,
  };
}

export function isExpired(fetchedAt: number, ttlMs: number): boolean {
  return Date.now() - fetchedAt > ttlMs;
}

export function describeFreshness(freshness: FreshnessInfo): string {
  switch (freshness.cacheStatus) {
    case "live":
      return "Live";
    case "cached":
      return relativeAge(freshness.ageMs);
    case "stale":
      return `Stale · ${relativeAge(freshness.ageMs)}`;
    case "error":
      return "Error";
    case "unavailable":
    default:
      return "Unavailable";
  }
}

function relativeAge(ageMs?: number): string {
  if (typeof ageMs !== "number" || ageMs < 0) return "Recent";
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
