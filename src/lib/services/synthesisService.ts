import type { CountryStrategicSummary, BlocEntry, SourcedBlocTrend, CountryIntel, FreshnessInfo } from "../../types";
import type { CountryInfo } from "../countries";

// ── Archetype classification ──
type Archetype = "major_power" | "regional_anchor" | "swing_actor" | "bloc_loyalist" | "small_state" | "opposition_core" | "bridge_actor" | "sparse_data";

function classifyArchetype(entry: BlocEntry | undefined, _intel: CountryIntel | undefined, info: CountryInfo | undefined): Archetype {
  if (!entry) return "sparse_data";
  const s = entry.supportLevel;
  const r = entry.riskLevel;
  const stance = entry.stance;
  if (stance === "opponent" && r > 60) return "opposition_core";
  if (stance === "swing" && s > 30 && s < 70) return "swing_actor";
  if (stance === "ally" && s >= 80) return info?.defaultBloc ? "regional_anchor" : "major_power";
  if (stance === "ally" && s >= 60) return "bloc_loyalist";
  if (stance === "neutral" && r < 30) return "bridge_actor";
  if (s < 30) return "small_state";
  return "sparse_data";
}

// ── Stable per-country seed for deterministic variation ──
// Stable hash for future deterministic variation
// function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

// ── Agenda keyword detection ──
function agendaThemes(agenda: string): { climate: boolean; security: boolean; trade: boolean; health: boolean; tech: boolean; rights: boolean; development: boolean } {
  const a = agenda.toLowerCase();
  return {
    climate: /climat|environment|carbon|emission|sustainab|green/i.test(a),
    security: /secur|peace|conflict|terror|disarm|nuclear|cyber/i.test(a),
    trade: /trade|tariff|econom|sanction|finance|invest/i.test(a),
    health: /health|pandemic|disease|who|pharma/i.test(a),
    tech: /tech|digital|ai|cyber|innovat/i.test(a),
    rights: /human rights|refugee|migra|gender|freedom/i.test(a),
    development: /develop|poverty|sdg|aid|debt/i.test(a),
  };
}

// ── The core posture composer — builds genuinely distinct prose ──
function composePosture(country: string, archetype: Archetype, bloc: string, agenda: string, intel: CountryIntel | undefined, entry: BlocEntry | undefined): string {
  const themes = agendaThemes(agenda);
  const interests = intel?.strategicInterests?.slice(0, 2) || [];
  const interestPhrase = interests.length ? interests.join(" and ").toLowerCase() : "";
  const s = entry?.supportLevel ?? 50;
  const r = entry?.riskLevel ?? 30;
  const contacted = entry?.contactStatus !== "none" && entry?.contactStatus !== undefined;

  // Build country-specific agenda hook
  let agendaHook = "";
  if (themes.climate) agendaHook = interestPhrase ? `approach climate negotiations through the lens of ${interestPhrase}` : "frame climate obligations around domestic economic capacity";
  else if (themes.security) agendaHook = interestPhrase ? `evaluate security proposals against ${interestPhrase}` : "prioritize sovereignty-preserving security frameworks";
  else if (themes.trade) agendaHook = "focus on market access protections and implementation flexibility";
  else if (themes.health) agendaHook = "emphasize equitable access to health infrastructure and pharmaceutical sovereignty";
  else if (themes.tech) agendaHook = "seek technology transfer provisions and resist restrictive IP frameworks";
  else if (themes.rights) agendaHook = "balance rights-based language with sovereignty concerns";
  else if (themes.development) agendaHook = "anchor proposals in development financing and capacity-building";
  else agendaHook = "pursue outcomes that strengthen its strategic positioning";

  // Compose distinct prose per archetype + country signals
  switch (archetype) {
    case "major_power":
      return `${country} will likely ${agendaHook}, leveraging institutional weight to shape resolution language early in debate. The delegation typically negotiates from a position of structural leverage — expect framework-setting interventions rather than reactive amendments.${s > 80 ? ` Current ${s}% support suggests the delegation is investing heavily in this outcome.` : ""}`;

    case "regional_anchor":
      return `${country} serves as the anchor for ${bloc} coordination on this agenda. The delegation is expected to ${agendaHook} while maintaining coalition discipline among regional partners.${r > 40 ? ` However, internal bloc tensions (${r}% risk) suggest flexibility on secondary clauses may be necessary to hold the group together.` : ` Bloc cohesion appears strong — ${country} can negotiate with confidence that its regional partners will follow.`}`;

    case "swing_actor":
      return `${country}'s position remains genuinely open. The delegation will likely ${agendaHook}, but final alignment depends on which bloc offers more concrete concessions.${contacted ? " Initial contact has been established — follow up with specific proposal language." : " No formal contact yet — this is the highest-priority outreach target for the next unmoderated caucus."} ${r > 50 ? "Caution: this delegation has shown volatility and may reverse commitments under pressure." : "The delegation appears receptive to structured engagement."}`;

    case "bloc_loyalist":
      return `${country} will follow ${bloc} consensus and ${agendaHook} within that framework. Independent deviation is unlikely unless the agenda directly threatens a core national interest.${intel?.votingTendencies ? ` Voting pattern: ${intel.votingTendencies.slice(0, 120)}.` : ""} Engage through bloc leadership channels rather than bilateral approaches.`;

    case "small_state":
      return `${country} carries limited floor weight but may prove decisive in close votes. The delegation will prioritize ${interestPhrase || "sovereignty protections and access to multilateral support"} over ambitious commitments. ${r < 25 ? "Low-risk partner for co-sponsorship on non-controversial clauses." : "May be susceptible to pressure from larger delegation partners."} Targeted outreach with specific co-sponsorship asks could yield disproportionate returns.`;

    case "opposition_core":
      return `${country} is actively opposing current resolution framing and is likely coordinating counter-proposals${bloc !== "unaligned" ? ` within the ${bloc} group` : ""}. The delegation's primary concern is ${interestPhrase || "preserving strategic autonomy"}.${r > 70 ? " High coordination risk — expect organized procedural resistance and unfriendly amendments." : " Opposition is substantive but not yet procedurally aggressive."} Focus engagement on understanding non-negotiable red lines rather than attempting conversion.`;

    case "bridge_actor":
      return `${country} occupies neutral ground and may facilitate compromise between competing positions. The delegation tends to ${agendaHook} while prioritizing procedural fairness and inclusive drafting.${s > 60 ? " Currently leaning favourable — consider involving in working group leadership or friends-of-the-chair roles." : " Position is genuinely uncommitted — requires substantive engagement, not just procedural inclusion."}`;

    case "sparse_data":
      return `Limited tracking data available for ${country}. ${intel?.ideology ? `Known orientation: ${intel.ideology}. ` : ""}${interestPhrase ? `Likely concerned with ${interestPhrase}. ` : ""}Confidence in any positional assessment is low until direct floor observation or bilateral engagement establishes a baseline.`;
  }
}

