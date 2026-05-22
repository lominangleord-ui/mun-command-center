/**
 * Evidence-backed country intelligence dossier.
 *
 * Every assertion in a dossier must carry:
 *   – its factual basis (or be explicitly labelled INFERENCE / UNCERTAIN)
 *   – its source provenance
 *   – its freshness timestamp
 *
 * This model is the single authoritative output of the intelligence layer.
 * UI components render this model; they do not generate prose themselves.
 */

import type { SourceMetadata, FreshnessInfo } from "./api";

// ── Evidence basis labels ─────────────────────────────────────────────────────
export type EvidenceBasis = "FACT" | "INFERENCE" | "RECOMMENDATION" | "UNCERTAIN" | "CONTRADICTION";

export interface EvidenceItem {
  basis: EvidenceBasis;
  claim: string;
  sourceLabel?: string;
  sourceType?: "worldbank" | "gdelt" | "openalex" | "restcountries" | "local-tracking" | "heuristic";
  fetchedAt?: string;
}

// ── Agenda-topic classification ───────────────────────────────────────────────
export type AgendaTopic =
  | "climate" | "security" | "trade" | "health" | "technology"
  | "human-rights" | "development" | "peacekeeping" | "disarmament"
  | "reform" | "migration" | "general";

// ── Leverage and pressure signals ─────────────────────────────────────────────
export interface LeverageItem {
  category: "economic" | "security" | "sovereignty" | "development" | "regional" | "institutional" | "image";
  signal: string;
  basis: EvidenceBasis;
  sourceLabel?: string;
}

export interface PressurePoint {
  signal: string;
  basis: EvidenceBasis;
  sourceLabel?: string;
}

export interface Contradiction {
  tension: string;
  opportunity: string;
  basis: "FACT" | "INFERENCE";
  sourceLabel?: string;
}

// ── Game-theoretic projections ────────────────────────────────────────────────
export interface GameTheoryProjection {
  sponsorLikelihood: "low" | "medium" | "high";
  coSponsorLikelihood: "low" | "medium" | "high";
  abstentionRisk: "low" | "medium" | "high";
  amendmentResistance: "low" | "medium" | "high";
  compromiseProbability: "low" | "medium" | "high";
  coalitionFractureRisk: "low" | "medium" | "high";
  pressureVulnerability: "low" | "medium" | "high";
  rationale: EvidenceItem[];
}

// ── Sponsor/coalition value assessment ────────────────────────────────────────
export interface SponsorAssessment {
  role: "sponsor" | "co-sponsor" | "supporter" | "swing" | "abstain" | "block";
  confidence: "low" | "medium" | "high";
  conditions: string[];
  basis: EvidenceItem[];
}

export interface OperationalCountryRef {
  country: string;
  score: number;
  role: "sponsor" | "ally" | "swing" | "opponent" | "avoid" | "monitor";
  confidence: "low" | "medium" | "high";
  reason: string;
  nextMove: string;
}

export interface OperationalBrief {
  targetCountry: string;
  selectedCountry?: string;
  relationshipRole: OperationalCountryRef["role"];
  confidence: "low" | "medium" | "high";
  sponsorProbability: number;
  oppositionProbability: number;
  bluffRisk: number;
  allies: OperationalCountryRef[];
  rivals: OperationalCountryRef[];
  swingStates: OperationalCountryRef[];
  likelyOpponents: OperationalCountryRef[];
  sponsorTargets: OperationalCountryRef[];
  strategicInterests: string[];
  redLines: string[];
  negotiationStrategy: string[];
  whatToSay: string;
  whatToAvoid: string;
  exploitableLeverage: string;
  clauseCompatibility: string[];
  riskWarnings: string[];
  recommendedNextMove: string;
}

// ── Country intelligence dossier ─────────────────────────────────────────────
export interface CountryDossier {
  countryKey: string;
  country: string;
  agenda: string;
  agendaTopic: AgendaTopic;

  overview: EvidenceItem;
  keyFacts: EvidenceItem[];
  strategicInference: EvidenceItem[];
  blocBehaviour: EvidenceItem[];
  negotiationStrategy: EvidenceItem[];
  redLines: EvidenceItem[];
  resolutionPreferences: EvidenceItem[];
  recommendedAction: EvidenceItem;

  /** Committee dynamic modelling */
  committeeDynamics: {
    currentPhase: string;
    temperature: "polarised" | "fluid" | "rigid" | "collaborative" | "escalating";
    temperatureRationale: string;
  };

  /** Exploitable interests for negotiation leverage */
  leveragePoints: LeverageItem[];

  /** Signals that may force compromise or resistance */
  pressurePoints: PressurePoint[];

  /** Detectable inconsistencies between stated position and actual behavior */
  contradictions: Contradiction[];

  /** Committee-level projections */
  gameTheory: GameTheoryProjection;

  /** Role this country is most likely to play */
  sponsorAssessment: SponsorAssessment;

  /** Operational tactical guidance for winning the current committee round */
  operationalBrief: OperationalBrief;

  confidence: "low" | "medium" | "high";
  overallFreshness: FreshnessInfo;
  sources: SourceMetadata[];
  generatedAt: string;

  dataQuality: {
    hasLiveWorldBankData: boolean;
    hasLiveGdeltSignals: boolean;
    hasOpenAlexSources: boolean;
    hasLiveMetadata: boolean;
    hasLocalTrackingData: boolean;
  };
}
