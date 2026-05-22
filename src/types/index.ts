export type CommitteePhase =
  | "roll_call" | "agenda_setting" | "opening_speeches" | "moderated_caucus"
  | "unmoderated_caucus" | "drafting" | "amendment" | "voting";

export const PHASE_LABELS: Record<CommitteePhase, string> = {
  roll_call: "Roll Call", agenda_setting: "Agenda Setting", opening_speeches: "Opening Speeches",
  moderated_caucus: "Moderated Caucus", unmoderated_caucus: "Unmoderated Caucus",
  drafting: "Drafting", amendment: "Amendment", voting: "Voting Procedure",
};

export interface ContextPack {
  committee: string; agenda: string; country: string; role: string;
  current_phase: CommitteePhase; bloc: string; allies: string[]; opponents: string[];
  active_goal: string; important_rules: string[]; latest_updates: string[]; next_action_needed: string;
  simulationYear: number;
  simulationYearSource: "default_2013" | "chair_override";
  committeeSize: number;                  // Total voting members (UNGA=193, UNSC=15)
  committeeType: "unga" | "unsc" | "unhrc" | "unodc" | "who" | "other";
  delegateMode: "double";
  delegateRole: "floor" | "drafter" | "unassigned";
  partnerName: string;
}

export interface PositionPaper {
  corePosition: string;
  keyPolicies: string[];
  nonNegotiables: string[];
  openToCompromise: string[];
  priorResolutions: string[];
  suggestedLanguage: string[];
}

export interface AgentRequest { task: string; context: ContextPack; extra?: string; }
export interface AgentResponse { answer: string; confidence: "high" | "medium" | "low"; reasons: string[]; follow_up_actions: string[]; }
export type AgentName = "SessionLead" | "RuleForge" | "BlocMap" | "SpeechForge" | "ClauseSmith" | "VoteCalc" | "NoteScribe" | "IntelLens" | "MemoryCore";

export const AGENT_META: Record<AgentName, { icon: string; color: string; description: string }> = {
  SessionLead: { icon: "👔", color: "from-violet-500 to-purple-600", description: "Manager" },
  RuleForge: { icon: "⚖️", color: "from-amber-500 to-orange-600", description: "Rules" },
  BlocMap: { icon: "🗺️", color: "from-emerald-500 to-teal-600", description: "Strategy" },
  SpeechForge: { icon: "🎤", color: "from-blue-500 to-indigo-600", description: "Speeches" },
  ClauseSmith: { icon: "📝", color: "from-rose-500 to-pink-600", description: "Clauses" },
  VoteCalc: { icon: "📊", color: "from-cyan-500 to-sky-600", description: "Votes" },
  NoteScribe: { icon: "📋", color: "from-lime-500 to-green-600", description: "Notes" },
  IntelLens: { icon: "🔍", color: "from-fuchsia-500 to-purple-600", description: "Research" },
  MemoryCore: { icon: "🧠", color: "from-slate-500 to-gray-600", description: "Memory" },
};

