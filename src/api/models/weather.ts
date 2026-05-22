import type { FreshnessInfo, SourceMetadata } from "./api";

export interface WeatherSnapshot {
  latitude: number;
  longitude: number;
  temperatureC?: number;
  windSpeedKmh?: number;
  precipitationMm?: number;
  condition: string;
  source: SourceMetadata;
  freshness: FreshnessInfo;
  updatedAt: string;
}