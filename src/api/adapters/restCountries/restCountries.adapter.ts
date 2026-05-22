import { API_REGISTRY } from "../../core/registry";
import { fetchWithTimeout } from "../../core/fetchWithTimeout";
import { cacheGet, cacheSet } from "../../core/cache";
import { createSourceMetadata } from "../../core/sourceMetadata";
import { createFreshness } from "../../core/freshness";
import { apiFail, apiOk, type ApiResult } from "../../models/api";
import type { CountryMetadata } from "../../models/country";
import { normalizeRestCountry } from "./restCountries.normalize";

const FIELDS = "name,cca2,cca3,flag,flags,capital,region,subregion,population,currencies,languages,borders,latlng";

export async function getCountryMetadata(countryName: string): Promise<ApiResult<CountryMetadata>> {
  const api = API_REGISTRY.restCountries;
  const cleanName = countryName.trim();
  if (!cleanName) {
    const empty = createSourceMetadata(api.name, api.baseUrl);
    return apiFail(
      { code: "INVALID_RESPONSE", message: "Country name is required", retryable: false },
      empty,
      createFreshness("error")
    );
  }

  const key = `rest:name:${cleanName.toLowerCase()}`;
  const endpoint = `${api.baseUrl}/name/${encodeURIComponent(cleanName)}?fields=${FIELDS}`;
  const source = createSourceMetadata(api.name, endpoint, "CC BY-SA 4.0");

  const cached = cacheGet<CountryMetadata>(key);
  if (cached.value) return apiOk(cached.value, source, cached.freshness);

  const res = await fetchWithTimeout<unknown>(endpoint, { timeoutMs: 7000 });
  if (!res.ok) {
    return apiFail(res.error, source, cached.freshness, cached.staleValue);
  }

  const list = Array.isArray(res.data) ? res.data : null;
  const raw = list && list.length > 0 ? list[0] : null;
  if (!raw) {
    return apiFail(
      { code: "EMPTY_RESULT", message: `No REST Countries match for "${cleanName}"`, endpoint, source: api.name, retryable: false },
      source,
      cached.freshness,
      cached.staleValue
    );
  }

  const normalized = normalizeRestCountry(raw, endpoint, false);
  cacheSet(key, normalized, api.ttlMs);
  return apiOk(normalized, source, createFreshness("live", Date.now(), api.ttlMs));
}

export async function getCountryMetadataByIso(iso: string): Promise<ApiResult<CountryMetadata>> {
  const api = API_REGISTRY.restCountries;
  const code = iso.trim().toUpperCase();
  if (!code) {
    const empty = createSourceMetadata(api.name, api.baseUrl);
    return apiFail(
      { code: "INVALID_RESPONSE", message: "ISO code required", retryable: false },
      empty,
      createFreshness("error")
    );
  }

  const key = `rest:iso:${code}`;
  const endpoint = `${api.baseUrl}/alpha/${encodeURIComponent(code)}?fields=${FIELDS}`;
  const source = createSourceMetadata(api.name, endpoint, "CC BY-SA 4.0");

  const cached = cacheGet<CountryMetadata>(key);
  if (cached.value) return apiOk(cached.value, source, cached.freshness);

  const res = await fetchWithTimeout<unknown>(endpoint, { timeoutMs: 7000 });
  if (!res.ok) return apiFail(res.error, source, cached.freshness, cached.staleValue);

  const raw = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!raw) {
    return apiFail(
      { code: "EMPTY_RESULT", message: `No country for ISO ${code}`, endpoint, source: api.name, retryable: false },
      source,
      cached.freshness,
      cached.staleValue
    );
  }

  const normalized = normalizeRestCountry(raw, endpoint, false);
  cacheSet(key, normalized, api.ttlMs);
  return apiOk(normalized, source, createFreshness("live", Date.now(), api.ttlMs));
}
