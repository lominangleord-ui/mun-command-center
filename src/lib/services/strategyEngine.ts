import type { CountryIntel, BlocEntry, NegotiationState } from "../../types";
import type { AgendaTopic, EvidenceItem, LeverageItem, PressurePoint, Contradiction, GameTheoryProjection, SponsorAssessment } from "../../api/models/dossier";
import type { GeopoliticalEvent } from "../../api/models/intelligence";
import type { CountryIndicatorSnapshot } from "../../api/models/country";
import { normalizeAgenda, agendaHasDomain, type NormalizedAgenda } from "../intelligence/agendaNormalization";
import { getCountryDoctrine, negotiationPressure } from "../intelligence/countryDoctrine";
import { assessRelationship } from "../intelligence/relationshipModel";

function asAgenda(input: string | NormalizedAgenda): NormalizedAgenda {
  return typeof input === "string" ? normalizeAgenda(input) : input;
}

function level(value: number): "low" | "medium" | "high" {
  return value >= 67 ? "high" : value >= 40 ? "medium" : "low";
}

function categoryFor(text: string): LeverageItem["category"] {
  const lower = text.toLowerCase();
  if (/security|military|defense|border/.test(lower)) return "security";
  if (/sovereign|non-interference|territorial/.test(lower)) return "sovereignty";
  if (/trade|market|energy|econom/.test(lower)) return "economic";
  if (/develop|finance|aid|capacity|health/.test(lower)) return "development";
  if (/regional|neighbor|neighbour|bloc/.test(lower)) return "regional";
  return "institutional";
}

export function detectLeveragePoints(
  country: string,
  _topic: AgendaTopic,
  rawAgenda: string | NormalizedAgenda,
  intel: CountryIntel | undefined,
  indicators: CountryIndicatorSnapshot | null,
  entry: BlocEntry | undefined,
  perspectiveCountry?: string,
  negotiations: NegotiationState[] = [],
): LeverageItem[] {
  const agenda = asAgenda(rawAgenda);
  const doctrine = getCountryDoctrine(country, intel, entry, agenda);
  const items: LeverageItem[] = [];

  for (const interest of doctrine.priorities.slice(0, 4)) {
    items.push({
      category: categoryFor(interest),
      signal: `Ask ${country} for clause language that protects "${interest}". Convert the answer into a co-sponsor condition, not a vague expression of support.`,
      basis: intel?.strategicInterests?.includes(interest) ? "FACT" : "INFERENCE",
      sourceLabel: intel?.strategicInterests?.includes(interest) ? "Local Intel Profile" : "Country Doctrine",
    });
  }

  for (const condition of doctrine.supportConditions.slice(0, 2)) {
    items.push({
      category: categoryFor(condition),
      signal: `Concrete ask for ${country}: make "${condition}" visible in the operative text, then ask whether that buys co-sponsorship, support, or abstention.`,
      basis: "INFERENCE",
      sourceLabel: "Tactical Policy Index",
    });
  }

  if (doctrine.concessionPaths.length) {
    items.push({
      category: categoryFor(doctrine.concessionPaths[0]),
      signal: `Cheap concession path: ${doctrine.concessionPaths[0]}. Offer it before exposing your stronger clauses to amendment pressure.`,
      basis: "INFERENCE",
      sourceLabel: "Tactical Policy Index",
    });
  }

  if (indicators?.gdpPerCapita && indicators.gdpPerCapita < 5000) {
    items.push({ category: "development", signal: `${country} has low per-capita income. Lead with capacity-building, funding, and phased implementation before asking for compliance language.`, basis: "FACT", sourceLabel: "World Bank" });
  }
  if (indicators?.gdpPerCapita && indicators.gdpPerCapita > 30000) {
    items.push({ category: "economic", signal: `${country} can credibly carry financing or technical-assistance commitments. Pressure it for resources if it wants strong operative verbs.`, basis: "FACT", sourceLabel: "World Bank" });
  }
  if (agendaHasDomain(agenda, ["climate"]) && indicators?.co2Emissions && indicators.population) {
    const emissionsPerPerson = indicators.co2Emissions / indicators.population;
    items.push({
      category: "development",
      signal: emissionsPerPerson > 0.005
        ? `${country} is exposed on emissions. Trade softer timelines for measurable finance or technology-transfer commitments.`
        : `${country} can argue differentiated obligations. Offer explicit equity wording to secure support.`,
      basis: "INFERENCE",
      sourceLabel: "World Bank + Agenda Model",
    });
  }

  if (doctrine.rivalries.length) {
    items.push({
      category: "regional",
      signal: `Rivalry constraint: language visibly aligned with ${doctrine.rivalries.slice(0, 2).join(" or ")} will harden ${country}. Use neutral authorship or reciprocal obligations.`,
      basis: "INFERENCE",
      sourceLabel: "Doctrine + Local Intel",
    });
  }
  if (doctrine.dependencies.length) {
    items.push({
      category: "economic",
      signal: `Dependency lever: ${doctrine.dependencies[0]}. Frame the ask around protecting that dependency while advancing "${agenda.rawAgenda}".`,
      basis: "INFERENCE",
      sourceLabel: "Doctrine + Local Intel",
    });
  }
  if (doctrine.likelyObjections.length) {
    items.push({
      category: "sovereignty",
      signal: `Prepare substitute text for this objection: ${doctrine.likelyObjections[0]}. Raise it before opponents weaponize it on the floor.`,
      basis: "INFERENCE",
      sourceLabel: "Agenda Doctrine",
    });
  }
  if (perspectiveCountry && perspectiveCountry.toLowerCase() !== country.toLowerCase()) {
    const rel = assessRelationship({ targetCountry: country, perspectiveCountry, agenda, entry, intel, negotiations });
    items.push({
      category: rel.posture === "pressure" ? "image" : "institutional",
      signal: `From ${perspectiveCountry}'s perspective: ${rel.posture.toUpperCase()} ${country} (${rel.score}/100). ${rel.rationale.join("; ")}.`,
      basis: "INFERENCE",
      sourceLabel: "Relationship Model",
    });
    if (rel.posture === "avoid") {
      items.push({
        category: "regional",
        signal: `Do not use ${perspectiveCountry} as the visible author when approaching ${country}; route the ask through a bridge state or neutral clause language first.`,
        basis: "INFERENCE",
        sourceLabel: "Relationship Model",
      });
    }
  }

  return items.slice(0, 8);
}

