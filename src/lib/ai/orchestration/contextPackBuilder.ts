import type { ContextPack, StoredCommittee } from "../../../types";
import { buildSessionContext } from "../../strategic-context";
import type { StrategicContextSnapshot, StrategicMode } from "../../strategic-context";

export interface StrategicContextPack {
  context: ContextPack;
  pinnedMemory: string[];
  recentSessionMemory: string[];
  activeClauses: string[];
  negotiationSummary: string[];
  blocSummary: string[];
  sourcePolicy: string;
  strategicSnapshot: StrategicContextSnapshot;
}

export function buildStrategicContextPack(committee: StoredCommittee, mode?: StrategicMode): StrategicContextPack {
  const ctx = committee.contextPack;
  const strategicSnapshot = buildSessionContext(committee, mode);
  return {
    context: ctx,
    pinnedMemory: committee.memories.slice(0, 8),
    recentSessionMemory: committee.timeline.slice(0, 12).map((event) => `${event.title}: ${event.description}`),
    activeClauses: committee.clauses.slice(0, 8).map((clause) => `${clause.type.toUpperCase()}: ${clause.text}`),
    negotiationSummary: committee.negotiations.slice(0, 10).map((neg) =>
      `${neg.country}: status=${neg.status}; demands=${neg.demands.join(", ") || "none"}; concessions=${neg.concessions.join(", ") || "none"}; risks=${neg.risks.join(", ") || "none"}`
    ),
    blocSummary: committee.blocEntries.slice(0, 30).map((entry) =>
      `${entry.country}: stance=${entry.stance}; support=${entry.supportLevel}; risk=${entry.riskLevel}; contact=${entry.contactStatus}; notes=${entry.notes || "none"}`
    ),
    sourcePolicy: "Separate FACT, INFERENCE, PROJECTION, CONTRADICTION, STRATEGIC RECOMMENDATION, and UNCERTAIN claims. Lower confidence when evidence is sparse.",
    strategicSnapshot,
  };
}
