import type { SourceMetadata } from "../../api/models/api";
import type { CountryIndicatorSnapshot, CountryMetadata } from "../../api/models/country";
import type { GeopoliticalEvent } from "../../api/models/intelligence";
import type { PolicyResearchSource } from "../../api/models/research";
import { getCountryMetadata } from "../../api/adapters/restCountries/restCountries.adapter";
import { getCountryIndicators } from "../../api/adapters/worldBank/worldBank.adapter";
import { searchGdeltEvents } from "../../api/adapters/gdelt/gdelt.adapter";
import { searchOpenAlexWorks } from "../../api/adapters/openAlex/openAlex.adapter";
import { normalizeAgenda, agendaKeywordQuery, type NormalizedAgenda } from "./agendaNormalization";
import { classifyClaim, detectSimulationYearViolations, type VerifiedClaim } from "./verificationModel";
import { getCountrySourceProfile, type CountrySourceProfile, type SourceDefinition } from "./sourceRegistry";
import { getLocalEvidence, type LocalEvidenceEntry } from "./localEvidence";

export interface SourceBackedCountryIntel {
  country: string;
  simulationYear: number;
  agenda: string;
  sourceProfile: CountrySourceProfile;
  metadata: CountryMetadata | null;
  indicators: CountryIndicatorSnapshot | null;
  events: GeopoliticalEvent[];
  research: PolicyResearchSource[];
  localEvidence: LocalEvidenceEntry[];
  claims: VerifiedClaim[];
  tacticalSummary: string[];
  confidence: "high" | "medium" | "low";
  freshness: "recent" | "mixed" | "stale";
  sourceTrace: SourceMetadata[];
}

export interface SourceIntelOptions {
  simulationYear?: number;
  maxEvents?: number;
  maxResearch?: number;
}