export function detectPressurePoints(
  rawAgenda: string | NormalizedAgenda,
  country: string,
  intel: CountryIntel | undefined,
  indicators: CountryIndicatorSnapshot | null,
  entry: BlocEntry | undefined,
  perspectiveCountry?: string,
  negotiations: NegotiationState[] = [],
): PressurePoint[] {
  const agenda = asAgenda(rawAgenda);
  const doctrine = getCountryDoctrine(country, intel, entry, agenda);
  const items: PressurePoint[] = [];
  const risk = entry?.riskLevel ?? intel?.riskLevel ?? 30;
  const negotiationRisk = negotiationPressure(country, negotiations);

  if (risk > 55) items.push({ signal: `${country} is volatile (${risk}% risk). Secure a written clause condition before treating support as stable.`, basis: "INFERENCE", sourceLabel: "Risk Assessment" });
  for (const redLine of doctrine.redLines.slice(0, 2)) {
    items.push({ signal: `Red-line warning: "${redLine}" can trigger resistance from ${country}. Reword through ${doctrine.preferredFraming[0] || "their preferred framing"} or keep it out of the first draft shown to them.`, basis: "INFERENCE", sourceLabel: "Tactical Policy Index" });
  }
  if (negotiationRisk > 0) items.push({ signal: `Current negotiation state increases pressure. Avoid forcing a public commitment until the stalled/failed issue is resolved.`, basis: "INFERENCE", sourceLabel: "Negotiation Workspace" });
  if (doctrine.rivalries.length) items.push({ signal: `${doctrine.rivalries[0]} can be used as a pressure reference, but only through neutral wording; direct comparison may trigger defensive opposition.`, basis: "INFERENCE", sourceLabel: "Doctrine" });
  if (doctrine.sovereigntySensitivity > 75 && agenda.modifiers.enforcementWeight > 0.5) items.push({ signal: `${country} is highly sensitive to sovereignty on this agenda. Monitoring, sanctions, or naming language will be the first amendment target.`, basis: "INFERENCE", sourceLabel: "Agenda Doctrine" });
  if (agendaHasDomain(agenda, ["sanctions", "trade"]) && doctrine.dependencies.length) items.push({ signal: `Trade or sanctions language threatens ${doctrine.dependencies[0]}; offer exemptions or review clauses to prevent a hard no.`, basis: "INFERENCE", sourceLabel: "Doctrine" });
  if (agendaHasDomain(agenda, ["climate"]) && indicators?.co2Emissions && indicators.co2Emissions > 1e6) items.push({ signal: `High absolute emissions create exposure. Ask for finance or technology-transfer commitments in exchange for softer public pressure.`, basis: "FACT", sourceLabel: "World Bank" });
  if (perspectiveCountry && doctrine.rivalries.some((r) => r.toLowerCase() === perspectiveCountry.toLowerCase())) items.push({ signal: `${country} has a direct rivalry with the selected delegation. Use procedural or third-party channels before substantive persuasion.`, basis: "INFERENCE", sourceLabel: "Relationship Model" });

  return items.slice(0, 6);
}

