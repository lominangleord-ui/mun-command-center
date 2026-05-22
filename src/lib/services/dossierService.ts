/**
 * Country Intelligence Dossier Service
 *
 * Produces an evidence-backed CountryDossier by combining:
 *  – WorldBank macroeconomic and development indicators
 *  – GDELT geopolitical event signals (last 14 days, agenda-filtered)
 *  – OpenAlex scholarly / policy sources
 *  – REST Countries metadata
 *  – Local committee tracking data (bloc entry, contact status, notes)
 *
 * Design principles:
 *  – The RAW AGENDA is the primary axis of intelligence generation.
 *    classifyAgendaTopic() is only used for source query expansion
 *    and heuristic weighting — it must NOT replace the raw agenda
 *    in any final output or inference.
 *  – Every prose claim cites its evidence basis (FACT / INFERENCE / etc.)
 *  – Live API failures degrade gracefully to cached / stale / heuristic fallback
 *  – No invented facts; uncertainty is always labelled
 */

import type { CountryDossier, AgendaTopic, EvidenceItem, OperationalBrief } from "../../api/models/dossier";
import type { BlocEntry, CountryIntel, NegotiationState, CommitteePhase } from "../../types";
import type { CountryMetadata, CountryIndicatorSnapshot } from "../../api/models/country";
import type { GeopoliticalEvent } from "../../api/models/intelligence";
import type { PolicyResearchSource } from "../../api/models/research";
import type { FreshnessInfo } from "../../api/models/api";
import { detectLeveragePoints, detectPressurePoints, detectContradictions, projectGameTheory, assessSponsorRole, evaluateCommitteeTemperature } from "./strategyEngine";

import { getCountryMetadata } from "../../api/adapters/restCountries/restCountries.adapter";
import { getCountryIndicators } from "../../api/adapters/worldBank/worldBank.adapter";
import { searchGdeltEvents } from "../../api/adapters/gdelt/gdelt.adapter";
import { searchOpenAlexWorks } from "../../api/adapters/openAlex/openAlex.adapter";
import { cacheGet, cacheSet } from "../../api/core/cache";
import { normalizeAgenda, agendaKeywordQuery, type NormalizedAgenda } from "../intelligence/agendaNormalization";
import { getCountryDoctrine } from "../intelligence/countryDoctrine";
import { assessRelationship, buildCommitteeStrategy } from "../intelligence/relationshipModel";

export interface DossierContextOptions {
  selectedCountry?: string;
  committee?: string;
  phase?: CommitteePhase | string;
  bloc?: string;
  committeeEntries?: BlocEntry[];
  countryIntel?: CountryIntel[];
  negotiations?: NegotiationState[];
}

// ── Agenda topic classifier ── secondary only: drives source queries, not dossier content
export function classifyAgendaTopic(agenda: string): AgendaTopic {
  const a = agenda.toLowerCase();
  if (/climat|emission|carbon|temperature|sustainab|green.deal|cop\s*\d/i.test(a)) return "climate";
  if (/secur|peace|conflict|terror|disarm|nuclear|weapon|missile|ceasefire/i.test(a)) return "security";
  if (/trade|tariff|sanction|wto|import|export|supply.chain|economic.coer/i.test(a)) return "trade";
  if (/health|pandemic|covid|disease|who|pharma|vaccine|epidemic/i.test(a)) return "health";
  if (/tech|digital|ai\b|cyber|data.govern|innovat|internet.govern/i.test(a)) return "technology";
  if (/human.right|refugee|migra|gender|freedom|detention|disappear/i.test(a)) return "human-rights";
  if (/develop|poverty|sdg|aid|debt.relief|ldc|oda|financing.develop/i.test(a)) return "development";
  if (/peacekeep|pko|un.mission|mandate.renew|blue.helmet/i.test(a)) return "peacekeeping";
  if (/disarm|arms.control|npt|ctbt|cluster.munition|landmine/i.test(a)) return "disarmament";
  if (/un.reform|security.council.reform|charter|veto|membership/i.test(a)) return "reform";
  if (/migra|asylum|border|displacement|refugee.compact/i.test(a)) return "migration";
  return "general";
}

// ── GDELT query builder (agenda-aware) ──────────────────────────────────────
function buildGdeltQuery(country: string, agenda: NormalizedAgenda): string {
  const topicKeywords: Record<AgendaTopic, string> = {
    climate: "climate OR emissions OR \"Paris Agreement\" OR COP",
    security: "security OR conflict OR military OR ceasefire",
    trade: "trade OR sanctions OR tariffs OR \"WTO\"",
    health: "health OR pandemic OR vaccine OR WHO",
    technology: "technology OR digital OR cyber OR AI",
    "human-rights": "\"human rights\" OR refugees OR migration OR detention",
    development: "development OR SDG OR poverty OR aid",
    peacekeeping: "peacekeeping OR \"UN mission\" OR mandate",
    disarmament: "disarmament OR nuclear OR \"arms control\"",
    reform: "\"UN reform\" OR \"Security Council\" OR veto",
    migration: "migration OR refugees OR asylum OR border",
    general: "United Nations OR diplomacy",
  };
  const topic = agenda.primaryTopic;
  const keywordQuery = agendaKeywordQuery(agenda) || topicKeywords[topic];
  return `"${country}" AND (${keywordQuery} OR "${agenda.rawAgenda}")`;
}

// ── OpenAlex query builder ────────────────────────────────────────────────────
function buildOpenAlexQuery(country: string, agenda: NormalizedAgenda): string {
  return `${country} "${agenda.rawAgenda}" ${agenda.keywords.slice(0, 3).join(" ")} foreign policy`;
}

