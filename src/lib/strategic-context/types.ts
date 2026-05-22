import type { CommitteePhase } from "../../types";

export type StrategicMode =
  | "aggressive_bloc_builder"
  | "swing_state_manipulator"
  | "chair_friendly_diplomat"
  | "crisis_operator"
  | "silent_negotiator"
  | "resolution_architect"
  | "coalition_defender";

export interface MemorySignal {
  label: string;
  detail: string;
  weight: number;
  freshness: "recent" | "session" | "structural";
}

export interface CountryMemoryCard {
  country: string;
  role: string;
  alignmentScore: number;
  sponsorProbability: number;
  oppositionProbability: number;
  bluffRisk: number;
  whatToSay: string;
  whatToAvoid: string;
  nextMove: string;
  warning: string;
}

export interface ChairProfile {
  strictness: number;
  motionOpenness: number;
  aggressionTolerance: number;
  paperworkSensitivity: number;
  evidence: MemorySignal[];
  recommendation: string;
}

export interface ProceduralMomentum {
  phase: CommitteePhase;
  recommendedMotion: string;
  quorumMet: boolean;
  simpleMajorityNeeded: number;
  formalPaperworkVotesNeeded: number;
  scrappingRisk: "low" | "medium" | "high";
  momentum: "build_support" | "draft_quietly" | "defend_text" | "force_vote" | "slow_down";
  warnings: string[];
}

export interface ResolutionEvolution {
  activeClauseCount: number;
  amendmentPressure: number;
  vulnerableClauses: string[];
  protectedClauses: string[];
  draftingAdvice: string;
}

export interface NegotiationMemoryState {
  activeTargets: string[];
  stalledTargets: string[];
  promises: string[];
  unresolvedIssues: string[];
  reliabilityWarnings: string[];
  nextFollowUps: string[];
}

export interface StrategicContextSnapshot {
  generatedAt: string;
  simulationYear: number;
  timelineLockActive: boolean;
  timelineLockSource: "default_2013" | "chair_override";
  timelinePolicy: string;
  selectedCountry: string;
  agenda: string;
  committee: string;
  phase: CommitteePhase;
  mode: StrategicMode;
  tacticalObjective: string;
  compressedMemory: string;
  memorySignals: MemorySignal[];
  relationshipGraph: CountryMemoryCard[];
  chairProfile: ChairProfile;
  proceduralMomentum: ProceduralMomentum;
  negotiationMemory: NegotiationMemoryState;
  resolutionEvolution: ResolutionEvolution;
  countryDoctrineMemory: string[];
  sourceAndConfidencePolicy: string;
  nextBestMove: string;
}