export function detectContradictions(
  country: string,
  rawAgenda: string | NormalizedAgenda,
  intel: CountryIntel | undefined,
  indicators: CountryIndicatorSnapshot | null,
  entry: BlocEntry | undefined,
  events: GeopoliticalEvent[],
  perspectiveCountry?: string,
): Contradiction[] {
  const agenda = asAgenda(rawAgenda);
  const doctrine = getCountryDoctrine(country, intel, entry, agenda);
  const items: Contradiction[] = [];
  const stance = entry?.stance || "neutral";
  const support = entry?.supportLevel ?? intel?.supportLevel ?? 50;

  if (stance === "ally" && support < 62) {
    items.push({
      tension: `${country} is tagged as an ally but only shows ${support}% support.`,
      opportunity: "Ask for a public floor line or written co-sponsor condition; do not count the vote until one exists.",
      basis: "INFERENCE",
      sourceLabel: "Local Tracking",
    });
  }
  if (agenda.modifiers.enforcementWeight > 0.55 && doctrine.enforcementTolerance < 40) {
    items.push({
      tension: `${country}'s doctrine resists enforcement, but the agenda is enforcement-heavy.`,
      opportunity: "Offer review mechanisms, voluntary reporting, or regional consent to convert opposition into abstention.",
      basis: "INFERENCE",
      sourceLabel: "Agenda Doctrine",
    });
  }
  if (agendaHasDomain(agenda, ["climate"]) && indicators?.gdpPerCapita && indicators.gdpPerCapita > 15000 && /G77|NAM/i.test(doctrine.bloc)) {
    items.push({
      tension: `${country} may claim developing-state flexibility despite relatively high income indicators.`,
      opportunity: "Move them toward South-South cooperation language instead of donor-recipient framing.",
      basis: "INFERENCE",
      sourceLabel: "World Bank + Bloc Analysis",
    });
  }
  if (agendaHasDomain(agenda, ["human-rights", "population"]) && doctrine.sovereigntySensitivity > 80) {
    items.push({
      tension: `${country} can support broad principles while rejecting domestic monitoring.`,
      opportunity: "Split the clause: keep rights language in the preamble and make implementation consent-based.",
      basis: "INFERENCE",
      sourceLabel: "Doctrine",
    });
  }

  if (perspectiveCountry) {
    const relationship = assessRelationship({ targetCountry: country, perspectiveCountry, agenda, entry, intel });
    if (relationship.posture === "avoid" && (entry?.stance === "ally" || support > 55)) {
      items.push({
        tension: `${country} is being counted as usable support, but the pairwise relationship with ${perspectiveCountry} is hostile or rivalry-driven.`,
        opportunity: "Downgrade them to abstention target unless a bridge state can secure a written condition.",
        basis: "INFERENCE",
        sourceLabel: "Relationship Model",
      });
    }
    if (relationship.label === "neutral" && doctrine.swingPotential > 60) {
      items.push({
        tension: `${country} looks neutral, but doctrine marks it as highly swing-sensitive on this agenda.`,
        opportunity: `Offer ${doctrine.concessionPaths[0] || doctrine.supportConditions[0] || "a concrete concession"} before another bloc captures the vote.`,
        basis: "INFERENCE",
        sourceLabel: "Tactical Policy Index",
      });
    }
  }

  const negativeEvents = events.filter((e) => e.tone && e.tone < -5);
  if (negativeEvents.length >= 3) {
    items.push({
      tension: `${country} has ${negativeEvents.length} negative-tone recent media signals.`,
      opportunity: "Use private assurances or quiet abstention pathways; avoid demanding a public reversal.",
      basis: "INFERENCE",
      sourceLabel: "GDELT tone analysis",
    });
  }
  if (!items.length) {
    items.push({
      tension: `${country}'s position on "${agenda.rawAgenda}" is not yet locked by evidence in this workspace.`,
      opportunity: "Run a short bilateral: ask for one unacceptable phrase, one required phrase, and whether abstention is preferable to opposition.",
      basis: "INFERENCE",
      sourceLabel: "Committee Assessment",
    });
  }

  return items.slice(0, 5);
}