// ── Number formatting helpers ─────────────────────────────────────────────────
function formatGdp(gdp: number): string {
  if (gdp >= 1e12) return `$${(gdp / 1e12).toFixed(1)}T`;
  if (gdp >= 1e9) return `$${(gdp / 1e9).toFixed(1)}B`;
  return `$${(gdp / 1e6).toFixed(0)}M`;
}

function formatPop(pop: number): string {
  if (pop >= 1e9) return `${(pop / 1e9).toFixed(2)}B`;
  if (pop >= 1e6) return `${(pop / 1e6).toFixed(1)}M`;
  return `${(pop / 1e3).toFixed(0)}K`;
}

// ── Freshness chooser ────────────────────────────────────────────────────────
function worstFreshness(items: (FreshnessInfo | null | undefined)[]): FreshnessInfo {
  const order = { error: 4, stale: 3, unavailable: 2, cached: 1, fresh: 0, live: 0 } as const;
  const valid = items.filter(Boolean) as FreshnessInfo[];
  if (!valid.length) return { fetchedAt: new Date().toISOString(), cacheStatus: "unavailable" };
  return valid.sort((a, b) => (order[b.cacheStatus as keyof typeof order] ?? 0) - (order[a.cacheStatus as keyof typeof order] ?? 0))[0];
}

// ── Key-fact builder from WorldBank data (agenda-aware) ──────────────────────
function buildIndicatorFacts(indicators: CountryIndicatorSnapshot | null, rawAgenda: string, country: string): EvidenceItem[] {
  if (!indicators) return [];
  const facts: EvidenceItem[] = [];
  const src = indicators.source.name;
  const ts = indicators.freshness.fetchedAt;

  if (indicators.gdpNominal) {
    facts.push({
      basis: "FACT",
      claim: `GDP (nominal): ${formatGdp(indicators.gdpNominal)} — positions ${country} as a ${indicators.gdpNominal > 1e12 ? "major" : indicators.gdpNominal > 1e11 ? "mid-tier" : "smaller"} economy in multilateral financing discussions relevant to "${rawAgenda}".`,
      sourceLabel: src, sourceType: "worldbank", fetchedAt: ts,
    });
  }
  if (indicators.population) {
    facts.push({
      basis: "FACT",
      claim: `Population: ${formatPop(indicators.population)} — ${indicators.population > 5e7 ? "large domestic constituency amplifies the credibility of formal commitments on " + rawAgenda : "smaller population limits domestic political weight but may reduce internal resistance to concessions on " + rawAgenda}.`,
      sourceLabel: src, sourceType: "worldbank", fetchedAt: ts,
    });
  }
  if (indicators.gdpPerCapita) {
    const tier = indicators.gdpPerCapita > 15000 ? "high-income" : indicators.gdpPerCapita > 4000 ? "middle-income" : "low-income";
    facts.push({
      basis: "FACT",
      claim: `GDP per capita: ${formatGdp(indicators.gdpPerCapita)} (${tier}) — ${tier === "low-income" ? `on "${rawAgenda}" this increases leverage through development financing and capacity-building framing` : tier === "high-income" ? `this creates an expectation to bear implementation costs on "${rawAgenda}"` : `creates tension between donor expectations and recipient needs on "${rawAgenda}"`}.`,
      sourceLabel: src, sourceType: "worldbank", fetchedAt: ts,
    });
  }

  return facts;
}

// ── GDELT signal builder (agenda-aware) ─────────────────────────────────────
function buildGdeltInference(events: GeopoliticalEvent[], country: string, rawAgenda: string): EvidenceItem[] {
  if (!events.length) return [];
  const items: EvidenceItem[] = [];

  const tones = events.filter(e => typeof e.tone === "number").map(e => e.tone as number);
  if (tones.length >= 3) {
    const avg = tones.reduce((a, b) => a + b, 0) / tones.length;
    const toneLabel = avg < -3 ? "adversarial" : avg < 0 ? "cautious" : avg < 3 ? "neutral-to-constructive" : "cooperative";
    items.push({
      basis: "INFERENCE",
      claim: `Recent media coverage of ${country} on "${rawAgenda}" skews ${toneLabel} (avg. tone ${avg.toFixed(1)}). This ${avg < -2 ? "may indicate diplomatic friction that could complicate consensus-building on this specific issue" : "suggests the delegation has room to negotiate without domestic backlash on this issue"}.`,
      sourceLabel: "GDELT 2.0 (past 14 days)", sourceType: "gdelt", fetchedAt: events[0].source.fetchedAt ?? new Date().toISOString(),
    });
  }

  const headlines = events.slice(0, 3).map(e => e.title).filter(Boolean);
  if (headlines.length) {
    items.push({
      basis: "FACT",
      claim: `Recent coverage signals: "${headlines[0]}"${headlines[1] ? `, "${headlines[1]}"` : ""}. These headlines suggest ${country}'s position on "${rawAgenda}" is currently receiving international attention.`,
      sourceLabel: "GDELT 2.0", sourceType: "gdelt", fetchedAt: events[0].source.fetchedAt ?? new Date().toISOString(),
    });
  }

  return items;
}

