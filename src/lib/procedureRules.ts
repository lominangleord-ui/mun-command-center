import type { BlocEntry, Clause, CommitteePhase, ContextPack } from "../types";
import {
  COMMITTEE_SIMULATION_YEAR,
  FORMAL_VOTING_OPTIONS,
  PAPERWORK_RULES,
  POINTS_PRECEDENCE,
  YIELD_OPTIONS,
  CHAIR_STYLE_EXPECTATIONS,
  ROLL_CALL_AND_QUORUM_RULES,
  DEBATE_FORMAT_RULES as CANONICAL_DEBATE_RULES,
  MOTION_AND_VOTING_RULES,
} from "./committee/committeeContext";

export type DebateFormatId =
  | "general_speakers_list"
  | "special_speakers_list"
  | "moderated_caucus"
  | "unmoderated_caucus"
  | "round_robin"
  | "open_floor"
  | "paperwork_qna"
  | "for_against"
  | "clause_by_clause";

export interface DebateFormatRule {
  id: DebateFormatId;
  label: string;
  tacticalUse: string;
  constraints: string[];
  motionTemplate: string;
}

export interface ProcedureModel {
  quorumNeeded: number;
  simpleMajorityNeeded: number;
  formalPaperworkVotesNeeded: number;
  knownDelegations: number;
  quorumMet: boolean;
  abstentionLockedByPresentAndVoting: boolean;
  timelinePolicy: string;
  votingNotes: string[];
  votingOptions: string[];
  amendmentNotes: string[];
  pointsPrecedence: string[];
  yieldOptions: string[];
  paperworkRules: string[];
  recommendedFormat: DebateFormatRule;
  phaseAdvice: string;
  immediateWarnings: string[];
}

export const DEBATE_FORMAT_RULES: Record<DebateFormatId, DebateFormatRule> = {
  general_speakers_list: {
    id: "general_speakers_list",
    label: "General Speakers List",
    tacticalUse: "Use this to anchor policy, mark red lines, and invite allies before informal debate begins.",
    constraints: [
      "Only formal debate track in this handbook.",
      "Speaker time is usually 90 or 120 seconds.",
      "Other informal per-speaker times should not exceed the GSL speaker time.",
      "The committee returns to this track when informal debate exhausts.",
    ],
    motionTemplate: "Move to enter the General Speakers List, per-speaker time being [seconds].",
  },
  special_speakers_list: {
    id: "special_speakers_list",
    label: "Special Speakers List",
    tacticalUse: "Use for a crisis or update when you need fast, controlled public positioning.",
    constraints: [
      "Used for immediate crises or updates.",
      "Per-speaker time must be less than GSL speaker time.",
      "No total speaker time; committee returns to GSL afterward.",
    ],
    motionTemplate: "Move to suspend formal debate and enter a Special Speakers List, per-speaker time being [seconds].",
  },
  moderated_caucus: {
    id: "moderated_caucus",
    label: "Moderated Caucus",
    tacticalUse: "Use to force a narrow issue, test bloc reactions, and surface named objections before drafting.",
    constraints: [
      "Needs total time, per-speaker time, and topic.",
      "Per-speaker time should divide total time into a whole number of speakers.",
      "Mover may speak first or reserve the right to speak.",
    ],
    motionTemplate: "Move to suspend formal debate and enter a moderated caucus, total time [minutes], per-speaker time [seconds], topic [topic].",
  },
  unmoderated_caucus: {
    id: "unmoderated_caucus",
    label: "Unmoderated Caucus",
    tacticalUse: "Use when coalition building, sponsor bargaining, or clause drafting needs private movement.",
    constraints: [
      "No per-speaker time.",
      "Best when formal consensus is stuck.",
      "Extension should usually be half the original duration or less.",
    ],
    motionTemplate: "Move to suspend formal debate and enter an unmoderated caucus, total time [minutes].",
  },
  round_robin: {
    id: "round_robin",
    label: "Round Robin",
    tacticalUse: "Use after a crisis to force every delegation to reveal a position in sequence.",
    constraints: [
      "Alphabetical order.",
      "Delegates may refrain from speaking.",
      "The mover cannot reserve the right to speak.",
      "Per-speaker time cannot exceed the GSL speaker time.",
    ],
    motionTemplate: "Move to suspend formal debate and enter a Round Robin, per-speaker time [seconds], topic [topic].",
  },
  open_floor: {
    id: "open_floor",
    label: "Open Floor",
    tacticalUse: "Use for spontaneous pressure when the committee needs fast public exchange without a speaker list.",
    constraints: [
      "No per-speaker time.",
      "Requires total time and topic.",
      "More volatile than a moderated caucus; use when you can handle interruptions.",
    ],
    motionTemplate: "Move to suspend formal debate and enter an Open Floor, total time [minutes], topic [topic].",
  },
  paperwork_qna: {
    id: "paperwork_qna",
    label: "Paperwork Q&A",
    tacticalUse: "Use to interrogate authors and expose implementation holes or policy contradictions.",
    constraints: [
      "Questions target the full paperwork.",
      "For multiple authors, questions can be directed to a specific author.",
      "Best before a vote when the opposition needs public record.",
    ],
    motionTemplate: "Move into a Question and Answer session of [number] questions on [document].",
  },
  for_against: {
    id: "for_against",
    label: "For/Against Debate",
    tacticalUse: "Use for a fast binary contrast when your side has cleaner speakers than the other bloc.",
    constraints: [
      "Alternating speeches for and against the document.",
      "Support side goes first.",
      "Questions are unavailable unless the Executive Board allows them.",
    ],
    motionTemplate: "Move into a [X] for [X] against debate discussing [document].",
  },
  clause_by_clause: {
    id: "clause_by_clause",
    label: "Clause-by-Clause",
    tacticalUse: "Use to slow a dangerous draft, isolate weak clauses, or protect your own text from blanket rejection.",
    constraints: [
      "Each clause is discussed individually.",
      "Authors read clauses and answer questions.",
      "Points of Order and Points of Information may be raised.",
      "Lengthy format; use only when granular control matters.",
    ],
    motionTemplate: "Move into a clause-by-clause discussion on [document].",
  },
};