// ── Agenda relevance — woven into the country's actual concerns ──
function composeAgendaRelevance(country: string, agenda: string, _archetype: Archetype, intel: CountryIntel | undefined, bloc: string): string {
  if (!agenda) return "No committee agenda configured — unable to assess relevance.";
  const themes = agendaThemes(agenda);
  const concerns = intel?.regionalConcerns?.slice(0, 2).join(" and ") || "";

  if (themes.climate && bloc === "G77") return `The climate agenda intersects directly with ${country}'s development financing needs. Expect strong advocacy for differentiated obligations and climate-finance mechanisms.`;
  if (themes.climate && bloc === "Western") return `${country} will likely support ambitious targets but insist on verification mechanisms and structured implementation timelines.`;
  if (themes.climate) return `Climate commitments will be evaluated against ${country}'s economic capacity and ${concerns || "domestic priorities"}.`;
  if (themes.security) return `Security proposals affect ${country}'s ${concerns || "territorial and strategic interests"} directly. Expect careful scrutiny of enforcement provisions.`;
  if (themes.trade) return `Trade-related clauses will be filtered through ${country}'s market access priorities and ${concerns || "economic dependencies"}.`;
  if (themes.rights) return `Rights-based language is sensitive for ${country}${concerns ? `, particularly regarding ${concerns}` : ""}. Expect pushback on externally imposed monitoring mechanisms.`;
  if (themes.development) return `Development framing aligns with ${country}'s core interests in ${concerns || "capacity-building and sovereign economic policy"}.`;
  return `${country} will evaluate "${agenda}" through the lens of ${concerns || "national strategic priorities"} and ${bloc !== "unaligned" ? `${bloc} coordination` : "bilateral interests"}.`;
}