// ── OpenAlex signal builder ───────────────────────────────────────────────────
function buildResearchSignals(works: PolicyResearchSource[], country: string, rawAgenda: string): EvidenceItem[] {
  if (!works.length) return [];
  const items: EvidenceItem[] = [];
  const cited = works.filter(w => (w.citedByCount ?? 0) > 10);
  if (cited.length) {
    items.push({
      basis: "FACT",
      claim: `Academic literature on ${country}'s policy engagement on "${rawAgenda}" includes ${cited.length} well-cited paper(s). Most relevant: "${cited[0].title}"${cited[0].authors[0] ? ` (${cited[0].authors[0]}${cited[0].year ? `, ${cited[0].year}` : ""})` : ""}.`,
      sourceLabel: "OpenAlex", sourceType: "openalex", fetchedAt: works[0].source.fetchedAt,
    });
  }
  return items;
}

// ── Bloc and local tracking inference — AGENDA-AWARE ─────────────────────────
function buildLocalIntelItems(
  entry: BlocEntry | undefined,
  intel: CountryIntel | undefined,
  country: string,
  rawAgenda: string,
  topic: AgendaTopic,
  perspectiveCountry?: string,
  perspectiveBloc?: string,
  negotiations: NegotiationState[] = [],
): { bloc: EvidenceItem[]; negotiation: EvidenceItem[]; redLines: EvidenceItem[]; resolution: EvidenceItem[]; action: EvidenceItem } {
  const bloc: EvidenceItem[] = [];
  const negotiation: EvidenceItem[] = [];
  const redLines: EvidenceItem[] = [];
  const resolution: EvidenceItem[] = [];

  const contactStatus = entry?.contactStatus || "none";
  const support = entry?.supportLevel ?? null;
  const risk = entry?.riskLevel ?? null;
  const stance = entry?.stance || "unknown";
  const contactedLabel = contactStatus !== "none" ? `Status: ${contactStatus}.` : "Not yet formally contacted.";
  const blocLabel = entry?.bloc || intel?.ideology || "unaligned";
  const normalized = normalizeAgenda(rawAgenda);
  const doctrine = getCountryDoctrine(country, intel, entry, normalized);
  const relation = assessRelationship({
    targetCountry: country,
    perspectiveCountry,
    perspectiveBloc,
    agenda: normalized,
    entry,
    intel,
    negotiations,
  });

  // ── Bloc behaviour — explicitly agenda-referenced ──
  bloc.push({
    basis: relation.confidence === "low" ? "UNCERTAIN" : "INFERENCE",
    claim: `From ${perspectiveCountry || "the selected delegation"}'s lens, ${country} is a ${relation.tacticalRole} (${relation.score}/100). Sponsor ${relation.sponsorProbability}%, oppose ${relation.oppositionProbability}%, bluff risk ${relation.bluffRisk}%. Drivers: ${relation.rationale.join("; ")}.`,
    sourceLabel: "Relationship Model",
    sourceType: "heuristic",
  });
  if (doctrine.issueRoles.length) {
    bloc.push({
      basis: "INFERENCE",
      claim: `${country}'s committee role on this agenda: ${doctrine.issueRoles.join(", ")}. Use that role to decide whether to ask for sponsorship, quiet abstention, bridge outreach, or amendment restraint.`,
      sourceLabel: doctrine.freshnessLabel,
      sourceType: "heuristic",
    });
  }
  if (intel?.votingTendencies) {
    bloc.push({ basis: "FACT", claim: `${intel.votingTendencies} — on "${rawAgenda}" this voting pattern will likely reappear unless the delegation is presented with new incentive structures.`, sourceLabel: "Local Intel Profile", sourceType: "local-tracking" });
  }
  if (intel?.allies?.length) {
    bloc.push({ basis: "FACT", claim: `On "${rawAgenda}", documented aligning partners are: ${intel.allies.slice(0, 4).join(", ")}. These bloc connections may shift if the agenda-specific framing changes.`, sourceLabel: "Local Intel Profile", sourceType: "local-tracking" });
  }
  if (support !== null) {
    bloc.push({ basis: "FACT", claim: `Current committee support level on "${rawAgenda}": ${support}%. ${support >= 75 ? "High — delegation is actively engaged on this issue." : support >= 50 ? "Moderate — manageable with targeted outreach on this specific topic." : "Low — this country is either uncommitted or drifting toward opposition on this issue."}`, sourceLabel: "Local Tracking", sourceType: "local-tracking" });
  }

  // ── Negotiation strategy — must reference raw agenda explicitly ──
  if (intel?.diplomacyNotes?.trim()) {
    negotiation.push({ basis: "FACT", claim: `${intel.diplomacyNotes.trim()} — apply this pattern to your approach on "${rawAgenda}".`, sourceLabel: "Local Intel Notes", sourceType: "local-tracking" });
  }
  negotiation.push({
    basis: "RECOMMENDATION",
    claim: `What to say: ${relation.whatToSay}`,
    sourceLabel: "Tactical Policy Index",
    sourceType: "heuristic",
  });
  negotiation.push({
    basis: "RECOMMENDATION",
    claim: `What to avoid: do not lead with "${relation.whatToAvoid}". If unavoidable, pair it with ${doctrine.preferredFraming[0] || "their preferred framing"} before asking for support.`,
    sourceLabel: "Relationship Model",
    sourceType: "heuristic",
  });
  if (doctrine.concessionPaths.length) {
    negotiation.push({
      basis: "RECOMMENDATION",
      claim: `Concession that can work: ${relation.workableConcession}. If they hesitate, test abstention or amendment restraint before forcing a public yes/no.`,
      sourceLabel: "Tactical Policy Index",
      sourceType: "heuristic",
    });
  }
  if (doctrine.supportConditions.length) {
    negotiation.push({
      basis: "INFERENCE",
      claim: `Support conditions to verify before counting the vote: ${doctrine.supportConditions.slice(0, 3).join("; ")}.`,
      sourceLabel: doctrine.confidence === "high" ? "Country Doctrine" : "Doctrine Fallback",
      sourceType: "heuristic",
    });
  }
  negotiation.push({
    basis: stance === "swing" ? "INFERENCE" : "FACT",
    claim: `${contactedLabel}${stance === "ally" ? ` On "${rawAgenda}", bilateral engagement is established — focus on locking in specific operative clause wording that matches ${intel?.strategicInterests?.[0] || "their stated priorities"}.` : stance === "swing" ? ` On "${rawAgenda}", this is a high-value uncommitted delegation. Most responsive to proposals that address ${intel?.strategicInterests?.[0] || "their core interests"} in the specific context of this issue.` : stance === "opponent" ? ` On "${rawAgenda}", approach with an understanding of their red lines rather than direct persuasion attempts.` : ` On "${rawAgenda}", introduce early-stage bilateral dialogue before the moderated caucus to establish a baseline position.`}`,
    sourceLabel: "Local Tracking", sourceType: "local-tracking",
  });
  if (support !== null && risk !== null && risk > 60) {
    negotiation.push({ basis: "INFERENCE", claim: `Elevated risk score (${risk}%) on "${rawAgenda}" indicates potential late-session volatility. Secure written or public commitments early if possible on this issue.`, sourceLabel: "Risk Assessment", sourceType: "local-tracking" });
  }
  if (relation.bluffRisk >= 65) {
    negotiation.push({ basis: "INFERENCE", claim: `Bluff warning: ${relation.warning}`, sourceLabel: "Relationship Model", sourceType: "heuristic" });
  }

  // ── Red lines — always agenda-anchored ──
  for (const line of doctrine.redLines.slice(0, 3)) {
    redLines.push({
      basis: "INFERENCE",
      claim: `Do not lead with: ${line}. If this idea is necessary, pair it with ${doctrine.preferredFraming[0] || "their preferred framing"} before asking ${country} to support it.`,
      sourceLabel: "Tactical Policy Index",
      sourceType: "heuristic",
    });
  }
  if (intel?.rivals?.length) {
    redLines.push({ basis: "INFERENCE", claim: `On "${rawAgenda}", proposals strongly aligned with ${intel.rivals.slice(0, 2).join(" or ")} interests may trigger resistance regardless of substantive merit.`, sourceLabel: "Local Intel Profile", sourceType: "local-tracking" });
  }
  if (doctrine.likelyObjections.length) {
    redLines.push({ basis: "INFERENCE", claim: `Expected objection from ${country}: ${doctrine.likelyObjections[0]}. Prepare substitute wording before the bilateral.`, sourceLabel: "Agenda Doctrine", sourceType: "heuristic" });
  }

  // Topic-specific red lines with raw agenda context
  const topicRedLines: Record<string, string> = {
    climate: "Binding, externally audited emissions targets with punitive non-compliance mechanisms.",
    "human-rights": "Mandated monitoring with public country-specific reporting.",
    security: "Force-authorisation language that bypasses regional security frameworks.",
    trade: "Sanction provisions with extraterritorial reach.",
    development: "Conditionality requirements tied to domestic governance benchmarks.",
    technology: "Data localisation mandates or IP restriction clauses.",
    disarmament: "Asymmetric obligations that do not apply equally to nuclear-weapon states.",
    health: "Mandatory vaccination or treatment regimes without sovereignty safeguards.",
    peacekeeping: "Open-ended mandate renewal without withdrawal mechanisms.",
    migration: "Mandatory refugee quota systems without consent frameworks.",
    reform: "Reduction of Security Council veto power or permanent membership expansion.",
  };
  if (topicRedLines[topic]) {
    redLines.push({ basis: "INFERENCE", claim: `On "${rawAgenda}": ${topicRedLines[topic]}`, sourceLabel: "Topical Pattern Analysis", sourceType: "heuristic" });
  }
  // Always add an agenda-specific red line even for "general" topics
  if (topic === "general") {
    redLines.push({ basis: "INFERENCE", claim: `On "${rawAgenda}": externally imposed obligations that override domestic policy space will likely trigger resistance from ${country}.`, sourceLabel: "Agenda-Agnostic Heuristic", sourceType: "heuristic" });
  }

  // ── Resolution preferences — always agenda-referenced ──
  if (doctrine.clauseCompatibility.length) {
    resolution.push({
      basis: "RECOMMENDATION",
      claim: `Clause compatibility for ${country}: ${relation.clauseCompatibility.slice(0, 3).join("; ")}. Sponsor probability is ${relation.sponsorProbability}% if the clause visibly protects ${doctrine.supportConditions[0] || doctrine.priorities[0] || "their first condition"}.`,
      sourceLabel: "Tactical Policy Index",
      sourceType: "heuristic",
    });
  }
  if (doctrine.rejectedFraming.length) {
    resolution.push({
      basis: "INFERENCE",
      claim: `Wording likely to trigger amendments or resistance: ${doctrine.rejectedFraming.slice(0, 3).join("; ")}.`,
      sourceLabel: "Tactical Policy Index",
      sourceType: "heuristic",
    });
  }
  const topicResolution: Record<string, string> = {
    climate: "Likely to prefer preambulatory language recognising common-but-differentiated responsibilities and requesting rather than demanding specific targets.",
    security: "May prefer language emphasising dialogue, sovereignty, and graduated response over automatic enforcement triggers.",
    development: "Will favour operative clauses with funding pledges, technology transfer provisions, and explicit references to the SDG framework.",
    "human-rights": "Prefers broad principled language in preambles, with voluntary compliance mechanisms rather than mandatory monitoring.",
    trade: "Resists language implying extraterritorial enforcement; prefers dialogue-based consultation frameworks.",
    technology: "Seeks technology transfer provisions; resists IP restriction clauses and data localisation mandates.",
    health: "Supports equitable access language; scrutinises compliance obligations tied to financing.",
    peacekeeping: "Prefers clear mandate scope, withdrawal mechanisms, and regional consent-based authorization.",
    disarmament: "Scrutinises asymmetric obligations; prefers multilateral consensus language.",
    reform: "Position depends on current Security Council access and regional credibility.",
    migration: "Resists mandatory quota systems; supports voluntary burden-sharing frameworks.",
  };
  if (topicResolution[topic]) {
    resolution.push({ basis: "INFERENCE", claim: `On "${rawAgenda}": ${topicResolution[topic]}`, sourceLabel: "Topical Pattern", sourceType: "heuristic" });
  } else {
    resolution.push({ basis: "INFERENCE", claim: `On "${rawAgenda}": this delegation is likely to evaluate proposals through the lens of ${blocLabel} coordination and national sovereignty — propose language that preserves domestic policy space while showing engagement.`, sourceLabel: "Agenda-Agnostic Heuristic", sourceType: "heuristic" });
  }
  if (blocLabel.includes("G77") || blocLabel.includes("NAM")) {
    resolution.push({ basis: "INFERENCE", claim: `On "${rawAgenda}": will push for operative clauses that include financing mechanisms and capacity-building provisions with minimal conditionality.`, sourceLabel: "Bloc Pattern", sourceType: "heuristic" });
  }
  if (intel?.strategicInterests?.length) {
    resolution.push({ basis: "INFERENCE", claim: `Resolution language on "${rawAgenda}" that visibly acknowledges ${intel.strategicInterests[0]} is likely to increase this delegation's co-sponsorship willingness.`, sourceLabel: "Strategic Interest Profile", sourceType: "local-tracking" });
  }
  resolution.push({ basis: "INFERENCE", claim: `Clause preference for ${country}: ${doctrine.negotiationStyle}. Likely amendment behavior: ${doctrine.amendmentTendency}; keep fallback language ready for ${doctrine.likelyObjections[0] || doctrine.priorities[0] || "their first stated condition"}.`, sourceLabel: "Country Doctrine", sourceType: "heuristic" });

  // ── Recommended action — always agenda-specific ──
  let actionClaim: string;
  if (stance === "ally" && contactStatus === "committed") {
    actionClaim = `On "${rawAgenda}": ${country} is committed. Focus now on using their credibility to persuade swing states. Consider requesting public co-sponsorship or a floor statement of support on this specific issue.`;
  } else if (stance === "ally") {
    actionClaim = `On "${rawAgenda}": ${country} is tracked as an ally but not yet formally committed. Secure agreement on specific operative clause wording that addresses their stated interests on this issue before the drafting session begins.`;
  } else if (stance === "swing") {
    actionClaim = `On "${rawAgenda}": ${country} is the highest-value uncommitted delegation. Initiate a structured bilateral — bring a concrete proposal that addresses their first-ranked interest (${intel?.strategicInterests?.[0] || "sovereign policy space"}) specifically in the context of this issue.`;
  } else if (stance === "opponent") {
    actionClaim = `On "${rawAgenda}": ${country} is in opposition. Map their red lines on this specific issue precisely. If a procedural path to isolation exists, that may be more productive than attempted conversion.`;
  } else {
    actionClaim = `On "${rawAgenda}": ${country}'s position is unresolved. Prioritise an early floor observation in the next moderated caucus, then initiate contact with a targeted bilateral ask on this specific issue.`;
  }
  if (relation.posture === "avoid") {
    actionClaim = `On "${rawAgenda}": do not spend first-contact time trying to convert ${country}. Use a third-party bridge or isolate the exact red line (${doctrine.redLines[0] || doctrine.likelyObjections[0] || "unknown"}) and aim for abstention or amendment restraint.`;
  } else if (stance === "ally" && contactStatus === "committed") {
    actionClaim = `On "${rawAgenda}": ${country} is committed. Ask for visible help: a co-sponsor signature, a floor line defending ${doctrine.clauseCompatibility[0] || "your strongest operative clause"}, or pressure on one swing state.`;
  } else if (relation.posture === "approach") {
    actionClaim = `On "${rawAgenda}": approach ${country} early. Put ${doctrine.supportConditions[0] || doctrine.priorities[0] || "their first condition"} into operative wording and ask whether they can co-sponsor or publicly defend it.`;
  } else if (relation.posture === "pressure") {
    actionClaim = `On "${rawAgenda}": treat ${country} as movable but not reliable. Offer ${doctrine.concessionPaths[0] || "softer implementation wording"} and ask for an abstain/yes threshold before counting support.`;
  } else {
    actionClaim = `On "${rawAgenda}": monitor ${country} until a concrete clause is ready. Then test ${doctrine.preferredFraming[0] || "their preferred framing"} against ${doctrine.rejectedFraming[0] || "their first red line"}.`;
  }
  actionClaim += ` ${relation.nextMove} Risk warning: ${relation.warning}`;
  const action: EvidenceItem = { basis: "RECOMMENDATION", claim: actionClaim, sourceLabel: "Committee Assessment", sourceType: "local-tracking" };

  return { bloc, negotiation, redLines, resolution, action };
}