export function evaluateCommitteeTemperature(
  entries: BlocEntry[],
  events: GeopoliticalEvent[],
  phase: string,
): { temperature: "polarised" | "fluid" | "rigid" | "collaborative" | "escalating"; rationale: string } {
  const allies = entries.filter((e) => e.stance === "ally");
  const opponents = entries.filter((e) => e.stance === "opponent");
  const swings = entries.filter((e) => e.stance === "swing" || (e.supportLevel > 35 && e.supportLevel < 65));
  const avgRisk = entries.length ? entries.reduce((sum, e) => sum + e.riskLevel, 0) / entries.length : 30;
  const negativeEvents = events.filter((e) => e.tone && e.tone < -4).length;

  if (negativeEvents > 4 || avgRisk > 65) return { temperature: "escalating", rationale: "External negativity or tracked risk is high; expect public pressure and defensive amendments." };
  if (opponents.length > allies.length && swings.length < 2) return { temperature: "rigid", rationale: "Opposition has more tracked weight than allies, with limited swing space." };
  if (allies.length > 2 && opponents.length > 2 && swings.length < 2) return { temperature: "polarised", rationale: "Both blocs are formed and the available swing pool is thin." };
  if (swings.length > entries.length * 0.35 || phase === "unmoderated_caucus") return { temperature: "fluid", rationale: "Enough states remain movable for bilateral sequencing to matter." };
  return { temperature: "collaborative", rationale: "Tracked opposition is limited; focus on locking wording and sponsors." };
}