// ── Negotiation style — uses actual intel data ──
function composeNegotiationStyle(country: string, archetype: Archetype, entry: BlocEntry | undefined, intel: CountryIntel | undefined): string {
  const r = entry?.riskLevel ?? 30;
  const contact = entry?.contactStatus || "none";
  const notes = intel?.diplomacyNotes?.trim();

  if (notes && notes.length > 10) return notes.slice(0, 200);

  switch (archetype) {
    case "major_power": return `Delegates assertively and expects counter-proposals to respond to its framework. ${contact === "negotiating" ? "Currently engaged in active bilateral negotiations." : "Bilateral outreach should reference institutional precedents."}`;
    case "regional_anchor": return `Negotiates as a coalition leader. Proposals must be acceptable to ${country}'s regional partners, limiting individual flexibility.`;
    case "swing_actor": return r > 50 ? `Transactional style — demands explicit guarantees and concrete deliverables before committing. Avoid vague consensus language.` : `Open to persuasion through specific proposal language. Most responsive to structured offers with clear implementation paths.`;
    case "opposition_core": return `Confrontational on substance but may cooperate procedurally. Productive engagement requires acknowledging red lines upfront rather than attempting gradual persuasion.`;
    case "bloc_loyalist": return `Follows bloc leadership on positioning. Direct bilateral engagement is less effective than working through ${country}'s bloc coordination channels.`;
    case "bridge_actor": return `Values inclusive process and consensus language. Most effective as a working-group facilitator rather than a direct ally.`;
    case "small_state": return `Risk-averse and procedurally focused. Values predictability — avoid last-minute proposal changes that force public repositioning.`;
    case "sparse_data": return `Negotiation style not yet observed. Recommend floor observation during the next moderated caucus.`;
  }
}

// ── Strategic risk — references actual numbers contextually ──
function composeStrategicRisk(country: string, archetype: Archetype, entry: BlocEntry | undefined): string {
  const r = entry?.riskLevel ?? 30;
  const s = entry?.supportLevel ?? 50;

  if (archetype === "opposition_core") return `${country} poses active procedural risk. The delegation may introduce unfriendly amendments or organize voting blocs against key operative clauses.`;
  if (archetype === "swing_actor") return `Support may shift if competing blocs offer stronger concessions. ${r > 50 ? "Late-session volatility is likely — do not assume current positioning holds through voting." : "Current trajectory is cautiously favourable, but commitments are not locked."}`;
  if (archetype === "major_power") return s > 80 ? `${country}'s strong positioning reduces strategic risk. The main danger is overreach — ambitious language may alienate potential swing-state support.` : `Despite institutional weight, ${country}'s moderate commitment level introduces uncertainty on procedural votes.`;
  if (r > 60) return `Elevated risk profile for ${country}. Monitor for sudden realignment, especially if opposition blocs offer targeted concessions.`;
  if (r < 20) return `${country} represents a stable, low-risk element in current planning. Reliable through the current session barring unexpected floor developments.`;
  return `${country}'s risk profile is manageable but not negligible. Support may weaken if enforcement provisions become economically restrictive or procedurally demanding.`;
}

// ── Economic signal — contextual, not a score readout ──
function composeEconomicSignal(country: string, archetype: Archetype, entry: BlocEntry | undefined, bloc: string): string {
  const s = entry?.supportLevel ?? 50;
  if (archetype === "major_power") return `${country}'s economic weight gives it structural leverage in any financing or implementation discussion. The delegation can credibly commit resources, making its support substantively valuable beyond vote count.`;
  if (archetype === "small_state") return `Limited economic leverage constrains ${country}'s negotiating position. The delegation is more dependent on multilateral frameworks and external financing commitments.`;
  if (bloc === "G77") return `As a ${s > 60 ? "relatively engaged" : "development-focused"} G77 member, ${country} will prioritize proposals that include capacity-building provisions and avoid disproportionate compliance burdens.`;
  if (s > 70) return `High engagement level suggests ${country} views this agenda as economically significant. Expect active participation in drafting and amendment processes.`;
  return `${country}'s economic positioning is not the primary driver of its committee behaviour. Strategic and political considerations are likely to dominate.`;
}