// ── Overview paragraph — the single most important output ─────────────────────
// This MUST use rawAgenda as the primary driver, not topic.
function buildOverview(
  country: string,
  rawAgenda: string,
  topic: AgendaTopic,
  meta: CountryMetadata | null,
  indicators: CountryIndicatorSnapshot | null,
  entry: BlocEntry | undefined,
  intel: CountryIntel | undefined,
  gdeltSignals: boolean,
): EvidenceItem {
  const stance = entry?.stance || "unresolved";
  const bloc = entry?.bloc || intel?.ideology || meta?.subregion || "independent";
  const support = entry?.supportLevel;
  const region = meta?.region || intel?.ideology || "";
  const normalized = normalizeAgenda(rawAgenda);
  const doctrine = getCountryDoctrine(country, intel, entry, normalized);

  const parts: string[] = [];

  // Identity
  parts.push(`${country}${region ? `, a ${region}-based actor` : ""}${bloc && bloc !== "independent" && bloc !== "unaligned" ? ` aligned with ${bloc}` : ""},`);

  // Economic character
  if (indicators?.gdpNominal) {
    const gdpTier = indicators.gdpNominal > 1e12 ? "major economy" : indicators.gdpNominal > 1e11 ? "mid-sized economy" : "smaller economy";
    parts.push(`is a ${gdpTier} (GDP ${formatGdp(indicators.gdpNominal)})`);
  } else {
    parts.push("has an unverified economic profile [no World Bank data available]");
  }

  // CRITICAL: Use rawAgenda as the primary axis, not topic classification
  // This ensures "Middle Eastern Disturbances" and "Population Control" produce different outputs
  const lowAgenda = rawAgenda.toLowerCase();
  let agendaPosture: string;

  if (/disturb|conflict|tension|crisis|instability|proxy|non-state|fragmentation|governance/i.test(lowAgenda)) {
    agendaPosture = doctrine.agendaPosture;
  } else if (/population|demograph|birth|fertility|reproductive/i.test(lowAgenda)) {
    agendaPosture = `whose position on "${rawAgenda}" is shaped by demographic policy, development framing, and domestic sovereignty concerns around reproductive and population governance`;
  } else if (/sanction|enforcement|compliance/i.test(lowAgenda)) {
    agendaPosture = `likely to resist enforcement-heavy language on "${rawAgenda}" while supporting voluntary compliance and capacity-building mechanisms`;
  } else if (/humanitarian|aid|relief|refugee|displacement/i.test(lowAgenda)) {
    agendaPosture = `expected to support humanitarian access provisions on "${rawAgenda}" while carefully monitoring compliance obligations`;
  } else if (/peacekeep|mission|mandate|deploy/i.test(lowAgenda)) {
    agendaPosture = `whose engagement with "${rawAgenda}" historically depends on mandate clarity, regional consent, and operational scope`;
  } else {
    // For recognized topics, use the topic-specific framing
    const topicFrame: Record<string, string> = {
      climate: indicators?.co2Emissions && indicators.co2Emissions > 1e6
        ? `whose emissions profile creates pressure to accept reduction language on "${rawAgenda}", though likely to demand differentiated obligations`
        : `likely to frame "${rawAgenda}" around development financing and capacity-building`,
      security: `whose security engagement pattern suggests ${stance === "ally" ? "constructive participation in enforcement frameworks" : "caution around enforcement mechanisms"} on "${rawAgenda}"`,
      trade: `likely to prioritise market access preservation on "${rawAgenda}" and resist extraterritorial sanction mechanisms`,
      health: `expected to support equitable access provisions on "${rawAgenda}" while monitoring compliance obligations`,
      technology: `likely to seek technology transfer provisions on "${rawAgenda}" and resist IP-heavy enforcement clauses`,
      "human-rights": `likely to engage on "${rawAgenda}" through the lens of sovereignty and non-interference`,
      development: `whose development financing needs make it a natural advocate for SDG-aligned financing on "${rawAgenda}"`,
      peacekeeping: `whose engagement on "${rawAgenda}" depends on mandate clarity and regional alignment`,
      disarmament: `likely to support multilateral frameworks on "${rawAgenda}" while scrutinising asymmetric obligations`,
      reform: `whose position on "${rawAgenda}" depends heavily on its current institutional access and regional credibility`,
      migration: `whose migration policy shapes its approach to "${rawAgenda}" through demographic and bilateral agreement lenses`,
      general: `whose stance on "${rawAgenda}" is shaped by its regional bloc coordination and bilateral commitments`,
    };
    agendaPosture = topicFrame[topic] || topicFrame.general;
  }
  parts.push(agendaPosture);

  // Stance signal
  if (support !== undefined) {
    parts.push(`Current support level: ${support}%. ${support >= 75 ? "Active engagement expected on this issue." : support >= 50 ? "Engagement manageable with targeted outreach on this issue." : "Low engagement — may be withholding or uncommitted on this issue."}`);
  }

  if (gdeltSignals) {
    parts.push("Recent geopolitical coverage is active on this topic — see GDELT signals below.");
  }

  return {
    basis: indicators ? "INFERENCE" : "UNCERTAIN",
    claim: parts.join(" "),
    sourceLabel: [
      indicators ? "World Bank" : null,
      gdeltSignals ? "GDELT" : null,
      entry ? "Local Tracking" : null,
    ].filter(Boolean).join(", ") || "Heuristic Model",
    sourceType: indicators ? "worldbank" : "heuristic",
  };
}

