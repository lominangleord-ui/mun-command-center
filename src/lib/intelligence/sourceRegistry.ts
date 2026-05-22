export type SourceCategory =
  | "official"
  | "un"
  | "regional"
  | "security"
  | "think-tank"
  | "wire"
  | "dataset"
  | "fallback";

export type TrustTier = "primary" | "strong-secondary" | "secondary" | "fallback";

export interface SourceDefinition {
  id: string;
  label: string;
  category: SourceCategory;
  url: string;
  trustTier: TrustTier;
  biasRisk: "low" | "medium" | "high";
  updateFrequency: "live" | "daily" | "weekly" | "episodic";
  usagePurpose: "official_position" | "voting_record" | "event_signal" | "macro_data" | "analysis" | "normalization";
  overridePriority: number;
}

export interface CountrySourceProfile {
  country: string;
  simulationYear: number;
  officialSources: SourceDefinition[];
  multilateralSources: SourceDefinition[];
  analysisSources: SourceDefinition[];
  fallbackSources: SourceDefinition[];
  sourcePriorityRules: string[];
}

const COMMON_MULTI: SourceDefinition[] = [
  {
    id: "un-press",
    label: "UN Press",
    category: "un",
    url: "https://press.un.org/",
    trustTier: "primary",
    biasRisk: "low",
    updateFrequency: "daily",
    usagePurpose: "official_position",
    overridePriority: 100,
  },
  {
    id: "un-digital-library",
    label: "UN Digital Library",
    category: "un",
    url: "https://digitallibrary.un.org/",
    trustTier: "primary",
    biasRisk: "low",
    updateFrequency: "daily",
    usagePurpose: "voting_record",
    overridePriority: 100,
  },
  {
    id: "world-bank",
    label: "World Bank Open Data",
    category: "dataset",
    url: "https://data.worldbank.org/",
    trustTier: "strong-secondary",
    biasRisk: "low",
    updateFrequency: "weekly",
    usagePurpose: "macro_data",
    overridePriority: 90,
  },
  {
    id: "gdelt",
    label: "GDELT",
    category: "dataset",
    url: "https://www.gdeltproject.org/",
    trustTier: "secondary",
    biasRisk: "medium",
    updateFrequency: "live",
    usagePurpose: "event_signal",
    overridePriority: 55,
  },
];

const COMMON_ANALYSIS: SourceDefinition[] = [
  {
    id: "reuters",
    label: "Reuters",
    category: "wire",
    url: "https://www.reuters.com/",
    trustTier: "strong-secondary",
    biasRisk: "low",
    updateFrequency: "live",
    usagePurpose: "event_signal",
    overridePriority: 80,
  },
  {
    id: "bbc",
    label: "BBC",
    category: "wire",
    url: "https://www.bbc.com/news",
    trustTier: "secondary",
    biasRisk: "medium",
    updateFrequency: "live",
    usagePurpose: "event_signal",
    overridePriority: 70,
  },
  {
    id: "openalex",
    label: "OpenAlex",
    category: "dataset",
    url: "https://openalex.org/",
    trustTier: "secondary",
    biasRisk: "low",
    updateFrequency: "weekly",
    usagePurpose: "analysis",
    overridePriority: 65,
  },
  {
    id: "wikipedia",
    label: "Wikipedia",
    category: "fallback",
    url: "https://www.wikipedia.org/",
    trustTier: "fallback",
    biasRisk: "medium",
    updateFrequency: "live",
    usagePurpose: "normalization",
    overridePriority: 20,
  },
];

const COUNTRY_OFFICIAL: Record<string, SourceDefinition[]> = {
  azerbaijan: [
    {
      id: "az-mfa",
      label: "Ministry of Foreign Affairs of Azerbaijan",
      category: "official",
      url: "https://www.mfa.gov.az/",
      trustTier: "primary",
      biasRisk: "medium",
      updateFrequency: "daily",
      usagePurpose: "official_position",
      overridePriority: 95,
    },
    {
      id: "az-presidency",
      label: "President of the Republic of Azerbaijan",
      category: "official",
      url: "https://president.az/",
      trustTier: "primary",
      biasRisk: "medium",
      updateFrequency: "daily",
      usagePurpose: "official_position",
      overridePriority: 95,
    },
    {
      id: "az-curated-dossier-2013",
      label: "Azerbaijan 2013 Curated Dossier (local evidence)",
      category: "dataset",
      url: "local://evidence/azerbaijan-2013-dossier",
      trustTier: "secondary",
      biasRisk: "medium",
      updateFrequency: "episodic",
      usagePurpose: "analysis",
      overridePriority: 62,
    },
  ],
  france: [
    {
      id: "fr-diplomatie",
      label: "France Diplomatie",
      category: "official",
      url: "https://www.diplomatie.gouv.fr/",
      trustTier: "primary",
      biasRisk: "low",
      updateFrequency: "daily",
      usagePurpose: "official_position",
      overridePriority: 95,
    },
  ],
  pakistan: [
    {
      id: "pk-mofa",
      label: "Ministry of Foreign Affairs of Pakistan",
      category: "official",
      url: "https://mofa.gov.pk/",
      trustTier: "primary",
      biasRisk: "medium",
      updateFrequency: "daily",
      usagePurpose: "official_position",
      overridePriority: 95,
    },
  ],
  india: [
    {
      id: "in-mea",
      label: "Ministry of External Affairs of India",
      category: "official",
      url: "https://www.mea.gov.in/",
      trustTier: "primary",
      biasRisk: "medium",
      updateFrequency: "daily",
      usagePurpose: "official_position",
      overridePriority: 95,
    },
  ],
};

const DEFAULT_OFFICIAL: SourceDefinition[] = [
  {
    id: "state-mission-un",
    label: "Permanent Mission / Foreign Ministry",
    category: "official",
    url: "https://www.un.org/en/member-states/",
    trustTier: "primary",
    biasRisk: "medium",
    updateFrequency: "episodic",
    usagePurpose: "official_position",
    overridePriority: 90,
  },
];

export function getCountrySourceProfile(country: string, simulationYear = 2013): CountrySourceProfile {
  const key = country.toLowerCase().trim();
  const officialSources = COUNTRY_OFFICIAL[key] || DEFAULT_OFFICIAL;
  return {
    country,
    simulationYear,
    officialSources,
    multilateralSources: COMMON_MULTI,
    analysisSources: COMMON_ANALYSIS.filter((s) => s.id !== "wikipedia"),
    fallbackSources: COMMON_ANALYSIS.filter((s) => s.id === "wikipedia"),
    sourcePriorityRules: [
      "For official positions, government and UN verbatim statements override media interpretation.",
      "For vote behavior, UN records override secondary analysis.",
      "Event signals require at least one wire or multilateral corroboration when available.",
      "Curated local dossier evidence is supportive context only; never sole authority for major tactical claims.",
      "Wikipedia is normalization-only and never sole authority for major tactical claims.",
      `Treat post-${simulationYear} claims as out-of-scope unless explicitly marked as simulation mismatch.`,
    ],
  };
}