// ── Main synthesis function ──
export function synthesizeCountrySummaryLocally(
  country: string,
  blocEntry: BlocEntry | undefined,
  agenda: string,
  countryInfo?: CountryInfo,
  intel?: CountryIntel,
  freshness?: FreshnessInfo
): CountryStrategicSummary {
  const archetype = classifyArchetype(blocEntry, intel, countryInfo);
  const bloc = blocEntry?.bloc || countryInfo?.defaultBloc || "unaligned";

  return {
    country,
    overallPosture: composePosture(country, archetype, bloc, agenda, intel, blocEntry),
    agendaRelevance: composeAgendaRelevance(country, agenda, archetype, intel, bloc),
    diplomaticOrientation: composeEconomicSignal(country, archetype, blocEntry, bloc),
    economicSignal: composeEconomicSignal(country, archetype, blocEntry, bloc),
    negotiationStyle: composeNegotiationStyle(country, archetype, blocEntry, intel),
    strategicRisk: composeStrategicRisk(country, archetype, blocEntry),
    confidence: blocEntry ? (blocEntry.contactStatus === "committed" ? "high" : blocEntry.contactStatus === "negotiating" ? "medium" : "low") : "low",
    sources: [
      { label: "Committee Tracking", inferenceLevel: "factual" as const },
      ...(intel ? [{ label: "Intel Profile", inferenceLevel: "factual" as const }] : []),
      { label: "Positional Analysis", inferenceLevel: "inferred" as const },
    ],
    freshness: freshness ?? { fetchedAt: new Date().toISOString(), cacheStatus: "fresh" },
  };
}

// ── Bloc trend analysis (unchanged — already produces good output) ──
export function analyzeBlocTrendsLocally(entries: BlocEntry[], timeline: { type: string; title: string; timestamp: number }[] = []): SourcedBlocTrend[] {
  if (entries.length === 0) return [];
  const trends: SourcedBlocTrend[] = [];
  const allies = entries.filter(e => e.stance === "ally");
  const opponents = entries.filter(e => e.stance === "opponent");
  const swings = entries.filter(e => e.stance === "swing");
  const neutrals = entries.filter(e => e.stance === "neutral");
  const oneHourAgo = Date.now() - 3600000;
  const recentShifts = timeline.filter(t => t.type === "relationship" && t.timestamp > oneHourAgo);

  if (allies.length >= 2) {
    const avgSupport = Math.round(allies.reduce((s, a) => s + a.supportLevel, 0) / allies.length);
    const highRiskAllies = allies.filter(a => a.riskLevel > 50);
    const direction: SourcedBlocTrend["direction"] = highRiskAllies.length > allies.length * 0.3 ? "weakening" : avgSupport > 70 ? "stable" : "volatile";
    trends.push({
      id: "alliance-cohesion", label: "Alliance Cohesion", direction,
      rationale: direction === "stable"
        ? `${allies.length} allied states averaging ${avgSupport}% support. No high-risk defection signals detected.`
        : direction === "weakening"
        ? `${highRiskAllies.length} of ${allies.length} allies show elevated risk (>50%). Bloc discipline may fracture on contentious clauses.`
        : `Alliance support averages ${avgSupport}% — functional but not robust. Vulnerable to targeted opposition lobbying.`,
      inferenceLevel: "factual", confidence: recentShifts.length > 0 ? "medium" : "high",
      supportingEvents: recentShifts.slice(0, 3).map(t => t.title),
      sources: [{ label: "Bloc Entry Tracking", inferenceLevel: "factual" }],
    });
  }

  if (entries.length >= 3) {
    const dominant = [["allies", allies.length], ["swings", swings.length], ["opponents", opponents.length], ["neutrals", neutrals.length]].sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    trends.push({
      id: "floor-composition", label: "Floor Composition",
      direction: swings.length > entries.length * 0.35 ? "volatile" : allies.length > opponents.length * 2 ? "stable" : "volatile",
      rationale: `Tracked floor: ${allies.length} allied, ${swings.length} swing, ${opponents.length} opposed, ${neutrals.length} neutral. ${dominant[0] === "allies" ? "Favourable composition" : dominant[0] === "swings" ? "Outcome depends on swing-state lobbying" : "Opposition has significant presence"}.`,
      inferenceLevel: "factual", confidence: "high", supportingEvents: [],
      sources: [{ label: "Stance Distribution", inferenceLevel: "factual" }],
    });
  }

  if (opponents.length >= 2) {
    const avgOppRisk = Math.round(opponents.reduce((s, o) => s + o.riskLevel, 0) / opponents.length);
    trends.push({
      id: "opposition-threat", label: "Opposition Consolidation",
      direction: avgOppRisk > 60 ? "strengthening" : "stable",
      rationale: `${opponents.length} states in active opposition (avg risk ${avgOppRisk}%). ${avgOppRisk > 60 ? "Coordinated counter-proposals likely." : "Opposition present but not yet coordinated."}`,
      inferenceLevel: opponents.some(o => o.contactStatus === "negotiating") ? "factual" : "inferred",
      confidence: "medium", supportingEvents: [],
      sources: [{ label: "Opposition Tracking", inferenceLevel: opponents.some(o => o.contactStatus === "negotiating") ? "factual" : "inferred" }],
    });
  }

  if (swings.length >= 1) {
    const bestTarget = [...swings].sort((a, b) => b.supportLevel - a.supportLevel)[0];
    trends.push({
      id: "swing-opportunity", label: "Lobbying Opportunity", direction: "volatile",
      rationale: `${swings.length} uncommitted states. Best target: ${bestTarget.country} (${bestTarget.supportLevel}% support, ${bestTarget.riskLevel}% risk). ${bestTarget.contactStatus === "none" ? "Not yet contacted — immediate outreach recommended." : `Status: ${bestTarget.contactStatus}.`}`,
      inferenceLevel: "inferred", confidence: swings.length > 3 ? "medium" : "high", supportingEvents: [],
      sources: [{ label: "Swing Analysis", inferenceLevel: "inferred" }],
    });
  }

  return trends;
}