// ── Agenda slugifier ────────────────────────────────────────────────────────
function slugifyAgenda(agenda: string): string {
  return agenda.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "unspecified";
}

function stableHash(input: unknown): string {
  const text = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
}

// ── Debug logging ───────────────────────────────────────────────────────────
function debugLog(stage: string, data: unknown): void {
  if (typeof process !== "undefined" && (process as any).env?.NODE_ENV !== "production") {
    console.log(`[dossier:${stage}]`, data);
  }
}

// ── Master dossier builder ────────────────────────────────────────────────────
function buildOperationalBrief(
  country: string,
  agenda: NormalizedAgenda,
  entry: BlocEntry | undefined,
  intel: CountryIntel | undefined,
  options: DossierContextOptions,
): OperationalBrief {
  const doctrine = getCountryDoctrine(country, intel, entry, agenda);
  const relationship = assessRelationship({
    targetCountry: country,
    perspectiveCountry: options.selectedCountry,
    perspectiveBloc: options.bloc,
    agenda,
    entry,
    intel,
    negotiations: options.negotiations || [],
  });
  const committee = buildCommitteeStrategy({
    entries: options.committeeEntries || [],
    intelProfiles: options.countryIntel || [],
    selectedCountry: options.selectedCountry,
    selectedBloc: options.bloc,
    agenda,
    negotiations: options.negotiations || [],
  });
  const riskWarnings = [
    relationship.warning,
    ...committee.warnings,
    relationship.bluffRisk >= 65 ? `${country} may be bluffing: verify a written condition or public floor line before counting support.` : "",
    relationship.oppositionProbability >= 68 ? `${country} is likely to oppose unless "${relationship.whatToAvoid}" is removed, softened, or balanced.` : "",
  ].filter(Boolean).slice(0, 6);

  return {
    targetCountry: country,
    selectedCountry: options.selectedCountry,
    relationshipRole: relationship.tacticalRole,
    confidence: relationship.confidence,
    sponsorProbability: relationship.sponsorProbability,
    oppositionProbability: relationship.oppositionProbability,
    bluffRisk: relationship.bluffRisk,
    allies: committee.allies,
    rivals: committee.rivals,
    swingStates: committee.swingStates,
    likelyOpponents: committee.likelyOpponents,
    sponsorTargets: committee.sponsorTargets,
    strategicInterests: doctrine.priorities.slice(0, 5),
    redLines: doctrine.redLines.slice(0, 5),
    negotiationStrategy: [
      relationship.whatToSay,
      `Concession: ${relationship.workableConcession}`,
      `Ask for: ${doctrine.supportConditions[0] || "a yes/abstain threshold tied to exact wording"}`,
    ],
    whatToSay: relationship.whatToSay,
    whatToAvoid: relationship.whatToAvoid,
    exploitableLeverage: relationship.leverage,
    clauseCompatibility: relationship.clauseCompatibility,
    riskWarnings,
    recommendedNextMove: relationship.nextMove,
  };
}

