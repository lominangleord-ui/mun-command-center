import type { ContextPack } from "../types";

// ─── Tactical Heat System ───
// Real-time visualization of committee tension, bloc stability,
// amendment volatility, and diplomatic pressure.

export interface HeatMetric {
  label: string;
  value: number;       // 0-100
  color: string;       // CSS color
  trend: "rising" | "falling" | "stable";
  description: string;
}

export interface HeatDashboard {
  committeeTension: HeatMetric;
  blocStability: HeatMetric;
  amendmentVolatility: HeatMetric;
  diplomaticPressure: HeatMetric;
  sponsorFragility: HeatMetric;
  overallHeat: number;
}

// ─── Compute all heat metrics from committee context ───

export function computeHeatDashboard(ctx: ContextPack): HeatDashboard {
  // Committee tension: based on phase + opponent count + agenda volatility
  const phaseTension: Record<string, number> = {
    roll_call: 10,
    agenda_setting: 20,
    opening_speeches: 35,
    moderated_caucus: 55,
    unmoderated_caucus: 80,
    drafting: 65,
    amendment: 90,
    voting: 75,
  };
  const baseTension = phaseTension[ctx.current_phase] ?? 50;
  const opponentBoost = Math.min(20, ctx.opponents.length * 4);
  const committeeTensionValue = Math.min(100, baseTension + opponentBoost);

  // Bloc stability: how cohesive are the major blocs
  const blocStabilityValue = ctx.bloc === "G77" || ctx.bloc === "NAM" ? 72 :
    ctx.bloc === "WEOG" ? 68 :
    ctx.bloc === "EU" ? 82 :
    ctx.bloc === "Arab League" ? 65 : 55;

  // Amendment volatility: how many amendments are likely
  const amendmentVolatilityValue = ctx.current_phase === "amendment" ? 95 :
    ctx.current_phase === "drafting" ? 60 :
    ctx.current_phase === "moderated_caucus" ? 45 : 25;

  // Diplomatic pressure: based on allies vs opponents ratio
  const ratio = ctx.allies.length / Math.max(ctx.opponents.length, 1);
  const diplomaticPressureValue = Math.min(100, Math.round((1 - ratio) * 80 + 20));

  // Sponsor fragility: how likely is the current sponsor to hold
  const sponsorFragilityValue = ctx.current_phase === "drafting" ? 40 :
    ctx.current_phase === "amendment" ? 70 :
    ctx.current_phase === "moderated_caucus" ? 30 : 20;

  const overallHeat = Math.round(
    committeeTensionValue * 0.3 +
    (100 - blocStabilityValue) * 0.15 +
    amendmentVolatilityValue * 0.2 +
    diplomaticPressureValue * 0.2 +
    sponsorFragilityValue * 0.15
  );

  return {
    committeeTension: {
      label: "Committee Tension",
      value: committeeTensionValue,
      color: committeeTensionValue > 70 ? "#ef4444" : committeeTensionValue > 40 ? "#f59e0b" : "#10b981",
      trend: ctx.current_phase === "amendment" ? "rising" : ctx.current_phase === "voting" ? "falling" : "stable",
      description: committeeTensionValue > 70
        ? "Extremely tense — expect hostile amendments and procedural challenges"
        : committeeTensionValue > 40
        ? "Moderately tense — active negotiations and bloc maneuvering"
        : "Calm — procedural phase, low immediate pressure",
    },
    blocStability: {
      label: "Bloc Stability",
      value: blocStabilityValue,
      color: blocStabilityValue > 70 ? "#10b981" : blocStabilityValue > 45 ? "#f59e0b" : "#ef4444",
      trend: "stable",
      description: blocStabilityValue > 70
        ? `${ctx.bloc} bloc is cohesive — reliable voting block`
        : blocStabilityValue > 45
        ? `${ctx.bloc} bloc has internal divisions — some members may defect`
        : `${ctx.bloc} bloc is fractured — expect significant defections`,
    },
    amendmentVolatility: {
      label: "Amendment Risk",
      value: amendmentVolatilityValue,
      color: amendmentVolatilityValue > 70 ? "#ef4444" : amendmentVolatilityValue > 40 ? "#f59e0b" : "#10b981",
      trend: ctx.current_phase === "amendment" ? "rising" : "stable",
      description: amendmentVolatilityValue > 70
        ? "High amendment activity expected — prepare defensive clauses"
        : amendmentVolatilityValue > 40
        ? "Moderate amendment risk — monitor opponent proposals"
        : "Low amendment risk — current text is relatively stable",
    },
    diplomaticPressure: {
      label: "Diplomatic Pressure",
      value: diplomaticPressureValue,
      color: diplomaticPressureValue > 70 ? "#ef4444" : diplomaticPressureValue > 40 ? "#f59e0b" : "#10b981",
      trend: ctx.opponents.length > ctx.allies.length ? "rising" : "falling",
      description: diplomaticPressureValue > 70
        ? "Heavy pressure — you are outnumbered. Seek allies immediately."
        : diplomaticPressureValue > 40
        ? "Moderate pressure — maintain alliance discipline"
        : "Low pressure — you have favorable numbers",
    },
    sponsorFragility: {
      label: "Sponsor Stability",
      value: sponsorFragilityValue,
      color: sponsorFragilityValue > 70 ? "#ef4444" : sponsorFragilityValue > 40 ? "#f59e0b" : "#10b981",
      trend: ctx.current_phase === "amendment" ? "rising" : "stable",
      description: sponsorFragilityValue > 70
        ? "Current sponsor is likely to withdraw — prepare to step in or find new sponsor"
        : sponsorFragilityValue > 40
        ? "Sponsor is holding but under pressure — offer support to maintain"
        : "Sponsor is stable — no immediate risk",
    },
    overallHeat: Math.min(100, overallHeat),
  };
}

// ─── Generate a heat bar visual (returns CSS for inline display) ───

export function heatBarCss(value: number, max = 100): string {
  const pct = (value / max) * 100;
  const color = value > 70 ? "#ef4444" : value > 40 ? "#f59e0b" : "#10b981";
  return `background: linear-gradient(90deg, ${color}33 0%, ${color} ${pct}%, #1f2937 ${pct}%, #1f2937 100%); border-left: 3px solid ${color};`;
}
