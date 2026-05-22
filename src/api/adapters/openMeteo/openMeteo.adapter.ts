import { API_REGISTRY } from "../../core/registry";
import { fetchWithTimeout } from "../../core/fetchWithTimeout";
import { cacheGet, cacheSet } from "../../core/cache";
import { createSourceMetadata } from "../../core/sourceMetadata";
import { createFreshness } from "../../core/freshness";
import { apiFail, apiOk, type ApiResult } from "../../models/api";
import type { WeatherSnapshot } from "../../models/weather";

function condition(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloud cover";
  if (code >= 45 && code <= 48) return "Fog / low visibility";
  if (code >= 51 && code <= 67) return "Rain / drizzle";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Variable";
}

export async function getWeatherSnapshot(lat: number, lng: number): Promise<ApiResult<WeatherSnapshot>> {
  const api = API_REGISTRY.openMeteo;
  const key = `meteo:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const endpoint = `${api.baseUrl}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,precipitation,weather_code`;
  const source = createSourceMetadata(api.name, endpoint);
  const cached = cacheGet<WeatherSnapshot>(key);
  if (cached.value) return apiOk(cached.value, source, cached.freshness);
  const res = await fetchWithTimeout<any>(endpoint, 6000);
  if (!res.ok) return apiFail(res.error, source, cached.freshness, cached.staleValue);
  const current = res.data?.current || {};
  const snap: WeatherSnapshot = {
    latitude: lat,
    longitude: lng,
    temperatureC: typeof current.temperature_2m === "number" ? current.temperature_2m : undefined,
    windSpeedKmh: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : undefined,
    precipitationMm: typeof current.precipitation === "number" ? current.precipitation : undefined,
    condition: condition(current.weather_code ?? -1),
    source,
    freshness: createFreshness("live", Date.now(), api.ttlMs),
    updatedAt: new Date().toISOString(),
  };
  cacheSet(key, snap, api.ttlMs);
  return apiOk(snap, source, snap.freshness);
}