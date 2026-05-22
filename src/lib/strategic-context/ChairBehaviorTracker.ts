import type { StoredCommittee } from "../../types";
import type { ChairProfile, MemorySignal } from "./types";

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
}

export function buildChairProfile(committee: StoredCommittee, signals: MemorySignal[]): ChairProfile {
  const haystack = [
    ...committee.contextPack.important_rules,
    ...committee.contextPack.latest_updates,
    ...committee.notes.map((note) => `${note.raw} ${note.compressed}`),
    ...committee.timeline.map((event) => `${event.title} ${event.description}`),
  ].join("\n").toLowerCase();

  const strict = countMatches(haystack, [/strict/, /out of order/, /time limit/, /decorum/, /denied/, /not entertained/]);
  const flexible = countMatches(haystack, [/accepted/, /entertained/, /lenient/, /flexible/, /allowed/]);
  const aggression = countMatches(haystack, [/aggressive/, /accus/i, /direct attack/, /warning/, /unparliamentary/]);
  const paperwork = countMatches(haystack, [/format/, /signature/, /sponsor/, /amendment/, /scrap/, /submit/]);

  const strictness = Math.min(95, Math.max(25, 50 + strict * 10 - flexible * 6));
  const motionOpenness = Math.min(90, Math.max(20, 55 + flexible * 7 - strict * 5));
  const aggressionTolerance = Math.min(90, Math.max(15, 55 - aggression * 10));
  const paperworkSensitivity = Math.min(95, Math.max(30, 45 + paperwork * 7));

  return {
    strictness,
    motionOpenness,
    aggressionTolerance,
    paperworkSensitivity,
    evidence: signals.filter((signal) => /chair|motion|rule|decorum|amendment|paperwork/i.test(`${signal.label} ${signal.detail}`)).slice(0, 5),
    recommendation: strictness > 65
      ? "Use procedural language exactly and avoid aggressive POIs unless the contradiction is clean."
      : motionOpenness > 65
      ? "Use motions to shape agenda momentum before blocs settle."
      : "Keep motions conservative; build informal support before procedural escalation.",
  };
}
