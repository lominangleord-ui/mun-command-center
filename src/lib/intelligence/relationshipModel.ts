import type { BlocEntry, CountryIntel, NegotiationState, RelationshipLabel } from "../../types";
import type { NormalizedAgenda } from "./agendaNormalization";
import { agendaHasDomain } from "./agendaNormalization";
import { getCountryDoctrine, negotiationPressure } from "./countryDoctrine";

export interface RelationshipInput {
  targetCountry: string;
  perspectiveCountry?: string;
  agenda: NormalizedAgenda;
  entry?: BlocEntry;
  intel?: CountryIntel;
  perspectiveBloc?: string;
  negotiations?: NegotiationState[];
}

export interface RelationshipAssessment {
  label: RelationshipLabel;
  score: number;
  posture: "approach" | "pressure" | "avoid" | "monitor";
  rationale: string[];
  tacticalRole: "sponsor" | "ally" | "swing" | "opponent" | "avoid" | "monitor";
  confidence: "low" | "medium" | "high";
  sponsorProbability: number;
  oppositionProbability: number;
  bluffRisk: number;
  whatTheyWant: string[];
  whatToSay: string;
  whatToAvoid: string;
  workableConcession: string;
  clauseCompatibility: string[];
  leverage: string;
  warning: string;
  nextMove: string;
}

function labelFromScore(score: number): RelationshipLabel {
  if (score >= 76) return "strong_ally";
  if (score >= 58) return "likely_ally";
  if (score >= 43) return "neutral";
  if (score >= 28) return "uncertain";
  return "opponent";
}

function sameName(a = "", b = ""): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function listHasCountry(list: string[] = [], country = ""): boolean {
  const c = country.toLowerCase();
  return list.some((item) => item.toLowerCase() === c || item.toLowerCase().includes(c));
}

