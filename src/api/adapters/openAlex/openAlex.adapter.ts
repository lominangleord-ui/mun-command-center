import { API_REGISTRY } from "../../core/registry";
import { fetchWithTimeout } from "../../core/fetchWithTimeout";
import { cacheGet, cacheSet } from "../../core/cache";
import { createSourceMetadata } from "../../core/sourceMetadata";
import { createFreshness } from "../../core/freshness";
import { apiFail, apiOk, type ApiResult } from "../../models/api";
import type { PolicyResearchSource } from "../../models/research";
import { normalizeOpenAlexWork } from "./openAlex.normalize";

/**
 * OpenAlex Works search.
 *
 * Notes:
 * - OpenAlex uses `per_page` (underscore), not `per-page`.
 * - The `mailto` parameter unlocks the polite pool with higher rate limits
 *   and is required practice per OpenAlex docs.
 * - Empty result sets return success with [] so the UI can say "no sources",
 *   instead of incorrectly surfacing a hard error.
 */

const POLITE_MAILTO = "research@mun-command.app";

export async function searchOpenAlexWorks(query: string, limit = 6): Promise<ApiResult<PolicyResearchSource[]>> {
  const api = API_REGISTRY.openAlex;
  const clean = query.trim();
  const key = `openalex:${clean.toLowerCase()}:${limit}`;

  const params = new URLSearchParams({
    search: clean,
    per_page: String(limit),
    mailto: POLITE_MAILTO,
  });
  const endpoint = `${api.baseUrl}/works?${params.toString()}`;
  const source = createSourceMetadata(api.name, endpoint, "CC0");

  if (!clean) {
    return apiOk([], source, createFreshness("live", Date.now(), api.ttlMs));
  }

  const cached = cacheGet<PolicyResearchSource[]>(key);
  if (cached.value) return apiOk(cached.value, source, cached.freshness);

  const res = await fetchWithTimeout<unknown>(endpoint, { timeoutMs: 8000 });
  if (!res.ok) return apiFail(res.error, source, cached.freshness, cached.staleValue);

  const payload = res.data as { results?: unknown };
  const works = Array.isArray(payload?.results)
    ? (payload!.results as unknown[]).map((w) => normalizeOpenAlexWork(w, endpoint))
    : [];

  cacheSet(key, works, api.ttlMs);
  return apiOk(works, source, createFreshness("live", Date.now(), api.ttlMs));
}
