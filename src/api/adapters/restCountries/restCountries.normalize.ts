import { createFreshness } from "../../core/freshness";
import { createSourceMetadata } from "../../core/sourceMetadata";
import type { CountryMetadata } from "../../models/country";

export function normalizeRestCountry(raw: any, endpoint: string, cached = false): CountryMetadata {
  const currencies = raw?.currencies && typeof raw.currencies === "object" ? Object.keys(raw.currencies) : [];
  const languages = raw?.languages && typeof raw.languages === "object" ? Object.values(raw.languages).filter((v): v is string => typeof v === "string") : [];
  return {
    name: raw?.name?.common || "Unknown",
    officialName: raw?.name?.official || raw?.name?.common || "Unknown",
    iso2: raw?.cca2 || "",
    iso3: raw?.cca3 || "",
    flagEmoji: raw?.flag || "🏳️",
    flagSvg: raw?.flags?.svg || raw?.flags?.png,
    capital: Array.isArray(raw?.capital) ? raw.capital[0] : undefined,
    region: raw?.region,
    subregion: raw?.subregion,
    population: typeof raw?.population === "number" ? raw.population : undefined,
    currencies,
    languages,
    borders: Array.isArray(raw?.borders) ? raw.borders : [],
    latlng: Array.isArray(raw?.latlng) && raw.latlng.length >= 2 ? [raw.latlng[0], raw.latlng[1]] : undefined,
    source: createSourceMetadata("REST Countries", endpoint, "CC BY-SA 4.0"),
    freshness: createFreshness(cached ? "cached" : "live"),
  };
}