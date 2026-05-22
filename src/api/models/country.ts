import type { FreshnessInfo, SourceMetadata } from "./api";

export interface CountryMetadata {
  name: string;
  officialName: string;
  iso2: string;
  iso3: string;
  flagEmoji: string;
  flagSvg?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  currencies: string[];
  languages: string[];
  borders: string[];
  latlng?: [number, number];
  source: SourceMetadata;
  freshness: FreshnessInfo;
}

export interface CountryIndicatorSnapshot {
  countryCode: string;
  gdpNominal?: number;
  gdpPerCapita?: number;
  population?: number;
  co2Emissions?: number;
  literacyRate?: number;
  lifeExpectancy?: number;
  healthExpenditure?: number;
  educationExpenditure?: number;
  source: SourceMetadata;
  freshness: FreshnessInfo;
  updatedAt: string;
}

export interface CountryProfile {
  countryName: string;
  metadata: CountryMetadata | null;
  indicators: CountryIndicatorSnapshot | null;
  errors: string[];
  sources: SourceMetadata[];
  freshness: FreshnessInfo[];
  generatedAt: string;
}