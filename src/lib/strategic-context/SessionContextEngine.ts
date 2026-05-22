import type { StoredCommittee } from "../../types";
import { buildBlocRelationshipGraph } from "./BlocRelationshipGraph";
import { buildChairProfile } from "./ChairBehaviorTracker";
import { compressSignals, extractMemorySignals } from "./CommitteeStateTracker";
import { buildCountryDoctrineMemory } from "./CountryDoctrineMemory";
import { buildNegotiationMemory } from "./NegotiationMemory";
import { buildProceduralMomentum } from "./ProceduralMomentumTracker";
import { buildResolutionEvolution } from "./ResolutionEvolutionTracker";
import type { StrategicContextSnapshot, StrategicMode } from "./types";
import { COMMITTEE_SIMULATION_YEAR, buildCommitteeContextBrief, delegationStrategyConstraints } from "../committee/committeeContext";

function inferMode(committee: StoredCommittee): StrategicMode {
  const phase = committee.contextPack.current_phase;
  const goal = `${committee.contextPack.active_goal} ${committee.contextPack.next_action_needed}`.toLowerCase();
  if (/sponsor|bloc|coalition/.test(goal)) return "aggressive_bloc_builder";
  if (/swing|abstain|flip/.test(goal)) return "swing_state_manipulator";
  if (/chair|motion|procedure/.test(goal)) return "chair_friendly_diplomat";
  if (/crisis|urgent|attack|rebut/.test(goal)) return "crisis_operator";
  if (/quiet|private|bilateral/.test(goal)) return "silent_negotiator";
  if (phase === "drafting" || phase === "amendment") return "resolution_architect";
  if (phase === "voting") return "coalition_defender";
  return "chair_friendly_diplomat";
}

function inferSimulationYear(committee: StoredCommittee): number {
  const explicit = committee.contextPack.simulationYearSource === "chair_override"
    ? committee.contextPack.simulationYear
    : null;
  if (typeof explicit === "number" && explicit >= 1900 && explicit <= 2100) return explicit;
  return COMMITTEE_SIMULATION_YEAR;
}

function chooseNextMove(snapshot: Omit<StrategicContextSnapshot, "nextBestMove">): string {
  const topSwing = snapshot.relationshipGraph.find((card) => card.role.toLowerCase().includes("swing") || card.sponsorProbability >= 45);
  const highRisk = snapshot.relationshipGraph.find((card) => card.oppositionProbability >= 65 || card.bluffRisk >= 65);
  if (snapshot.proceduralMomentum.momentum === "defend_text") {
    return `Protect vulnerable wording first: ${snapshot.resolutionEvolution.draftingAdvice}`;
  }
  if (snapshot.negotiationMemory.nextFollowUps.length) {
    return `Follow up now: ${snapshot.negotiationMemory.nextFollowUps[0]}`;
  }
  if (topSwing) return `Approach ${topSwing.country}: ${topSwing.nextMove}`;
  if (highRisk) return `Do not spend first contact on ${highRisk.country}; mitigate: ${highRisk.warning}`;
  return snapshot.proceduralMomentum.recommendedMotion;
}

export function buildSessionContext(committee: StoredCommittee, mode?: StrategicMode): StrategicContextSnapshot {
  const simulationYear = inferSimulationYear(committee);
  const signals = extractMemorySignals(committee);
  const relationshipGraph = buildBlocRelationshipGraph(committee);
  const delegationConstraints = delegationStrategyConstraints(committee.contextPack.country);
  const partial = {
    generatedAt: new Date().toISOString(),
    simulationYear,
    timelineLockActive: true,
    timelineLockSource: committee.contextPack.simulationYearSource === "chair_override" ? "chair_override" as const : "default_2013" as const,
    timelinePolicy: committee.contextPack.simulationYearSource === "chair_override"
      ? `Timeline lock active at chair override year ${simulationYear}. Treat post-${simulationYear} claims as out-of-scope unless the chair resets the year.`
      : `Timeline lock active at default year ${COMMITTEE_SIMULATION_YEAR}. Treat post-${COMMITTEE_SIMULATION_YEAR} claims as out-of-scope unless the chair sets an explicit override.`,
    selectedCountry: committee.contextPack.country,
    agenda: committee.contextPack.agenda,
    committee: committee.contextPack.committee,
    phase: committee.contextPack.current_phase,
    mode: mode || inferMode(committee),
    tacticalObjective: committee.contextPack.next_action_needed || committee.contextPack.active_goal || "Win useful support without triggering red lines.",
    compressedMemory: compressSignals(signals),
    memorySignals: signals,
    relationshipGraph,
    chairProfile: buildChairProfile(committee, signals),
    proceduralMomentum: buildProceduralMomentum(committee),
    negotiationMemory: buildNegotiationMemory(committee),
    resolutionEvolution: buildResolutionEvolution(committee),
    countryDoctrineMemory: buildCountryDoctrineMemory(committee),
    sourceAndConfidencePolicy: [
      "Treat local doctrine as structured inference unless backed by source adapters.",
      "Separate FACT, INFERENCE, PROJECTION, CONTRADICTION, STRATEGIC RECOMMENDATION, and UNCERTAIN claims.",
      "Never invent country policy.",
      buildCommitteeContextBrief(committee.contextPack),
      ...delegationConstraints,
    ].join(" "),
  };
  return { ...partial, nextBestMove: chooseNextMove(partial) };
}

export class SessionContextEngine {
  build(committee: StoredCommittee, mode?: StrategicMode): StrategicContextSnapshot {
    return buildSessionContext(committee, mode);
  }
}