// ── Briefing export ──
export function generateMarkdownBriefing(
  committee: { contextPack: { committee: string; agenda: string; country: string; current_phase: string; active_goal: string; next_action_needed: string; allies: string[]; opponents: string[] }; blocEntries: BlocEntry[]; countryIntel: CountryIntel[]; timeline: { type: string; title: string; timestamp: number }[] }
): string {
  const ctx = committee.contextPack;
  const entries = committee.blocEntries;
  const trends = analyzeBlocTrendsLocally(entries, committee.timeline);
  const swings = entries.filter(e => e.stance === "swing").map(e => e.country);

  let md = `# TACTICAL INTELLIGENCE BRIEFING\n\n`;
  md += `| Field | Value |\n|---|---|\n`;
  md += `| Committee | ${ctx.committee} |\n| Agenda | ${ctx.agenda} |\n| Delegation | ${ctx.country} |\n| Phase | ${ctx.current_phase.replace(/_/g, " ").toUpperCase()} |\n| Generated | ${new Date().toUTCString()} |\n\n`;

  md += `## 1. EXECUTIVE SUMMARY\n\n**Strategic Objective:** ${ctx.active_goal || "Not yet defined."}\n\n**Next Required Action:** ${ctx.next_action_needed || "Assess committee floor."}\n\n`;
  md += `**Force Balance:** ${entries.filter(e => e.stance === "ally").length} allied · ${swings.length} swing · ${entries.filter(e => e.stance === "opponent").length} opposed · ${entries.filter(e => e.stance === "neutral").length} neutral\n\n`;

  md += `## 2. GEOPOLITICAL TREND ANALYSIS\n\n`;
  if (trends.length === 0) md += `*Insufficient tracked data to generate trends.*\n\n`;
  trends.forEach(t => {
    md += `### ${t.label}\n\n**Direction:** ${t.direction.toUpperCase()} · **Confidence:** ${t.confidence} · **Basis:** ${t.inferenceLevel}\n\n${t.rationale}\n\n`;
    if (t.supportingEvents.length) md += `*Recent events:* ${t.supportingEvents.join("; ")}\n\n`;
  });

  md += `## 3. ALLIANCE & OPPOSITION MAP\n\n`;
  md += `**Confirmed Allies:** ${ctx.allies.join(", ") || "None tracked"}\n\n**Active Opposition:** ${ctx.opponents.join(", ") || "None tracked"}\n\n**Swing Targets:** ${swings.join(", ") || "None identified"}\n\n`;

  md += `## 4. RECOMMENDED ACTIONS\n\n`;
  md += `1. ${swings.length > 0 ? `Prioritize bilateral engagement with ${swings[0]} before next caucus.` : "Consolidate existing alliance support."}\n`;
  md += `2. ${entries.filter(e => e.stance === "opponent").length > 2 ? "Monitor opposition coordination — prepare counter-amendment strategy." : "Maintain current diplomatic posture."}\n`;
  md += `3. Review draft language for compatibility with swing-state interests.\n\n`;

  if (committee.countryIntel && committee.countryIntel.length > 0) {
    md += `## 5. COUNTRY INTELLIGENCE DIGEST\n\n`;
    committee.countryIntel.forEach(ci => {
      md += `### ${ci.country}\n`;
      md += `- **Ideology:** ${ci.ideology}\n`;
      md += `- **Interests:** ${ci.strategicInterests.join(", ")}\n`;
      md += `- **Voting Tendency:** ${ci.votingTendencies}\n`;
      if (ci.diplomacyNotes) md += `- **Notes:** ${ci.diplomacyNotes}\n`;
      md += `\n`;
    });
  }

  md += `---\n\n*Generated by MUN Command OS · Tactical Intelligence Platform · ${new Date().toISOString()}*\n`;

  return md;
}