export function projectGameTheory(
  entry: BlocEntry | undefined,
  intel: CountryIntel | undefined,
  indicators: CountryIndicatorSnapshot | null,
  rawAgenda: string | NormalizedAgenda,
  events: GeopoliticalEvent[],
  perspectiveCountry?: string,
  negotiations: NegotiationState[] = [],
): GameTheoryProjection {
  const agenda = asAgenda(rawAgenda);
  const country = entry?.country || intel?.country || "Country";
  const doctrine = getCountryDoctrine(country, intel, entry, agenda);
  const relationship = assessRelationship({ targetCountry: country, perspectiveCountry, agenda, entry, intel, negotiations });
  const support = relationship.score;
  const risk = entry?.riskLevel ?? intel?.riskLevel ?? 30;
  const recentNegative = events.filter((e) => e.tone && e.tone < -3).length;
  const hasDeepDeps = doctrine.dependencies.length >= 3;
  const sensitive = doctrine.sovereigntySensitivity > 75 && agenda.modifiers.enforcementWeight > 0.5;
  const wealthy = (indicators?.gdpPerCapita ?? 0) > 15000;

  const sponsorLikelihood = level(relationship.sponsorProbability);
  const coSponsorLikelihood = level(relationship.sponsorProbability + (entry?.contactStatus === "negotiating" ? 8 : 0) - 8);
  const abstentionRisk = level(relationship.oppositionProbability + risk * 0.1 + (sensitive ? 8 : 0));
  const amendmentResistance = level(doctrine.sovereigntySensitivity * 0.45 + (100 - doctrine.enforcementTolerance) * 0.35 + (risk * 0.2));
  const compromiseProbability = level(100 - risk + (relationship.label === "uncertain" || relationship.label === "neutral" ? 15 : 0) - (sensitive ? 10 : 0));
  const coalitionFractureRisk = level(risk + recentNegative * 8 + (hasDeepDeps ? 10 : 0));
  const pressureVulnerability = level((hasDeepDeps ? 60 : 35) + risk * 0.35 + (wealthy && agendaHasDomain(agenda, ["climate", "development"]) ? 10 : 0));

  const rationale: EvidenceItem[] = [
    { basis: "INFERENCE", claim: `Relationship score from ${perspectiveCountry || "delegate"} perspective: ${support}/100; sponsor ${relationship.sponsorProbability}%, oppose ${relationship.oppositionProbability}%, bluff ${relationship.bluffRisk}%.`, sourceLabel: "Relationship Model" },
    { basis: "INFERENCE", claim: `Amendment resistance is ${amendmentResistance}; main sensitivity is ${doctrine.likelyObjections[0] || "unverified until bilateral contact"}.`, sourceLabel: "Agenda Doctrine" },
    { basis: "INFERENCE", claim: `Pressure vulnerability is ${pressureVulnerability}; dependency signal: ${doctrine.dependencies[0] || "limited dependency data"}.`, sourceLabel: "Doctrine" },
  ];

  return { sponsorLikelihood, coSponsorLikelihood, abstentionRisk, amendmentResistance, compromiseProbability, coalitionFractureRisk, pressureVulnerability, rationale };
}

export function assessSponsorRole(
  entry: BlocEntry | undefined,
  intel: CountryIntel | undefined,
  _indicators: CountryIndicatorSnapshot | null,
  rawAgenda: string | NormalizedAgenda,
  perspectiveCountry?: string,
  negotiations: NegotiationState[] = [],
): SponsorAssessment {
  const agenda = asAgenda(rawAgenda);
  const country = entry?.country || intel?.country || "Country";
  const doctrine = getCountryDoctrine(country, intel, entry, agenda);
  const relationship = assessRelationship({ targetCountry: country, perspectiveCountry, agenda, entry, intel, negotiations });
  const contact = entry?.contactStatus || "none";
  const score = relationship.score;

  let role: SponsorAssessment["role"] = "swing";
  if (relationship.sponsorProbability >= 78 && contact === "committed") role = "sponsor";
  else if (relationship.sponsorProbability >= 64) role = "co-sponsor";
  else if (relationship.tacticalRole === "ally") role = "supporter";
  else if (relationship.tacticalRole === "swing" || score >= 43) role = "swing";
  else if (relationship.oppositionProbability < 72) role = "abstain";
  else role = "block";

  const confidence: "low" | "medium" | "high" = relationship.confidence;
  const conditions = [
    doctrine.priorities[0] ? `Address ${doctrine.priorities[0]} in operative wording` : "",
    doctrine.likelyObjections[0] ? `Neutralize objection: ${doctrine.likelyObjections[0]}` : "",
    relationship.workableConcession ? `Offer concession: ${relationship.workableConcession}` : "",
    contact === "none" ? "Initiate contact before counting this vote" : "Confirm commitment after clause wording changes",
  ].filter(Boolean);
  const basis: EvidenceItem[] = [
    { basis: entry ? "FACT" : "UNCERTAIN", claim: `${country} relationship score is ${score}/100 for "${agenda.rawAgenda}"; sponsor probability ${relationship.sponsorProbability}%, opposition probability ${relationship.oppositionProbability}%.`, sourceLabel: entry ? "Local Tracking + Relationship Model" : "Relationship Model" },
    { basis: "INFERENCE", claim: `Recommended role: ${relationship.tacticalRole}; ${relationship.nextMove}`, sourceLabel: "Country Doctrine" },
  ];

  return { role, confidence, conditions, basis };
}
