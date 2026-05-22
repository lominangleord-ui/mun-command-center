import type { StoredCommittee } from "../../types";
import type { NegotiationMemoryState } from "./types";

export function buildNegotiationMemory(committee: StoredCommittee): NegotiationMemoryState {
  const active = committee.negotiations.filter((n) => n.status === "active" || n.status === "idle");
  const stalled = committee.negotiations.filter((n) => n.status === "stalled" || n.status === "failed");
  return {
    activeTargets: active.map((n) => n.country).slice(0, 10),
    stalledTargets: stalled.map((n) => n.country).slice(0, 10),
    promises: committee.negotiations.flatMap((n) => n.promises.map((promise) => `${n.country}: ${promise}`)).slice(0, 12),
    unresolvedIssues: committee.negotiations.flatMap((n) => n.demands.concat(n.redLines).map((item) => `${n.country}: ${item}`)).slice(0, 14),
    reliabilityWarnings: stalled.flatMap((n) => n.risks.length ? n.risks.map((risk) => `${n.country}: ${risk}`) : [`${n.country}: stalled or failed negotiation`]).slice(0, 10),
    nextFollowUps: committee.negotiations.flatMap((n) => n.followUpActions.map((action) => `${n.country}: ${action}`)).slice(0, 10),
  };
}
