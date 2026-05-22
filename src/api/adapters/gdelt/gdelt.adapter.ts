import { API_REGISTRY } from "../../core/registry";
import { fetchWithTimeout } from "../../core/fetchWithTimeout";
import { cacheGet, cacheSet } from "../../core/cache";
import { createSourceMetadata } from "../../core/sourceMetadata";
import { createFreshness } from "../../core/freshness";
import { apiFail, apiOk, type ApiResult } from "../../models/api";
import type { GeopoliticalEvent } from "../../models/intelligence";
import { normalizeGdeltArticle } from "./gdelt.normalize";

/**
 * GDELT 2.0 DOC API
 *
 * Important behavioral notes baked in:
 * 1. GDELT requires queries with multiple words to be phrase-quoted
 *    or joined with explicit operators, otherwise it 400s with HTML.
 * 2. Empty results are a *success*, not a failure — they just mean
 *    no high-signal coverage in the time window.
 * 3. The endpoint occasionally returns HTML on overload; fetchWithTimeout
 *    detects non-JSON content-type and surfaces it as a real error.
 * 4. We cap query length to keep URLs short and reliable.
 */

function buildQuery(rawQuery: string): string {
  const cleaned = rawQuery.replace(/[^\w\s'"-]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  // Truncate very long queries that GDELT rejects
  const trimmed = cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
  // If it already has quotes/operators, keep it; otherwise quote the whole phrase
  if (/["()]|\bAND\b|\bOR\b/i.test(trimmed)) return trimmed;
  return `"${trimmed}"`;
}

export async function searchGdeltEvents(query: string): Promise<ApiResult<GeopoliticalEvent[]>> {
  const api = API_REGISTRY.gdelt;
  const formatted = buildQuery(query);
  const key = `gdelt:${formatted.toLowerCase()}`;
  const params = new URLSearchParams({
    query: formatted,
    mode: "artlist",
    format: "json",
    maxrecords: "8",
    timespan: "2weeks",
    sort: "datedesc",
  });
  const endpoint = `${api.baseUrl}?${params.toString()}`;
  const source = createSourceMetadata(api.name, endpoint);

  if (!formatted) {
    return apiOk([], source, createFreshness("live", Date.now(), api.ttlMs));
  }

  const cached = cacheGet<GeopoliticalEvent[]>(key);
  if (cached.value) return apiOk(cached.value, source, cached.freshness);

  const res = await fetchWithTimeout<unknown>(endpoint, { timeoutMs: 8000 });
  if (!res.ok) {
    // Serve stale data on failure; otherwise surface error so the UI shows it.
    return apiFail(res.error, source, cached.freshness, cached.staleValue);
  }

  const payload = res.data as { articles?: unknown };
  const articles = Array.isArray(payload?.articles)
    ? (payload!.articles as unknown[]).map((a) => normalizeGdeltArticle(a, endpoint))
    : [];

  // Empty is a legitimate result, not an error
  cacheSet(key, articles, api.ttlMs);
  return apiOk(articles, source, createFreshness("live", Date.now(), api.ttlMs));
}