export interface Speech { id: string; type: "opening" | "moderated" | "rebuttal" | "closing"; topic: string; content: string; shortVersion?: string; strongVersion?: string; createdAt: number; }
export interface Clause { id: string; type: "preambulatory" | "operative"; text: string; status: "draft" | "proposed" | "accepted" | "amended" | "rejected"; amendments: string[]; createdAt: number; }
export type RelationshipLabel = "strong_ally" | "likely_ally" | "neutral" | "uncertain" | "opponent";
export const REL_META: Record<RelationshipLabel, { label: string; color: string; bg: string; border: string; dot: string; fill: string }> = {
  strong_ally: { label: "Strong Ally", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40", dot: "#10b981", fill: "#10b981" },
  likely_ally: { label: "Likely Ally", color: "text-green-300", bg: "bg-green-500/10", border: "border-green-500/40", dot: "#22c55e", fill: "#22c55e" },
  neutral:     { label: "Neutral",     color: "text-gray-300",   bg: "bg-gray-500/10",   border: "border-gray-500/40",   dot: "#9ca3af", fill: "#9ca3af" },
  uncertain:   { label: "Swing",       color: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-500/40",  dot: "#f59e0b", fill: "#f59e0b" },
  opponent:    { label: "Opponent",    color: "text-red-300",    bg: "bg-red-500/10",    border: "border-red-500/40",    dot: "#ef4444", fill: "#ef4444" },
};

export type Stance = "ally" | "opponent" | "swing" | "neutral";

export function stanceToRel(stance: Stance, support: number): RelationshipLabel {
  if (stance === "ally") return support >= 70 ? "strong_ally" : "likely_ally";
  if (stance === "opponent") return "opponent";
  if (stance === "swing") return "uncertain";
  return "neutral";
}

export function relToStance(rel: RelationshipLabel): Stance {
  if (rel === "strong_ally" || rel === "likely_ally") return "ally";
  if (rel === "opponent") return "opponent";
  if (rel === "uncertain") return "swing";
  return "neutral";
}

export function relToSupport(rel: RelationshipLabel): number {
  return ({ strong_ally: 85, likely_ally: 65, neutral: 50, uncertain: 40, opponent: 15 } as const)[rel];
}

export interface BlocEntry {
  id: string;
  country: string;
  stance: Stance;
  supportLevel: number;
  riskLevel: number;
  notes: string;
  contactStatus: "none" | "contacted" | "negotiating" | "committed";
  bloc?: string;
  visible?: boolean;
  updatedAt: number;
}

export interface Note { id: string; raw: string; compressed: string; actionItems: string[]; decisions: string[]; createdAt: number; }
export interface Resolution { id: string; title: string; preambulatoryClauses: string[]; operativeClauses: string[]; version: number; createdAt: number; }

export type TimelineEventType =
  | "relationship" | "draft" | "export" | "import" | "action" | "system"
  | "alert" | "snapshot" | "negotiation" | "intelligence" | "memory" | "vote";

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: TimelineEventType;
  title: string;
  description: string;
  icon?: string;
}

export interface StrategicAlert {
  id: string;
  timestamp: number;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  dismissed: boolean;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  name: string;
  state: SnapshotState;
}

export interface SnapshotState {
  contextPack: ContextPack;
  speeches: Speech[];
  clauses: Clause[];
  blocEntries: BlocEntry[];
  notes: Note[];
  resolutions: Resolution[];
  timeline: TimelineEvent[];
  alerts: StrategicAlert[];
  negotiations: NegotiationState[];
  countryIntel: CountryIntel[];
  memories: string[];
}

export interface CountryIntel {
  country: string;
  ideology: string;
  strategicInterests: string[];
  allies: string[];
  rivals: string[];
  dependencies: string[];
  regionalConcerns: string[];
  votingTendencies: string;
  diplomacyNotes: string;
  riskLevel: number;
  supportLevel: number;
}

export interface CountryStrategicSummary {
  country: string;
  overallPosture: string;
  agendaRelevance: string;
  diplomaticOrientation: string;
  economicSignal: string;
  negotiationStyle: string;
  strategicRisk: string;
  confidence: "low" | "medium" | "high";
  sources: { label: string; inferenceLevel: "factual" | "inferred" | "predicted" }[];
  freshness: FreshnessInfo;
}

export interface NegotiationState {
  id: string;
  country: string;
  demands: string[];
  concessions: string[];
  redLines: string[];
  promises: string[];
  talkingPoints: string[];
  risks: string[];
  targetFraming: string;
  followUpActions: string[];
  status: "idle" | "active" | "stalled" | "successful" | "failed";
  updatedAt: number;
}

export interface ClauseImpact {
  countriesGained: number;
  countriesLost: number;
  amendmentRisk: number;
  sponsorProbability: number;
  blocReaction: string;
  voteConfidence: number;
  likelyObjections: string[];
  diplomaticToneRisk: number;
}

export interface BlocStability {
  cohesion: number;
  rebellionRisk: number;
  swingInstability: number;
  confidenceScore: number;
  trend: "rising" | "stable" | "falling";
  recentChanges: string[];
}

export type ViewMode = "tactical" | "drafting" | "diplomacy" | "voting" | "compact" | "presentation";

export interface SourceMetadata {
  name: string;
  endpoint: string;
  fetchedAt: string;
  license?: string;
}

export interface FreshnessInfo {
  fetchedAt: string;
  lastUpdated?: string;
  cacheStatus: "fresh" | "cached" | "stale" | "error" | "unavailable";
  ttlMs?: number;
  ageMs?: number;
}

export interface StoredCommittee {
  id: string;
  contextPack: ContextPack;
  speeches: Speech[];
  clauses: Clause[];
  blocEntries: BlocEntry[];
  notes: Note[];
  resolutions: Resolution[];
  timeline: TimelineEvent[];
  alerts: StrategicAlert[];
  snapshots: Snapshot[];
  negotiations: NegotiationState[];
  countryIntel: CountryIntel[];
  memories: string[];
  positionPaper: PositionPaper;
  createdAt: number;
  updatedAt: number;
}

export interface CountryStrategicSummary {
  country: string;
  overallPosture: string;
  agendaRelevance: string;
  diplomaticOrientation: string;
  economicSignal: string;
  negotiationStyle: string;
  strategicRisk: string;
  confidence: "low" | "medium" | "high";
  sources: { label: string; inferenceLevel: "factual" | "inferred" | "predicted" }[];
  freshness: FreshnessInfo;
}

export interface SourcedBlocTrend {
  id: string;
  label: string;
  direction: "strengthening" | "weakening" | "volatile" | "stable";
  rationale: string;
  inferenceLevel: "factual" | "inferred" | "predicted";
  confidence: "low" | "medium" | "high";
  supportingEvents: string[];
  sources: { label: string; inferenceLevel: "factual" | "inferred" | "predicted" }[];
}

export interface TacticalBriefingExport {
  version: "1.0";
  generatedAt: string;
  committee: string;
  agenda: string;
  executiveSummary: string;
  countryBriefs: CountryStrategicSummary[];
  blocTrends: SourcedBlocTrend[];
  geopoliticalContext: string;
  actionableRecommendations: string[];
  sources: SourceMetadata[];
  freshness: FreshnessInfo[];
}

// Bug 5 fix: case-insensitive normalization for context allies/opponents
const normalizeList = (list: string[]): string[] => {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return item;
  });
};

export function syncContextFromEntries(pack: ContextPack, entries: BlocEntry[]): ContextPack {
  const allies = entries.filter((e) => e.stance === "ally").map((e) => e.country);
  const opponents = entries.filter((e) => e.stance === "opponent").map((e) => e.country);
  return {
    ...pack,
    allies: normalizeList([
      ...allies,
      ...pack.allies.filter((a) => !entries.find((e) => e.country.toLowerCase() === a.toLowerCase())),
    ]),
    opponents: normalizeList([
      ...opponents,
      ...pack.opponents.filter((o) => !entries.find((e) => e.country.toLowerCase() === o.toLowerCase())),
    ]),
  };
}
