import { API_REGISTRY } from "../../core/registry";
import { fetchWithTimeout } from "../../core/fetchWithTimeout";
import { cacheGet, cacheSet } from "../../core/cache";
import { createSourceMetadata } from "../../core/sourceMetadata";
import { createFreshness } from "../../core/freshness";
import { apiFail, apiOk, type ApiResult } from "../../models/api";
import type { CountryIndicatorSnapshot } from "../../models/country";
import { WORLD_BANK_INDICATORS } from "./worldBank.indicators";

type IndicatorField = keyof Omit<CountryIndicatorSnapshot, "countryCode" | "source" | "freshness" | "updatedAt">;

interface IndicatorResult {
  field: IndicatorField;
  value: number | null;
}

async function fetchSingleIndicator(iso3: string, field: IndicatorField, indicator: string): Promise<IndicatorResult> {
  const api = API_REGISTRY.worldBank;
  const cacheKey = `wb:${iso3}:${field}`;
  const cached = cacheGet<number | null>(cacheKey);
  if (cached.value !== null && cached.value !== undefined) {
    return { field, value: cached.value };
  }

  const endpoint = `${api.baseUrl}/country/${iso3}/indicator/${indicator}?format=json&mrnev=1`;
  const res = await fetchWithTimeout<unknown>(endpoint, { timeoutMs: 6000 });
  if (!res.ok) return { field, value: null };

  const payload = res.data as unknown;
  const dataset = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1] : null;
  const latest = dataset && dataset.length > 0 ? (dataset[0] as { value?: number | null }) : null;
  const value = latest && typeof latest.value === "number" ? latest.value : null;
  if (value !== null) {
    cacheSet(cacheKey, value, api.ttlMs);
  }
  return { field, value };
}

export async function getCountryIndicators(iso3: string): Promise<ApiResult<CountryIndicatorSnapshot>> {
  const api = API_REGISTRY.worldBank;
  const code = iso3.trim().toUpperCase();
  const source = createSourceMetadata(api.name, `${api.baseUrl}/country/${code}`);

  if (!code) {
    return apiFail(
      { code: "INVALID_RESPONSE", message: "ISO3 required", retryable: false },
      source,
      createFreshness("error")
    );
  }

  const snapshotKey = `worldbank:snapshot:${code}`;
  const cached = cacheGet<CountryIndicatorSnapshot>(snapshotKey);
  if (cached.value) return apiOk(cached.value, source, cached.freshness);

  const entries = Object.entries(WORLD_BANK_INDICATORS) as [IndicatorField, string][];
  const results = await Promise.all(entries.map(([field, code2]) => fetchSingleIndicator(code, field, code2)));

  const snapshot: CountryIndicatorSnapshot = {
    countryCode: code,
    source,
    freshness: createFreshness("live", Date.now(), api.ttlMs),
    updatedAt: new Date().toISOString(),
  };

  let successCount = 0;
  results.forEach(({ field, value }) => {
    if (value !== null) {
      (snapshot as unknown as Record<string, number>)[field] = value;
      successCount++;
    }
  });

  if (successCount === 0) {
    return apiFail(
      { code: "EMPTY_RESULT", message: `No World Bank indicators for ${code}`, source: api.name, retryable: true },
      source,
      cached.freshness,
      cached.staleValue
    );
  }

  cacheSet(snapshotKey, snapshot, api.ttlMs);
  return apiOk(snapshot, source, createFreshness("live", Date.now(), api.ttlMs));
}
