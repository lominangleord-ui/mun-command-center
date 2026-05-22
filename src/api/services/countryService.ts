import { getCountryMetadata } from "../adapters/restCountries/restCountries.adapter";
import { getCountryIndicators } from "../adapters/worldBank/worldBank.adapter";
import { getWeatherSnapshot } from "../adapters/openMeteo/openMeteo.adapter";
import type { CountryProfile } from "../models/country";
import type { WeatherSnapshot } from "../models/weather";

export interface CountryProfileBundle extends CountryProfile {
  weather: WeatherSnapshot | null;
}

export async function buildCountryProfile(countryName: string, includeWeather = false): Promise<CountryProfileBundle> {
  const metadata = await getCountryMetadata(countryName);
  const metaData = metadata.success && metadata.data ? metadata.data : metadata.staleData ?? null;
  const indicators = metaData?.iso3 ? await getCountryIndicators(metaData.iso3) : null;
  const weather = includeWeather && metaData?.latlng
    ? await getWeatherSnapshot(metaData.latlng[0], metaData.latlng[1])
    : null;
  return {
    countryName,
    metadata: metaData,
    indicators: indicators && indicators.success && indicators.data ? indicators.data : indicators?.staleData ?? null,
    weather: weather && weather.success && weather.data ? weather.data : weather?.staleData ?? null,
    errors: [
      ...(!metadata.success && metadata.error ? [metadata.error.message] : []),
      ...(indicators && !indicators.success && indicators.error ? [indicators.error.message] : []),
      ...(weather && !weather.success && weather.error ? [weather.error.message] : []),
    ],
    sources: [metadata.source, ...(indicators ? [indicators.source] : []), ...(weather ? [weather.source] : [])],
    freshness: [metadata.freshness, ...(indicators ? [indicators.freshness] : []), ...(weather ? [weather.freshness] : [])],
    generatedAt: new Date().toISOString(),
  };
}