function oneTenthQuorum(total: number): number {
  return Math.max(1, Math.ceil(total / 10));
}

function twoThirds(total: number): number {
  return Math.ceil(total * (2 / 3));
}

function simpleMajority(total: number): number {
  return Math.floor(total / 2) + 1;
}

function chooseRecommendedFormat(ctx: ContextPack, entries: BlocEntry[], clauses: Clause[]): DebateFormatRule {
  const opponents = entries.filter((e) => e.stance === "opponent").length;
  const swings = entries.filter((e) => e.stance === "swing" || (e.supportLevel > 35 && e.supportLevel < 65)).length;
  const draftReady = clauses.some((clause) => clause.status === "proposed" || clause.status === "accepted");

  if (ctx.current_phase === "roll_call" || ctx.current_phase === "agenda_setting") return DEBATE_FORMAT_RULES.general_speakers_list;
  if (ctx.current_phase === "opening_speeches") return DEBATE_FORMAT_RULES.moderated_caucus;
  if (ctx.current_phase === "moderated_caucus" && swings >= 2) return DEBATE_FORMAT_RULES.unmoderated_caucus;
  if (ctx.current_phase === "unmoderated_caucus" && draftReady) return DEBATE_FORMAT_RULES.paperwork_qna;
  if (ctx.current_phase === "drafting") return opponents > 2 ? DEBATE_FORMAT_RULES.clause_by_clause : DEBATE_FORMAT_RULES.paperwork_qna;
  if (ctx.current_phase === "amendment") return DEBATE_FORMAT_RULES.clause_by_clause;
  if (ctx.current_phase === "voting") return DEBATE_FORMAT_RULES.for_against;
  return DEBATE_FORMAT_RULES.moderated_caucus;
}

function phaseAdvice(ctx: ContextPack, recommended: DebateFormatRule): string {
  const phase: Record<CommitteePhase, string> = {
    roll_call: "Confirm whether your delegation is present or present and voting; present and voting removes abstention as a final-paper option.",
    agenda_setting: "Get the agenda formally set before investing in caucus motions; use early speeches to make the issue frame favorable.",
    opening_speeches: "Use GSL time to define policy and red lines, then move into a narrow moderated caucus that exposes swing-state conditions.",
    moderated_caucus: "If the discussion is generating useful named objections, extend by half or less; if it is repeating, shift to an unmoderated caucus.",
    unmoderated_caucus: "Convert verbal support into sponsor conditions, written clause edits, and follow-up owners before time expires.",
    drafting: "Choose paperwork discussion format tactically: Q&A for pressure, for/against for speed, clause-by-clause for granular control.",
    amendment: "Treat every preambulatory amendment as existential and count operative amendments against the two-thirds scrapping threshold.",
    voting: "Before roll-call voting, lock final positions; only Point of Personal Privilege can interrupt voting procedure.",
  };
  return `${phase[ctx.current_phase]} Recommended motion lane: ${recommended.label}.`;
}

