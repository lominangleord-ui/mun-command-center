export const API_REGISTRY = {
  restCountries: { name: "REST Countries", baseUrl: "/api/sources/restcountries/v3.1", ttlMs: 7 * 24 * 60 * 60 * 1000 },
  worldBank: { name: "World Bank Indicators", baseUrl: "/api/sources/worldbank/v2", ttlMs: 30 * 24 * 60 * 60 * 1000 },
  gdelt: { name: "GDELT 2.0 DOC", baseUrl: "/api/sources/gdelt/api/v2/doc/doc", ttlMs: 15 * 60 * 1000 },
  openMeteo: { name: "Open-Meteo", baseUrl: "/api/sources/open-meteo/v1", ttlMs: 30 * 60 * 1000 },
  openAlex: { name: "OpenAlex", baseUrl: "/api/sources/openalex", ttlMs: 60 * 60 * 1000 },
  iso3166: { name: "ISO 3166 via REST Countries", baseUrl: "/api/sources/restcountries/v3.1", ttlMs: 30 * 24 * 60 * 60 * 1000 },
} as const;
