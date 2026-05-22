import type { StoredCommittee } from "../../../types";

export function compressCommitteeMemory(committee: StoredCommittee): string {
  const ctx = committee.contextPack;
  const recent = committee.timeline.slice(0, 8).map((event) => `${event.title}: ${event.description}`);
  const negotiations = committee.negotiations.slice(0, 6).map((neg) =>
    `${neg.country} ${neg.status}; promises=${neg.promises.join(", ") || "none"}; follow-up=${neg.followUpActions.join(", ") || "none"}`
  );
  return [
    `Delegate: ${ctx.country || "unset"} in ${ctx.committee || "committee unset"}`,
    `Agenda: ${ctx.agenda || "unset"}`,
    `Phase: ${ctx.current_phase}; goal: ${ctx.active_goal || "none"}; next action: ${ctx.next_action_needed || "none"}`,
    `Allies: ${ctx.allies.join(", ") || "none"}; opponents: ${ctx.opponents.join(", ") || "none"}`,
    `Recent events: ${recent.join(" | ") || "none"}`,
    `Negotiations: ${negotiations.join(" | ") || "none"}`,
  ].join("\n");
}
