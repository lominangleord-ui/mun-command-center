import type { ContextPack } from "../types";
import { getActiveAgendaModifiers } from "./agendaOntology";
import { normalizeAgenda } from "../lib/intelligence/agendaNormalization";
import { assessRelationship } from "../lib/intelligence/relationshipModel";

// ─── Diplomatic Leverage Engine ───
// Calculates real-time leverage scores for the delegate country
// based on relationships, agenda, bloc position, and committee state.

export interface LeverageScore {
  overall: number;
  components: {
    allianceLeverage: number;
    blocLeverage: number;
    agendaLeverage: number;
    swingLeverage: number;
    moralLeverage: number;
    enforcementLeverage: number;
    reconstructionLeverage: number;
  };
  topOpportunities: LeverageOpportunity[];
  topRisks: LeverageRisk[];
}

export interface LeverageOpportunity {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  action: string;
  targetStates: string[];
}

export interface LeverageRisk {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  mitigation: string;
}

// ─── Compute overall leverage ───

export function computeLeverage(ctx: ContextPack): LeverageScore {
  const normalized = normalizeAgenda(ctx.agenda);
  const agendaMods = getActiveAgendaModifiers(ctx.agenda);

  const allyAssessments = ctx.allies.map((country) => assessRelationship({
    targetCountry: country,
    perspectiveCountry: ctx.country,
    perspectiveBloc: ctx.bloc,
    agenda: normalized,
    entry: { id: country, country, stance: "ally", supportLevel: 70, riskLevel: 28, notes: "", contactStatus: "contacted", bloc: ctx.bloc, updatedAt: Date.now() },
  }));
  const opponentAssessments = ctx.opponents.map((country) => assessRelationship({
    targetCountry: country,
    perspectiveCountry: ctx.country,
    perspectiveBloc: ctx.bloc,
    agenda: normalized,
    entry: { id: country, country, stance: "opponent", supportLevel: 20, riskLevel: 68, notes: "", contactStatus: "none", updatedAt: Date.now() },
  }));

  // Alliance leverage: relationship strength from tracked states, not constants.
  const allyStrength = allyAssessments.reduce((sum, rel) => {
    const bonus = rel.label === "strong_ally" ? 15 : rel.label === "likely_ally" ? 9 : rel.label === "neutral" ? 3 : 0;
    return sum + bonus + Math.max(0, rel.score - 55) / 5;
  }, 0);
  const allianceLeverage = Math.min(100, Math.round((allyStrength / Math.max(ctx.allies.length, 1)) * 10));

  // Bloc leverage: bloc cohesion × agenda alignment
  const blocAlignment = agendaMods.blocCohesionWeight * 100;
  const blocLeverage = Math.round(blocAlignment * 0.6 + 20);

  // Agenda leverage: how well the agenda suits this delegate
  const agendaFit = agendaMods.humanitarianWeight * 40 + agendaMods.reconstructionWeight * 30 + 30;
  const agendaLeverage = Math.round(agendaFit);

  // Swing leverage: ability to influence undecided states
  const contestedPool = [...allyAssessments, ...opponentAssessments].filter((rel) => ["uncertain", "neutral"].includes(rel.label)).length;
  const swingLeverage = Math.min(100, Math.round(contestedPool * 18 + agendaMods.swingVolatility * 30));

  // Moral leverage: humanitarian + sovereignty framing power
  const moralLeverage = Math.round(
    agendaMods.humanitarianWeight * 50 +
    (ctx.bloc === "G77" || ctx.bloc === "NAM" ? 25 : 10) +
    agendaMods.sovereigntyWeight * 20
  );

  // Enforcement leverage
  const enforcementLeverage = Math.round(
    agendaMods.enforcementWeight * 40 +
    (ctx.opponents.length > 3 ? 20 : 10) +
    (ctx.allies.length > 5 ? 15 : 5)
  );

  // Reconstruction leverage
  const reconstructionLeverage = Math.round(
    agendaMods.reconstructionWeight * 50 +
    (ctx.bloc === "EU" || ctx.bloc === "G77" ? 20 : 5) +
    20
  );

  const overall = Math.round(
    allianceLeverage * 0.2 +
    blocLeverage * 0.15 +
    agendaLeverage * 0.2 +
    swingLeverage * 0.15 +
    moralLeverage * 0.1 +
    enforcementLeverage * 0.1 +
    reconstructionLeverage * 0.1
  );

  // Top opportunities
  const topOpportunities: LeverageOpportunity[] = [];

  if (agendaMods.humanitarianWeight > 0.6) {
    topOpportunities.push({
      title: "Humanitarian Framing Advantage",
      description: `This agenda heavily weights humanitarian concerns. Your bloc (${ctx.bloc}) can lead moral framing to gain disproportionate influence.`,
      impact: "high",
      action: "Open your speech with a humanitarian narrative; propose a humanitarian corridor clause early",
      targetStates: ["G77", "NAM", "EU", "Swing states"],
    });
  }

  if (agendaMods.swingVolatility > 0.5) {
    const targetStates = [...ctx.opponents, ...ctx.allies].slice(0, 5);
    topOpportunities.push({
      title: "Swing State Exploitation",
      description: `The normalized agenda (${normalized.detectedDomains.join(", ")}) creates volatility; states with unresolved enforcement or sovereignty concerns can move quickly.`,
      impact: "high",
      action: "Use the next caucus to ask each target for one clause condition they need before co-sponsoring",
      targetStates: targetStates.length ? targetStates : ["Untracked swing states"],
    });
  }

  if (ctx.allies.length >= 3) {
    topOpportunities.push({
      title: "Coalition Sponsorship",
      description: `With ${ctx.allies.length} confirmed allies, you have enough numbers to co-sponsor a resolution. This dramatically increases passage probability.`,
      impact: "high",
      action: "Approach 2-3 allies to co-sponsor; distribute clause sections among sponsors",
      targetStates: ctx.allies.slice(0, 3),
    });
  }

  if (agendaMods.reconstructionWeight > 0.6) {
    topOpportunities.push({
      title: "Reconstruction Funding Leverage",
      description: "Reconstruction framing is powerful on this agenda. Offer technical assistance to lock in developing-nation support.",
      impact: "medium",
      action: "Propose a reconstruction trust fund with voluntary contributions in the preambulatory section",
      targetStates: ["G77", "EU", "Japan", "South Korea"],
    });
  }

  // Top risks
  const topRisks: LeverageRisk[] = [];

  if (ctx.opponents.length > 3) {
    topRisks.push({
      title: "Opposition Bloc Formation",
      description: `${ctx.opponents.length} confirmed opponents may coordinate to block your positions. They have enough votes to sustain a filibuster or force unfavorable amendments.`,
      impact: "high",
      mitigation: "Pre-emptively approach 2-3 opponents with face-saving compromise language; offer them a role in the drafting process",
    });
  }

  if (agendaMods.sovereigntyWeight > 0.7 && ctx.bloc === "WEOG") {
    topRisks.push({
      title: "Sovereignty Backlash Risk",
      description: "High sovereignty weighting combined with Western bloc membership will trigger G77/NAM resistance. Expect organized opposition.",
      impact: "high",
      mitigation: "Lead with partnership language; explicitly affirm sovereignty in preamble; let G77 states take visible ownership of sovereignty provisions",
    });
  }

  if (agendaMods.enforcementWeight > 0.6 && ctx.allies.length < 3) {
    topRisks.push({
      title: "Enforcement Without Coalition",
      description: "Pushing enforcement language without allied support will isolate you and make your proposals easy targets for amendment.",
      impact: "medium",
      mitigation: "Soft-pedal enforcement language; focus on voluntary compliance and capacity-building instead",
    });
  }

  return {
    overall: Math.min(100, Math.max(0, overall)),
    components: {
      allianceLeverage: Math.min(100, allianceLeverage),
      blocLeverage: Math.min(100, blocLeverage),
      agendaLeverage: Math.min(100, agendaLeverage),
      swingLeverage: Math.min(100, swingLeverage),
      moralLeverage: Math.min(100, moralLeverage),
      enforcementLeverage: Math.min(100, enforcementLeverage),
      reconstructionLeverage: Math.min(100, reconstructionLeverage),
    },
    topOpportunities,
    topRisks,
  };
}