function overlap(a: string[] = [], b: string[] = []): string[] {
  const bWords = b.map((item) => item.toLowerCase());
  return a.filter((item) => {
    const lower = item.toLowerCase();
    return bWords.some((other) => lower.includes(other) || other.includes(lower));
  });
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceFrom(doctrineConfidence: "low" | "medium" | "high", entry?: BlocEntry, intel?: CountryIntel): "low" | "medium" | "high" {
  if (doctrineConfidence === "high" && (entry || intel)) return "high";
  if (doctrineConfidence === "high" || entry || intel) return "medium";
  return "low";
}

function first(values: string[], fallback: string): string {
  return values.find(Boolean) || fallback;
}

export function assessRelationship(input: RelationshipInput): RelationshipAssessment {
  const { targetCountry, perspectiveCountry, agenda, entry, intel, perspectiveBloc, negotiations = [] } = input;
  const doctrine = getCountryDoctrine(targetCountry, intel, entry, agenda);
  const perspectiveEntry = perspectiveCountry ? {
    id: perspectiveCountry,
    country: perspectiveCountry,
    stance: "neutral" as const,
    supportLevel: 50,
    riskLevel: 30,
    notes: "",
    contactStatus: "none" as const,
    bloc: perspectiveBloc,
    updatedAt: Date.now(),
  } : undefined;
  const perspectiveDoctrine = perspectiveCountry ? getCountryDoctrine(perspectiveCountry, undefined, perspectiveEntry, agenda) : undefined;
  let score = entry?.supportLevel ?? intel?.supportLevel ?? 50;
  const rationale: string[] = [];

  if (entry) rationale.push(`tracked ${entry.stance} at ${entry.supportLevel}% support / ${entry.riskLevel}% risk`);
  else rationale.push(`no live entry; using ${doctrine.confidence}-confidence doctrine signals`);

  if (entry?.stance === "ally") score += 10;
  if (entry?.stance === "opponent") score -= 18;
  if (entry?.stance === "swing") score -= 3;
  if (entry?.contactStatus === "committed") score += 12;
  if (entry?.contactStatus === "negotiating") score += 5;
  if (entry?.contactStatus === "none") score -= 4;

  score -= Math.round((entry?.riskLevel ?? intel?.riskLevel ?? 30) * 0.18);

  if (perspectiveBloc && doctrine.bloc && perspectiveBloc.toLowerCase() === doctrine.bloc.toLowerCase()) {
    score += Math.round(agenda.modifiers.blocCohesionWeight * 12);
    rationale.push(`same bloc channel (${doctrine.bloc})`);
  }

  if (perspectiveCountry && listHasCountry(doctrine.allies, perspectiveCountry)) {
    score += 18;
    rationale.push(`${targetCountry} doctrine lists ${perspectiveCountry} as an alignment channel`);
  }

  if (perspectiveCountry && doctrine.rivalries.some((r) => sameName(r, perspectiveCountry))) {
    score -= 34;
    rationale.push(`direct target rivalry with ${perspectiveCountry}`);
  }
  if (perspectiveDoctrine && listHasCountry(perspectiveDoctrine.rivalries, targetCountry)) {
    score -= 28;
    rationale.push(`${perspectiveCountry} doctrine treats ${targetCountry} as a rival`);
  }

  if (perspectiveDoctrine) {
    const sharedFrames = overlap(doctrine.preferredFraming, perspectiveDoctrine.preferredFraming);
    if (sharedFrames.length) {
      score += Math.min(12, sharedFrames.length * 4);
      rationale.push(`shared framing: ${sharedFrames.slice(0, 2).join(", ")}`);
    }

    const rejectedByTarget = overlap(perspectiveDoctrine.preferredFraming, doctrine.rejectedFraming);
    if (rejectedByTarget.length) {
      score -= Math.min(14, rejectedByTarget.length * 5);
      rationale.push(`${targetCountry} resists ${rejectedByTarget.slice(0, 2).join(", ")} framing`);
    }

    const highSovereigntyFriction = doctrine.sovereigntySensitivity > 78 && perspectiveDoctrine.enforcementTolerance > 62 && agenda.modifiers.enforcementWeight > 0.45;
    if (highSovereigntyFriction) {
      score -= 12;
      rationale.push("sovereignty/enforcement mismatch on this agenda");
    }

    const enforcementFit = doctrine.enforcementTolerance > 60 && perspectiveDoctrine.enforcementTolerance > 58 && agenda.modifiers.enforcementWeight > 0.45;
    if (enforcementFit) {
      score += 7;
      rationale.push("both can tolerate institutional enforcement language");
    }
  }

  if (agenda.modifiers.enforcementWeight > 0.55 && doctrine.enforcementTolerance < 45) {
    score -= 10;
    rationale.push("low tolerance for enforcement-heavy language");
  }
  if (agenda.modifiers.sovereigntyWeight > 0.7 && doctrine.sovereigntySensitivity > 75) {
    score -= 8;
    rationale.push("high sovereignty sensitivity on this agenda");
  }
  if (agendaHasDomain(agenda, ["development", "climate"]) && /G77|NAM|African|GRULAC/i.test(doctrine.bloc)) {
    score += 8;
    rationale.push("development/equity framing can unlock support");
  }
  if (agendaHasDomain(agenda, ["security", "sanctions"]) && /Western|WEOG|EU|NATO/i.test(doctrine.bloc)) {
    score += 5;
    rationale.push("institutional enforcement framing fits bloc doctrine");
  }

  if (/middle east|proxy|non-state|fragmentation|governance/i.test(agenda.rawAgenda)) {
    if (doctrine.redLines.some((line) => /proxy|militia|armed|terror|Iran|Israel|Kurdish/i.test(line))) {
      score -= Math.round(doctrine.pressureSensitivity * 0.08);
      rationale.push("agenda hits named regional/proxy red lines");
    }
    if (doctrine.clauseCompatibility.some((item) => /humanitarian|reconstruction|capacity|dialogue|corridor/i.test(item))) {
      score += 5;
      rationale.push(`workable clause lane: ${doctrine.clauseCompatibility[0]}`);
    }
  }

  score += Math.round((doctrine.sponsorValue - 50) * 0.08);
  if (!entry && doctrine.swingPotential > 60) {
    score -= 4;
    rationale.push("high swing potential: do not count support before a concrete ask");
  }

  const nudge = negotiationPressure(targetCountry, negotiations);
  if (nudge) {
    score -= nudge;
    rationale.push(nudge > 0 ? "negotiation state increases volatility" : "successful negotiation reduces friction");
  }

  score = clampScore(score);
  const label = labelFromScore(score);
  const posture: RelationshipAssessment["posture"] =
    perspectiveCountry && doctrine.rivalries.some((r) => sameName(r, perspectiveCountry)) ? "avoid"
    : label === "opponent" ? "avoid"
    : label === "uncertain" ? "pressure"
    : label === "neutral" ? "monitor"
    : "approach";

  const directRivalry = !!perspectiveCountry && doctrine.rivalries.some((r) => sameName(r, perspectiveCountry));
  const risk = entry?.riskLevel ?? intel?.riskLevel ?? doctrine.pressureSensitivity;
  const support = entry?.supportLevel ?? intel?.supportLevel ?? score;
  const sponsorProbability = clampScore(
    doctrine.sponsorValue * 0.42
    + score * 0.45
    + (entry?.stance === "ally" ? 10 : entry?.stance === "opponent" ? -18 : 0)
    + (entry?.contactStatus === "committed" ? 12 : entry?.contactStatus === "negotiating" ? 5 : entry?.contactStatus === "none" ? -6 : 0)
    - risk * 0.16
    - (directRivalry ? 22 : 0)
    - (posture === "avoid" ? 16 : 0)
  );
  const oppositionProbability = clampScore(
    100 - score
    + risk * 0.18
    + (entry?.stance === "opponent" ? 18 : 0)
    + (directRivalry ? 24 : 0)
    + (agenda.modifiers.enforcementWeight > 0.55 && doctrine.enforcementTolerance < 45 ? 10 : 0)
  );
  const bluffRisk = clampScore(
    risk * 0.42
    + doctrine.contradictionRisk * 0.24
    + (support > 60 && entry?.contactStatus !== "committed" ? 20 : 0)
    + (doctrine.swingPotential > 60 ? 12 : 0)
    + (negotiationPressure(targetCountry, negotiations) > 0 ? 12 : 0)
    - (entry?.contactStatus === "committed" ? 18 : 0)
  );
  const tacticalRole: RelationshipAssessment["tacticalRole"] =
    posture === "avoid" ? "avoid"
    : oppositionProbability >= 68 ? "opponent"
    : sponsorProbability >= 70 ? "sponsor"
    : score >= 58 ? "ally"
    : doctrine.swingPotential >= 60 || label === "uncertain" ? "swing"
    : "monitor";
  const whatToSay = `Lead with ${first(doctrine.preferredFraming, "practical cooperation")} and ask whether "${first(doctrine.supportConditions, doctrine.priorities[0] || "their stated condition")}" buys support, co-sponsorship, or abstention.`;
  const whatToAvoid = first(doctrine.rejectedFraming, first(doctrine.redLines, "public blame before testing their red line"));
  const workableConcession = first(doctrine.concessionPaths, "offer softer operative verbs plus a review clause");
  const leverage = doctrine.dependencies.length
    ? `Protect ${doctrine.dependencies[0]} while moving them toward ${first(doctrine.clauseCompatibility, "your operative clause")}.`
    : `Use ${first(doctrine.priorities, "their first priority")} as the tradeable hook.`;
  const warning = bluffRisk >= 70
    ? `${targetCountry} may be over-signalling support; demand a written clause condition before counting the vote.`
    : oppositionProbability >= 68
    ? `${targetCountry} is likely to oppose unless ${whatToAvoid} is removed or reframed.`
    : directRivalry
    ? `Direct outreach from ${perspectiveCountry} is risky; use a bridge delegation or neutral authorship.`
    : `Do not assume bloc loyalty; test the exact wording before vote modeling.`;
  const nextMove =
    tacticalRole === "sponsor" ? `Ask ${targetCountry} for a co-sponsor signature and one floor line defending ${first(doctrine.clauseCompatibility, "the operative mechanism")}.`
    : tacticalRole === "ally" ? `Lock ${targetCountry} on one acceptable phrase and ask them to pressure a nearby swing state.`
    : tacticalRole === "swing" ? `Offer ${workableConcession}, then ask for a yes/abstain threshold instead of a public commitment.`
    : tacticalRole === "opponent" || tacticalRole === "avoid" ? `Do not try to convert ${targetCountry} first; isolate the red line and aim for abstention or amendment restraint.`
    : `Monitor ${targetCountry} until a concrete clause is ready, then test ${first(doctrine.preferredFraming, "their preferred framing")}.`;

  return {
    label,
    score,
    posture,
    rationale: rationale.slice(0, 5),
    tacticalRole,
    confidence: confidenceFrom(doctrine.confidence, entry, intel),
    sponsorProbability,
    oppositionProbability,
    bluffRisk,
    whatTheyWant: doctrine.priorities.slice(0, 4),
    whatToSay,
    whatToAvoid,
    workableConcession,
    clauseCompatibility: doctrine.clauseCompatibility.slice(0, 4),
    leverage,
    warning,
    nextMove,
  };
}

export interface CommitteeStrategyInput {
  entries: BlocEntry[];
  intelProfiles?: CountryIntel[];
  selectedCountry?: string;
  selectedBloc?: string;
  agenda: NormalizedAgenda;
  negotiations?: NegotiationState[];
}

export interface CommitteeStrategyCountry {
  country: string;
  score: number;
  role: RelationshipAssessment["tacticalRole"];
  confidence: RelationshipAssessment["confidence"];
  reason: string;
  nextMove: string;
}

export interface CommitteeStrategy {
  allies: CommitteeStrategyCountry[];
  rivals: CommitteeStrategyCountry[];
  swingStates: CommitteeStrategyCountry[];
  sponsorTargets: CommitteeStrategyCountry[];
  likelyOpponents: CommitteeStrategyCountry[];
  warnings: string[];
}

export function buildCommitteeStrategy(input: CommitteeStrategyInput): CommitteeStrategy {
  const { entries, intelProfiles = [], selectedCountry, selectedBloc, agenda, negotiations = [] } = input;
  const assessed = entries
    .filter((entry) => !selectedCountry || entry.country.toLowerCase() !== selectedCountry.toLowerCase())
    .map((entry) => {
      const intel = intelProfiles.find((item) => item.country.toLowerCase() === entry.country.toLowerCase());
      const rel = assessRelationship({
        targetCountry: entry.country,
        perspectiveCountry: selectedCountry,
        perspectiveBloc: selectedBloc,
        agenda,
        entry,
        intel,
        negotiations,
      });
      return {
        country: entry.country,
        score: rel.score,
        role: rel.tacticalRole,
        confidence: rel.confidence,
        reason: `${rel.sponsorProbability}% sponsor / ${rel.oppositionProbability}% oppose / ${rel.bluffRisk}% bluff risk; ${rel.rationale[0] || rel.warning}`,
        nextMove: rel.nextMove,
      };
    });

  const byScoreDesc = (a: CommitteeStrategyCountry, b: CommitteeStrategyCountry) => b.score - a.score;
  const byBluffOrOpposition = (a: CommitteeStrategyCountry, b: CommitteeStrategyCountry) => b.reason.localeCompare(a.reason);

  return {
    allies: assessed.filter((item) => item.role === "sponsor" || item.role === "ally").sort(byScoreDesc).slice(0, 5),
    rivals: assessed.filter((item) => item.role === "avoid" || item.role === "opponent").sort((a, b) => a.score - b.score).slice(0, 5),
    swingStates: assessed.filter((item) => item.role === "swing" || item.role === "monitor").sort(byScoreDesc).slice(0, 6),
    sponsorTargets: assessed.filter((item) => item.role === "sponsor" || item.role === "ally").sort(byScoreDesc).slice(0, 4),
    likelyOpponents: assessed.filter((item) => item.role === "avoid" || item.role === "opponent").sort((a, b) => a.score - b.score).slice(0, 4),
    warnings: assessed
      .filter((item) => /bluff risk|oppose|rivalry|avoid/i.test(item.reason))
      .sort(byBluffOrOpposition)
      .slice(0, 5)
      .map((item) => `${item.country}: ${item.reason}`),
  };
}