export function buildProcedureModel(ctx: ContextPack, entries: BlocEntry[] = [], clauses: Clause[] = []): ProcedureModel {
  const total = ctx.committeeSize || 193;
  const quorumNeeded = oneTenthQuorum(total);
  const simpleMajorityNeeded = simpleMajority(total);
  const formalPaperworkVotesNeeded = twoThirds(total);
  const knownDelegations = Math.max(entries.length, ctx.country ? 1 : 0);
  const recommendedFormat = chooseRecommendedFormat(ctx, entries, clauses);
  const abstentionLockedByPresentAndVoting = ctx.latest_updates.some((item) => /present\s+and\s+voting/i.test(item));

  const immediateWarnings: string[] = [];
  if (knownDelegations < quorumNeeded) {
    immediateWarnings.push(`Quorum risk: only ${knownDelegations} tracked delegation(s), but ${quorumNeeded} are needed to formally begin.`);
  }
  if (ctx.current_phase === "voting" && abstentionLockedByPresentAndVoting) {
    immediateWarnings.push("Abstention may be unavailable for delegations marked present and voting; do not model them as abstentions.");
  }
  if (ctx.current_phase === "voting") {
    immediateWarnings.push("During roll-call voting, only Point of Personal Privilege should interrupt proceedings.");
  }
  if (ctx.current_phase === "amendment" && clauses.some((c) => c.amendments.length > 0 && c.type === "preambulatory")) {
    immediateWarnings.push("Any amended preambulatory clause can scrap the resolution under the handbook rule.");
  }

  return {
    quorumNeeded,
    simpleMajorityNeeded,
    formalPaperworkVotesNeeded,
    knownDelegations,
    quorumMet: knownDelegations >= quorumNeeded,
    abstentionLockedByPresentAndVoting,
    timelinePolicy: ctx.simulationYearSource === "chair_override"
      ? `Committee simulation timeline: chair override active at ${ctx.simulationYear}. Treat post-${ctx.simulationYear} events as out-of-scope unless chair changes the override.`
      : `Committee simulation timeline: locked to default ${COMMITTEE_SIMULATION_YEAR}. Treat post-${COMMITTEE_SIMULATION_YEAR} events as out-of-scope unless chair sets an explicit override.`,
    votingNotes: [
      "Formal paperwork uses roll-call voting in three rounds.",
      "Formal paperwork needs a two-thirds majority to pass.",
      "Motions and committee proceedings need simple majority.",
      "Observers do not vote; each country has one vote.",
      "Absent members during voting are treated as abstentions.",
      "Present and Voting delegations cannot abstain.",
      "Only Point of Personal Privilege is in order during voting.",
    ],
    votingOptions: FORMAL_VOTING_OPTIONS,
    amendmentNotes: [
      "Friendly amendments do not require committee voting.",
      "Unfriendly amendments require simple majority with no abstentions.",
      "Deleting, adding, or modifying clauses are all amendment paths.",
      "If two-thirds of operative clauses are amended, the draft is discarded.",
      "If any preambulatory clause is amended, the draft is discarded.",
    ],
    pointsPrecedence: POINTS_PRECEDENCE,
    yieldOptions: YIELD_OPTIONS,
    paperworkRules: [
      ...PAPERWORK_RULES,
      ...ROLL_CALL_AND_QUORUM_RULES,
      ...MOTION_AND_VOTING_RULES,
      ...CANONICAL_DEBATE_RULES,
      ...CHAIR_STYLE_EXPECTATIONS,
    ],
    recommendedFormat,
    phaseAdvice: phaseAdvice(ctx, recommendedFormat),
    immediateWarnings,
  };
}

export function estimateScrappingRisk(clauses: Clause[]): { risk: "low" | "medium" | "high"; explanation: string } {
  const preambAmended = clauses.some((clause) => clause.type === "preambulatory" && clause.amendments.length > 0);
  const operativeClauses = clauses.filter((clause) => clause.type === "operative");
  const amendedOperatives = operativeClauses.filter((clause) => clause.amendments.length > 0).length;
  const operativeThreshold = Math.ceil(operativeClauses.length * (2 / 3));

  if (preambAmended) {
    return { risk: "high", explanation: "At least one preambulatory clause is amended; the handbook treats that as scrapping the resolution." };
  }
  if (operativeClauses.length && amendedOperatives >= operativeThreshold) {
    return { risk: "high", explanation: `${amendedOperatives}/${operativeClauses.length} operative clauses are amended, meeting the two-thirds scrapping threshold.` };
  }
  if (operativeClauses.length && amendedOperatives >= Math.max(1, Math.floor(operativeThreshold / 2))) {
    return { risk: "medium", explanation: `${amendedOperatives}/${operativeClauses.length} operative clauses are amended; protect the remaining operative core.` };
  }
  return { risk: "low", explanation: "Current amendment count does not trigger handbook scrapping thresholds." };
}
