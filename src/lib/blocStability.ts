import type { BlocStability, BlocEntry, TimelineEvent } from "../types";

export function computeBlocStability(entries: BlocEntry[], timeline: TimelineEvent[] = []): BlocStability {
  if (entries.length === 0) {
    return { cohesion: 0, rebellionRisk: 0, swingInstability: 0, confidenceScore: 0, trend: "stable", recentChanges: [] };
  }
  const allies = entries.filter((e) => e.stance === "ally");
  const opponents = entries.filter((e) => e.stance === "opponent");
  const swings = entries.filter((e) => e.stance === "swing");
  const total = entries.length;

  const avgAllySupport = allies.length ? allies.reduce((s, e) => s + e.supportLevel, 0) / allies.length : 0;
  const avgAllyRisk = allies.length ? allies.reduce((s, e) => s + e.riskLevel, 0) / allies.length : 0;

  const cohesion = Math.round((allies.length / total) * 50 + (avgAllySupport / 2));
  const rebellionRisk = Math.round((opponents.length / total) * 60 + avgAllyRisk * 0.4);
  const swingInstability = Math.round((swings.length / total) * 100);
  const confidenceScore = Math.max(0, Math.min(100, cohesion - rebellionRisk * 0.4 - swingInstability * 0.2));

  // Trend based on recent timeline events
  const recent = timeline.slice(0, 10).filter((e) => e.type === "relationship");
  const positive = recent.filter((e) => /ally|aligned|joined|supports/i.test(e.title)).length;
  const negative = recent.filter((e) => /opponent|switched|opposes|defected/i.test(e.title)).length;
  const trend: BlocStability["trend"] = positive > negative ? "rising" : negative > positive ? "falling" : "stable";

  return {
    cohesion: Math.max(0, Math.min(100, cohesion)),
    rebellionRisk: Math.max(0, Math.min(100, rebellionRisk)),
    swingInstability,
    confidenceScore: Math.round(confidenceScore),
    trend,
    recentChanges: recent.slice(0, 3).map((e) => e.title),
  };
}