const DOSSIER_TTL = 20 * 60 * 1000; // 20 minutes

export async function buildCountryDossier(
  country: string,
  agenda: string,
  entry: BlocEntry | undefined,
  intel: CountryIntel | undefined,
  options: DossierContextOptions = {},
): Promise<CountryDossier> {
  const normalizedAgenda = normalizeAgenda(agenda);
  const topic = normalizedAgenda.primaryTopic;
  const agendaSlug = slugifyAgenda(normalizedAgenda.rawAgenda);
  const fingerprint = stableHash({
    agenda: normalizedAgenda.rawAgenda,
    normalizedAgenda: normalizedAgenda.normalizedAgendaId,
    committee: options.committee,
    phase: options.phase,
    country,
    selectedCountry: options.selectedCountry,
    bloc: options.bloc || entry?.bloc || intel?.ideology,
    entry: entry ? { stance: entry.stance, support: entry.supportLevel, risk: entry.riskLevel, contact: entry.contactStatus, bloc: entry.bloc, notes: entry.notes, updatedAt: entry.updatedAt } : null,
    intel: intel ? { ideology: intel.ideology, interests: intel.strategicInterests, rivals: intel.rivals, dependencies: intel.dependencies, concerns: intel.regionalConcerns, voting: intel.votingTendencies, notes: intel.diplomacyNotes, risk: intel.riskLevel, support: intel.supportLevel } : null,
    committeeEntries: (options.committeeEntries || []).map((item) => ({ country: item.country, stance: item.stance, support: item.supportLevel, risk: item.riskLevel, contact: item.contactStatus, bloc: item.bloc })),
    countryIntel: (options.countryIntel || []).map((item) => ({ country: item.country, interests: item.strategicInterests, rivals: item.rivals, risk: item.riskLevel, support: item.supportLevel })),
    negotiations: (options.negotiations || []).filter((n) => n.country.toLowerCase() === country.toLowerCase()).map((n) => ({ status: n.status, demands: n.demands, concessions: n.concessions, redLines: n.redLines, promises: n.promises, updatedAt: n.updatedAt })),
  });

  const cacheKey = `dossier:v3:${country.toLowerCase()}:${agendaSlug}:${fingerprint}`;

  debugLog("input", { country, agenda, normalizedAgenda, agendaSlug, topic, fingerprint });
  debugLog("cache-key", cacheKey);

  const cached = cacheGet<CountryDossier>(cacheKey);
  if (cached.value) {
    debugLog("cache-hit", { cacheKey, agenda: agenda });
    return cached.value;
  }
  debugLog("cache-miss", { cacheKey });

  // Parallel fetch — all failures are handled gracefully
  const [metaResult, indicatorsResult, gdeltResult, openAlexResult] = await Promise.allSettled([
    getCountryMetadata(country),
    getCountryMetadata(country).then(r =>
      r.success && r.data?.iso3 ? getCountryIndicators(r.data.iso3) : Promise.resolve(null)
    ),
    searchGdeltEvents(buildGdeltQuery(country, normalizedAgenda)),
    searchOpenAlexWorks(buildOpenAlexQuery(country, normalizedAgenda), 5),
  ]);

  const meta: CountryMetadata | null = metaResult.status === "fulfilled" && metaResult.value.success ? metaResult.value.data ?? null : null;
  const indicators: CountryIndicatorSnapshot | null = indicatorsResult.status === "fulfilled" && indicatorsResult.value !== null && (indicatorsResult.value as any)?.success ? (indicatorsResult.value as any).data ?? null : null;
  const events: GeopoliticalEvent[] = gdeltResult.status === "fulfilled" && gdeltResult.value.success ? gdeltResult.value.data ?? [] : [];
  const works: PolicyResearchSource[] = openAlexResult.status === "fulfilled" && openAlexResult.value.success ? openAlexResult.value.data ?? [] : [];

  debugLog("data-quality", {
    meta: !!meta, indicators: !!indicators, events: events.length, works: works.length,
  });

  const dataQuality = {
    hasLiveWorldBankData: indicators !== null,
    hasLiveGdeltSignals: events.length > 0,
    hasOpenAlexSources: works.length > 0,
    hasLiveMetadata: meta !== null,
    hasLocalTrackingData: entry !== undefined,
  };

  // Build evidence items — ALL agenda-aware
  const indicatorFacts = buildIndicatorFacts(indicators, agenda, country);
  const gdeltItems = buildGdeltInference(events, country, agenda);
  const openAlexItems = buildResearchSignals(works, country, agenda);
  const { bloc, negotiation, redLines, resolution, action } = buildLocalIntelItems(
    entry,
    intel,
    country,
    agenda,
    topic,
    options.selectedCountry,
    options.bloc,
    options.negotiations || [],
  );
  const overview = buildOverview(country, agenda, topic, meta, indicators, entry, intel, events.length > 0);

  debugLog("evidence-summary", {
    indicatorFacts: indicatorFacts.length,
    gdeltItems: gdeltItems.length,
    openAlexItems: openAlexItems.length,
    blocClaims: bloc.length,
    negotiationClaims: negotiation.length,
    redLineClaims: redLines.length,
    resolutionClaims: resolution.length,
    overviewExcerpt: overview.claim.slice(0, 80),
  });

  // Confidence scoring
  const signalCount = [
    dataQuality.hasLiveWorldBankData,
    dataQuality.hasLiveGdeltSignals,
    dataQuality.hasOpenAlexSources,
    dataQuality.hasLocalTrackingData,
  ].filter(Boolean).length;
  const confidence = signalCount >= 3 ? "high" : signalCount >= 1 ? "medium" : "low";

  // Sources list
  const allSources = [
    meta ? meta.source : null,
    indicators ? indicators.source : null,
    events[0] ? events[0].source : null,
    works[0] ? works[0].source : null,
  ].filter(Boolean) as any[];

  const freshnessList = [meta?.freshness, indicators?.freshness].filter(Boolean) as FreshnessInfo[];

  // Strategy engine outputs — all pass rawAgenda
  const leveragePoints = detectLeveragePoints(country, topic, normalizedAgenda, intel, indicators, entry, options.selectedCountry, options.negotiations);
  const pressurePoints = detectPressurePoints(normalizedAgenda, country, intel, indicators, entry, options.selectedCountry, options.negotiations);
  const contradictions = detectContradictions(country, normalizedAgenda, intel, indicators, entry, events, options.selectedCountry);
  const gameTheory = projectGameTheory(entry, intel, indicators, normalizedAgenda, events, options.selectedCountry, options.negotiations);
  const sponsorAssessment = assessSponsorRole(entry, intel, indicators, normalizedAgenda, options.selectedCountry, options.negotiations);
  const operationalBrief = buildOperationalBrief(country, normalizedAgenda, entry, intel, options);
  
  // Create a default empty array for bloc entries to evaluate temperature if we don't have the full context
  // To avoid changing the entire function signature, we'll evaluate based on the single entry if that's all we have
  const committeeEntriesForTemp = entry ? [entry] : [];
  const temp = evaluateCommitteeTemperature(committeeEntriesForTemp, events, options.phase || "debate");

  debugLog("strategy-outputs", {
    leverage: leveragePoints.length,
    pressure: pressurePoints.length,
    contradictions: contradictions.length,
    sponsorRole: sponsorAssessment.role,
  });

  const dossier: CountryDossier = {
    countryKey: meta?.iso2 || country.toLowerCase().slice(0, 2).toUpperCase(),
    country,
    agenda: normalizedAgenda.rawAgenda,
    agendaTopic: topic,
    overview,
    keyFacts: indicatorFacts,
    strategicInference: [...gdeltItems, ...openAlexItems],
    blocBehaviour: bloc,
    negotiationStrategy: negotiation,
    redLines,
    resolutionPreferences: resolution,
    recommendedAction: action,
    committeeDynamics: {
      currentPhase: "debate",
      temperature: temp.temperature,
      temperatureRationale: temp.rationale,
    },
    leveragePoints,
    pressurePoints,
    contradictions,
    gameTheory,
    sponsorAssessment,
    operationalBrief,
    confidence,
    overallFreshness: worstFreshness(freshnessList),
    sources: allSources,
    generatedAt: new Date().toISOString(),
    dataQuality,
  };

  cacheSet(cacheKey, dossier, DOSSIER_TTL);
  debugLog("cached", { cacheKey });

  return dossier;
}