function eventYear(event: GeopoliticalEvent): number | null {
  const match = event.date?.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function filterBySimulationYear(events: GeopoliticalEvent[], simulationYear: number): GeopoliticalEvent[] {
  return events.filter((event) => {
    const year = eventYear(event);
    return year === null || year <= simulationYear;
  });
}

function filterResearchBySimulationYear(research: PolicyResearchSource[], simulationYear: number): PolicyResearchSource[] {
  return research.filter((item) => item.year == null || item.year <= simulationYear);
}

export function toSourceIntelBrief(intel: SourceBackedCountryIntel, maxClaims = 3): string[] {
  const topClaims = intel.claims.slice(0, Math.max(1, maxClaims)).map((claim) =>
    `${claim.status} (${claim.confidence}): ${claim.claim}`
  );
  const sourceLabels = Array.from(new Set(intel.sourceTrace.map((source) => source.name))).slice(0, 5);
  return [
    `[${intel.country}] confidence=${intel.confidence}; freshness=${intel.freshness}; simulationYear=${intel.simulationYear}`,
    ...topClaims,
    `TACTICAL: ${intel.tacticalSummary.slice(0, 2).join(" ")}`,
    sourceLabels.length ? `SOURCES: ${sourceLabels.join(", ")}` : "SOURCES: limited",
  ];
}

function chooseFreshness(meta: CountryMetadata | null, indicators: CountryIndicatorSnapshot | null, events: GeopoliticalEvent[], research: PolicyResearchSource[]): SourceBackedCountryIntel["freshness"] {
  const statuses = [meta?.freshness.cacheStatus, indicators?.freshness.cacheStatus, events[0]?.freshness.cacheStatus, research[0]?.freshness.cacheStatus]
    .filter(Boolean) as string[];
  if (!statuses.length) return "stale";
  if (statuses.some((s) => s === "stale" || s === "error")) return "mixed";
  if (statuses.every((s) => s === "live" || s === "cached")) return "recent";
  return "mixed";
}

function chooseConfidence(claims: VerifiedClaim[]): SourceBackedCountryIntel["confidence"] {
  const high = claims.filter((c) => c.confidence === "high").length;
  const medium = claims.filter((c) => c.confidence === "medium").length;
  if (high >= 3) return "high";
  if (high + medium >= 3) return "medium";
  return "low";
}

function buildGdeltQuery(country: string, normalized: NormalizedAgenda): string {
  return `"${country}" AND (${agendaKeywordQuery(normalized) || "United Nations OR diplomacy"} OR "${normalized.rawAgenda}")`;
}

function buildOpenAlexQuery(country: string, normalized: NormalizedAgenda): string {
  return `${country} "${normalized.rawAgenda}" ${normalized.keywords.slice(0, 3).join(" ")} foreign policy`;
}

function sourceLookup(profile: CountrySourceProfile, predicate: (s: SourceDefinition) => boolean): SourceDefinition[] {
  return [
    ...profile.officialSources,
    ...profile.multilateralSources,
    ...profile.analysisSources,
    ...profile.fallbackSources,
  ].filter(predicate);
}

export async function buildSourceBackedCountryIntel(
  country: string,
  agenda: string,
  options: SourceIntelOptions = {},
): Promise<SourceBackedCountryIntel> {
  const simulationYear = options.simulationYear ?? 2013;
  const normalized = normalizeAgenda(agenda);
  const profile = getCountrySourceProfile(country, simulationYear);

  const metaResult = await getCountryMetadata(country);
  const meta = metaResult.success ? metaResult.data || null : metaResult.staleData || null;

  const indicatorResult = meta?.iso3 ? await getCountryIndicators(meta.iso3) : null;
  const indicators = indicatorResult?.success ? indicatorResult.data || null : indicatorResult?.staleData || null;

  const [gdeltResult, researchResult] = await Promise.all([
    searchGdeltEvents(buildGdeltQuery(country, normalized)),
    searchOpenAlexWorks(buildOpenAlexQuery(country, normalized), options.maxResearch ?? 6),
  ]);
  const events = (gdeltResult.success ? gdeltResult.data : gdeltResult.staleData) || [];
  const research = (researchResult.success ? researchResult.data : researchResult.staleData) || [];
  const filteredEvents = filterBySimulationYear(events, simulationYear);
  const filteredResearch = filterResearchBySimulationYear(research, simulationYear);

  const claims: VerifiedClaim[] = [];
  const localEvidence = getLocalEvidence(country, simulationYear);

  if (meta) {
    claims.push(classifyClaim(
      `${country} official identity: region=${meta.region || "unknown"}; subregion=${meta.subregion || "unknown"}; capital=${meta.capital || "unknown"}`,
      sourceLookup(profile, (s) => s.category === "official" || s.category === "un"),
      { official: true },
    ));
  }
  if (indicators?.gdpNominal) {
    claims.push(classifyClaim(
      `${country} macro capacity on "${normalized.rawAgenda}" includes GDP ${Math.round(indicators.gdpNominal)} and GDP per capita ${Math.round(indicators.gdpPerCapita || 0)}.`,
      sourceLookup(profile, (s) => s.usagePurpose === "macro_data"),
    ));
  }
  if (filteredEvents.length) {
    claims.push(classifyClaim(
      `${country} has ${filteredEvents.length} event signals on "${normalized.rawAgenda}" within simulation-year bounds; treat as event signal, not official doctrine.`,
      sourceLookup(profile, (s) => s.usagePurpose === "event_signal"),
      { propagandaRisk: true },
    ));
  }
  if (filteredResearch.length) {
    claims.push(classifyClaim(
      `${country} has ${filteredResearch.length} research/analysis references relevant to "${normalized.rawAgenda}" within simulation-year bounds (OpenAlex-backed).`,
      sourceLookup(profile, (s) => s.usagePurpose === "analysis"),
      { disputed: false },
    ));
  }
  if (localEvidence.length) {
    localEvidence.slice(0, 3).forEach((entry) => {
      claims.push(classifyClaim(
        `[Curated dossier] ${entry.claim}`,
        sourceLookup(profile, (s) => s.id === "az-curated-dossier-2013"),
      ));
    });
  }
  if (events.length !== filteredEvents.length || research.length !== filteredResearch.length) {
    claims.push(classifyClaim(
      `Timeline filter removed ${events.length - filteredEvents.length} event signal(s) and ${research.length - filteredResearch.length} research item(s) after ${simulationYear}.`,
      sourceLookup(profile, (s) => s.category === "un" || s.category === "official"),
      { stale: true },
    ));
  }

  const yearViolations = detectSimulationYearViolations(
    [
      ...filteredEvents.slice(0, 4).map((e) => `${e.date} ${e.title}`),
      ...filteredResearch.slice(0, 4).map((r) => `${r.year || ""} ${r.title}`),
    ].join("\n"),
    simulationYear,
  );
  if (yearViolations.length) {
    claims.push(classifyClaim(
      `Timeline constraint warning: ${yearViolations.join("; ")}`,
      sourceLookup(profile, (s) => s.category === "fallback" || s.category === "wire"),
      { stale: true },
    ));
  }

  const tacticalSummary: string[] = [
    `Use sovereignty and territorial integrity framing first for ${country} unless committee evidence contradicts it.`,
    `Anchor factual claims to official and UN sources before using event-wire narratives.`,
    `Ask for clause-specific commitment, not rhetorical support, before counting ${country} as sponsor support.`,
  ];
  if (localEvidence.length) {
    tacticalSummary.push("Local curated dossier context is active as supporting evidence; cross-check high-impact claims against official/UN sources before treating them as definitive.");
  }
  if (filteredEvents.length > 0) tacticalSummary.push("Treat media volatility as pressure context only; do not overfit tactical decisions to one signal cycle.");
  if (!indicators) tacticalSummary.push("Macroeconomic data is partial; lower confidence for burden-sharing claims.");

  const sourceTrace = [
    meta?.source,
    indicators?.source,
    gdeltResult.source,
    researchResult.source,
    ...(localEvidence.length
      ? [{
        name: "Azerbaijan 2013 Curated Dossier (local evidence)",
        endpoint: "local://evidence/azerbaijan-2013-dossier",
        fetchedAt: new Date().toISOString(),
        license: "User-provided committee preparation material",
      }]
      : []),
  ].filter(Boolean) as SourceMetadata[];

  return {
    country,
    simulationYear,
    agenda: normalized.rawAgenda,
    sourceProfile: profile,
    metadata: meta,
    indicators,
    events: filteredEvents.slice(0, options.maxEvents ?? 8),
    research: filteredResearch.slice(0, options.maxResearch ?? 6),
    localEvidence,
    claims,
    tacticalSummary,
    confidence: chooseConfidence(claims),
    freshness: chooseFreshness(meta, indicators, filteredEvents, filteredResearch),
    sourceTrace,
  };
}
