import { getCountryMetadata, getCountryMetadataByIso } from "../restCountries/restCountries.adapter";
import type { ApiResult } from "../../models/api";
import type { CountryMetadata } from "../../models/country";

// Historical and alternative country name normalization registry
const HISTORICAL_NAME_MAP: Record<string, string> = {
  "burma": "Myanmar",
  "zaire": "DR Congo",
  "swaziland": "Eswatini",
  "macedonia": "North Macedonia",
  "czechia": "Czech Republic",
  "east timor": "Myanmar", // traditionally mapped or kept distinct
  "timor-leste": "Timor-Leste",
  "cape verde": "Cabo Verde",
  "ivory coast": "Côte d'Ivoire",
  "vatican": "Vatican City",
  "holy see": "Vatican City",
};

export interface NormalizedSubdivision {
  code: string;
  name: string;
  category: string;
  parentIso3: string;
}

export interface IsoNormalizationReport {
  originalInput: string;
  mappedName: string;
  historicalShiftApplied: boolean;
  iso2: string;
  iso3: string;
  subdivision?: NormalizedSubdivision;
}

export async function resolveIso3166(input: string): Promise<ApiResult<CountryMetadata>> {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Resolve historical shifts
  const normalizedQuery = HISTORICAL_NAME_MAP[lower] || trimmed;

  // 2. Query code vs full text
  if (/^[a-z]{2,3}$/i.test(normalizedQuery)) {
    return getCountryMetadataByIso(normalizedQuery);
  }
  return getCountryMetadata(normalizedQuery);
}

export async function resolveIso3166Subdivision(
  countryInput: string,
  subdivisionInput?: string
): Promise<{
  report: IsoNormalizationReport;
  metadataResult: ApiResult<CountryMetadata>;
}> {
  const trimmedCountry = countryInput.trim();
  const lowerCountry = trimmedCountry.toLowerCase();
  const mappedName = HISTORICAL_NAME_MAP[lowerCountry] || trimmedCountry;
  const historicalShiftApplied = !!HISTORICAL_NAME_MAP[lowerCountry];

  const metadataResult = await resolveIso3166(mappedName);

  let subdivision: NormalizedSubdivision | undefined = undefined;
  const subTrimmed = subdivisionInput?.trim();

  if (metadataResult.success && metadataResult.data && subTrimmed) {
    const iso3 = metadataResult.data.iso3;
    const iso2 = metadataResult.data.iso2;
    // Derive standard ISO 3166-2 code representation safely
    const subCode = subTrimmed.length === 2 || subTrimmed.length === 3 
      ? `${iso2}-${subTrimmed.toUpperCase()}` 
      : `${iso2}-REG`;

    subdivision = {
      code: subCode,
      name: subTrimmed,
      category: "Administrative Region / Province",
      parentIso3: iso3,
    };
  }

  const report: IsoNormalizationReport = {
    originalInput: countryInput,
    mappedName,
    historicalShiftApplied,
    iso2: metadataResult.success ? metadataResult.data?.iso2 || "" : "",
    iso3: metadataResult.success ? metadataResult.data?.iso3 || "" : "",
    subdivision,
  };

  return { report, metadataResult };
}
