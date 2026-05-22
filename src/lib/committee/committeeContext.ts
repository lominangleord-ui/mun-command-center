import type { ContextPack } from "../../types";

export const COMMITTEE_SIMULATION_YEAR = 2013;

export const CHAIR_STYLE_EXPECTATIONS = [
  "Reward logic, factual precision, and structured disruption over loud rhetoric.",
  "Encourage shrewd coalition behavior and tactical manipulation without dishonesty.",
  "Penalize factual inaccuracies, mandate confusion, and empty grandstanding.",
];

export const POINTS_PRECEDENCE = [
  "Point of Personal Privilege (highest precedence)",
  "Point of Parliamentary Inquiry",
  "Point of Order",
  "Point of Information",
  "Right to Reply",
];

export const YIELD_OPTIONS = [
  "Yield to Points of Information",
  "Yield to the Chair",
  "Yield to another Delegate",
];

export const FORMAL_VOTING_OPTIONS = [
  "Yes",
  "No",
  "Yes with Rights",
  "No with Rights",
  "Abstain",
  "Pass",
];

export const PAPERWORK_RULES = [
  "Position Paper, Press Release, Presidential Statement, Working Paper, Draft Resolution, Communique, Directive.",
  "Draft Resolution requires strict structure; preambulatory clauses end with commas, operative clauses with semicolons, final clause with period.",
  "Amendment types: addition, deletion, modification; protect wording stability before vote.",
];

export const COMMITTEE_DEBATE_FORMATS = {
  gsl: {
    label: "General Speakers' List",
    type: "formal",
    rules: [
      "Default formal debate format.",
      "Typical speaker time is 90 or 120 seconds.",
      "Moderated/round-robin per-speaker time should not exceed GSL speaker time.",
    ],
  },
  ssl: {
    label: "Special Speakers' List",
    type: "crisis",
    rules: [
      "Crisis/update response track.",
      "Per-speaker time must stay below GSL time.",
      "No total time cap; return to GSL after completion.",
    ],
  },
  moderated: {
    label: "Moderated Caucus",
    type: "informal",
    rules: [
      "Requires total time + per-speaker time + topic.",
      "Per-speaker time should divide total time cleanly.",
      "Mover can speak first or reserve right to speak.",
    ],
  },
  unmoderated: {
    label: "Unmoderated Caucus",
    type: "informal",
    rules: [
      "No per-speaker time.",
      "Used for lobbying, coalition building, and drafting.",
      "Extension should be half original time or less.",
    ],
  },
  roundRobin: {
    label: "Round Robin",
    type: "informal",
    rules: [
      "Alphabetical order.",
      "No reserving right to speak.",
      "Per-speaker time must be less than or equal to GSL time.",
    ],
  },
  openFloor: {
    label: "Open Floor",
    type: "informal",
    rules: [
      "No per-speaker cap.",
      "Requires total time and topic.",
      "Use for spontaneous tactical exchange.",
    ],
  },
} as const;

export const COMMITTEE_MOTIONS = {
  openDebate: "The delegate of [country] would like to raise the motion to open debate.",
  setAgenda: "The delegate of [country] would like to raise the motion to set the agenda, the agenda being [agenda].",
  suspendCommittee: "The delegate of [country] would like to raise the motion to suspend the committee.",
  adjournCommittee: "The delegate of [country] would like to raise the motion to adjourn the committee.",
  extendMotion: "The delegate of [country] would like to raise the motion to extend the [form of debate] by [<=50% of original time].",
} as const;

export const COMMITTEE_RULE_HIERARCHY = [
  "Chair instruction takes precedence when explicitly given.",
  "Then apply committee procedure and handbook constraints.",
  "Then choose the highest strategic value move for country/bloc/draft.",
  "Then ensure clear and non-chaotic execution.",
];

export const DEBATE_FORMAT_RULES = [
  "GSL is the default formal track; SSL is crisis-use and speaker time stays below GSL.",
  "Moderated caucus requires topic + total time + speaker time and speaker time should not exceed GSL.",
  "Unmoderated caucus is for negotiation/drafting; Round Robin is alphabetical with no reservation right; Open Floor has no per-speaker cap.",
  "Extensions should stay at half the original duration or less.",
];

export const ROLL_CALL_AND_QUORUM_RULES = [
  "Roll call response is Present or Present and Voting.",
  "Present and Voting cannot abstain on final paperwork and cannot switch later.",
  "Quorum baseline is one-tenth of committee strength (delegation count in double-delegate committees).",
];

export const MOTION_AND_VOTING_RULES = [
  "Procedural motions use placard voting and simple majority (50% + 1).",
  "Formal paperwork uses roll-call voting in three rounds.",
  "During voting procedure, only Point of Personal Privilege is in order.",
];

export const AZERBAIJAN_2013_STRATEGY_CONSTRAINTS = [
  "Frame as sovereignty-first, anti-fragmentation, anti-proxy, and state-integrity focused.",
  "Prioritize border security, non-state actor containment, and governance restoration language.",
  "Use bridge-state diplomacy: stay tactically flexible across blocs without policy contradiction.",
  "Press factual inconsistencies through POIs/chits; avoid speculative or post-2013 claims.",
  "Prefer enforceable, realistic clause language over maximalist but non-implementable text.",
];

export function canonicalImportantRules(): string[] {
  return [
    `Simulation year locked to ${COMMITTEE_SIMULATION_YEAR}; reject post-${COMMITTEE_SIMULATION_YEAR} claims.`,
    ...COMMITTEE_RULE_HIERARCHY,
    ...ROLL_CALL_AND_QUORUM_RULES,
    ...MOTION_AND_VOTING_RULES,
    ...DEBATE_FORMAT_RULES,
    ...CHAIR_STYLE_EXPECTATIONS,
  ];
}

export function mergeCanonicalRules(existing: string[]): string[] {
  return Array.from(new Set([...canonicalImportantRules(), ...existing.filter(Boolean)]));
}

export function delegationStrategyConstraints(country: string): string[] {
  if (country.trim().toLowerCase() !== "azerbaijan") return [];
  return AZERBAIJAN_2013_STRATEGY_CONSTRAINTS;
}

export function buildCommitteeContextBrief(ctx: ContextPack): string {
  const delegationConstraints = delegationStrategyConstraints(ctx.country);
  return [
    `Committee timeline: ${ctx.simulationYearSource === "chair_override" ? `${ctx.simulationYear} by chair override` : `${COMMITTEE_SIMULATION_YEAR} only`}.`,
    ...COMMITTEE_RULE_HIERARCHY,
    ...CHAIR_STYLE_EXPECTATIONS,
    ...ROLL_CALL_AND_QUORUM_RULES,
    ...MOTION_AND_VOTING_RULES,
    ...DEBATE_FORMAT_RULES,
    ...delegationConstraints,
  ].join(" ");
}
