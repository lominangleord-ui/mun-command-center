import type { BlocEntry, CountryIntel, NegotiationState } from "../../types";
import { getCountry } from "../countries";
import type { NormalizedAgenda } from "./agendaNormalization";
import { agendaHasDomain } from "./agendaNormalization";

export interface CountryDoctrine {
  country: string;
  bloc: string;
  doctrine: string[];
  allies: string[];
  rivalries: string[];
  dependencies: string[];
  sovereigntySensitivity: number;
  enforcementTolerance: number;
  amendmentTendency: "low" | "medium" | "high";
  negotiationStyle: string;
  priorities: string[];
  likelyObjections: string[];
  agendaPosture: string;
  redLines: string[];
  supportConditions: string[];
  preferredFraming: string[];
  rejectedFraming: string[];
  concessionPaths: string[];
  clauseCompatibility: string[];
  sponsorValue: number;
  swingPotential: number;
  pressureSensitivity: number;
  contradictionRisk: number;
  issueRoles: string[];
  confidence: "low" | "medium" | "high";
  freshnessLabel: string;
}

type TacticalDoctrine = Pick<
  CountryDoctrine,
  | "allies"
  | "redLines"
  | "supportConditions"
  | "preferredFraming"
  | "rejectedFraming"
  | "concessionPaths"
  | "clauseCompatibility"
  | "sponsorValue"
  | "swingPotential"
  | "pressureSensitivity"
  | "contradictionRisk"
  | "issueRoles"
>;

const COUNTRY_OVERRIDES: Record<string, Partial<CountryDoctrine>> = {
  "united states": {
    doctrine: ["rules-based order", "sanctions leverage", "alliance leadership", "verification"],
    rivalries: ["China", "Russia", "Iran", "North Korea"],
    dependencies: ["alliance cohesion", "market access", "domestic congressional optics"],
    sovereigntySensitivity: 48, enforcementTolerance: 76, amendmentTendency: "high",
    negotiationStyle: "front-loads ambitious text, then trades monitoring language for co-sponsors",
  },
  china: {
    doctrine: ["sovereignty", "non-interference", "development-first implementation", "state control of technology"],
    rivalries: ["United States", "Japan", "India"],
    dependencies: ["trade routes", "energy imports", "G77 legitimacy"],
    sovereigntySensitivity: 92, enforcementTolerance: 28, amendmentTendency: "high",
    negotiationStyle: "accepts broad principles but narrows intrusive mechanisms in amendments",
  },
  russia: {
    doctrine: ["sovereignty", "security parity", "anti-sanctions posture", "regional sphere of influence"],
    rivalries: ["United States", "United Kingdom", "France", "Ukraine"],
    dependencies: ["energy leverage", "P5 status", "security partnerships"],
    sovereigntySensitivity: 90, enforcementTolerance: 24, amendmentTendency: "high",
    negotiationStyle: "uses procedural objections and sovereignty amendments to slow hostile text",
  },
  india: {
    doctrine: ["strategic autonomy", "development equity", "sovereignty", "South-South leadership"],
    rivalries: ["Pakistan", "China"],
    dependencies: ["energy security", "technology access", "diaspora optics"],
    sovereigntySensitivity: 78, enforcementTolerance: 44, amendmentTendency: "medium",
    negotiationStyle: "keeps options open until implementation burden and recognition language are clear",
  },
  pakistan: {
    doctrine: ["security parity", "Kashmir sensitivity", "development assistance", "Islamic bloc coordination"],
    rivalries: ["India"],
    dependencies: ["security assistance", "debt relief", "OIC credibility"],
    sovereigntySensitivity: 82, enforcementTolerance: 38, amendmentTendency: "medium",
    negotiationStyle: "seeks references that balance India and avoids clauses that isolate its security posture",
  },
  brazil: {
    doctrine: ["Amazon sovereignty", "development space", "Global South mediation", "food and energy security"],
    rivalries: [],
    dependencies: ["agriculture exports", "climate finance", "regional leadership"],
    sovereigntySensitivity: 72, enforcementTolerance: 42, amendmentTendency: "medium",
    negotiationStyle: "prefers bridge language that protects domestic jurisdiction while offering cooperation",
  },
  "south africa": {
    doctrine: ["non-alignment", "anti-apartheid rights language", "BRICS ties", "African leadership"],
    rivalries: [],
    dependencies: ["African Union legitimacy", "trade diversification", "development finance"],
    sovereigntySensitivity: 70, enforcementTolerance: 40, amendmentTendency: "medium",
    negotiationStyle: "mediates between rights principles and non-aligned resistance to country targeting",
  },
  "saudi arabia": {
    doctrine: ["regime stability", "energy market stability", "non-interference", "regional security"],
    rivalries: ["Iran"],
    dependencies: ["oil markets", "US security relationship", "regional prestige"],
    sovereigntySensitivity: 88, enforcementTolerance: 30, amendmentTendency: "high",
    negotiationStyle: "supports humanitarian or development text while stripping external scrutiny clauses",
  },
  iran: {
    doctrine: ["anti-sanctions posture", "sovereignty", "regional resistance", "security deterrence"],
    rivalries: ["United States", "Israel", "Saudi Arabia"],
    dependencies: ["sanctions relief", "energy exports", "regional partners"],
    sovereigntySensitivity: 94, enforcementTolerance: 20, amendmentTendency: "high",
    negotiationStyle: "rejects coercive language and trades only on sanctions relief or equal-treatment terms",
  },
  israel: {
    doctrine: ["security primacy", "counterterrorism", "hostage/civilian protection", "US alignment"],
    rivalries: ["Iran", "Syria"],
    dependencies: ["US backing", "regional normalization", "security guarantees"],
    sovereigntySensitivity: 76, enforcementTolerance: 56, amendmentTendency: "high",
    negotiationStyle: "demands explicit security carve-outs before accepting humanitarian obligations",
  },
  turkey: {
    doctrine: ["strategic autonomy", "border security", "migration management", "regional mediation"],
    rivalries: ["Syria"],
    dependencies: ["NATO ties", "refugee burden", "Black Sea access"],
    sovereigntySensitivity: 80, enforcementTolerance: 42, amendmentTendency: "medium",
    negotiationStyle: "offers mediation language but protects border and counterterrorism discretion",
  },
  france: {
    doctrine: ["P5 prerogatives", "multilateralism", "francophone influence", "verification"],
    rivalries: [],
    dependencies: ["EU cohesion", "African diplomatic access", "P5 status"],
    sovereigntySensitivity: 52, enforcementTolerance: 68, amendmentTendency: "medium",
    negotiationStyle: "supports institutional mechanisms if mandate language preserves diplomatic control",
  },
  "united kingdom": {
    doctrine: ["P5 prerogatives", "sanctions architecture", "rule of law", "alliance coordination"],
    rivalries: ["Russia"],
    dependencies: ["US alignment", "Commonwealth ties", "financial sanctions tools"],
    sovereigntySensitivity: 50, enforcementTolerance: 70, amendmentTendency: "medium",
    negotiationStyle: "pushes precise legal wording and will trade scope for enforceability",
  },
};

const COUNTRY_TACTICS: Record<string, Partial<TacticalDoctrine>> = {
  "united states": {
    allies: ["United Kingdom", "France", "Germany", "Israel", "Japan", "South Korea"],
    redLines: ["language weakening counterterrorism discretion", "blanket sanctions relief", "text that equates US partners with proxy groups"],
    supportConditions: ["verification language", "counterterror carve-outs", "credible implementation reporting"],
    preferredFraming: ["rules-based order", "civilian protection plus security guarantees", "targeted sanctions on spoilers"],
    rejectedFraming: ["unconditional sanctions removal", "anti-Western attribution", "regional consent as a veto over all enforcement"],
    concessionPaths: ["soften public condemnation in exchange for reporting", "pair humanitarian access with counterterror safeguards", "move monitoring to UN technical bodies"],
    clauseCompatibility: ["verification mechanism", "targeted sanctions review", "capacity-building tied to governance benchmarks"],
    sponsorValue: 88, swingPotential: 18, pressureSensitivity: 55, contradictionRisk: 62,
    issueRoles: ["security enforcer", "high-value sponsor", "polarizing coalition anchor"],
  },
  france: {
    allies: ["United States", "United Kingdom", "Germany", "European Union members"],
    redLines: ["weak UN mandate language", "language that sidelines P5 diplomacy", "blanket anti-intervention wording"],
    supportConditions: ["UN-centered mandate", "ceasefire monitoring with diplomatic oversight", "humanitarian access that does not collapse security language"],
    preferredFraming: ["multilateral legitimacy", "ceasefire monitoring", "state capacity and governance support"],
    rejectedFraming: ["pure non-interference", "militia legitimization", "sanctions removal without benchmarks"],
    concessionPaths: ["trade stronger sovereignty preamble for a UN monitoring clause", "offer reconstruction language if mandate oversight stays intact"],
    clauseCompatibility: ["UN special envoy", "monitoring/reporting mechanism", "sequenced reconstruction and governance benchmarks"],
    sponsorValue: 76, swingPotential: 34, pressureSensitivity: 45, contradictionRisk: 48,
    issueRoles: ["bridgeable P5 actor", "institutional drafter", "mandate-shaping co-sponsor"],
  },
  "united kingdom": {
    allies: ["United States", "France", "Germany", "Canada", "Australia"],
    redLines: ["vague legal obligations", "sanctions rollback without compliance tests", "language legitimizing armed proxies"],
    supportConditions: ["precise operative verbs", "rule-of-law wording", "humanitarian access with accountability"],
    preferredFraming: ["rule of law", "targeted accountability", "civilian protection"],
    rejectedFraming: ["both-sides ambiguity on non-state armed groups", "open-ended funding without oversight"],
    concessionPaths: ["offer sunset clauses", "add review conferences", "shift from mandatory to requested reporting"],
    clauseCompatibility: ["legal definitions", "sanctions review", "humanitarian monitoring"],
    sponsorValue: 74, swingPotential: 28, pressureSensitivity: 48, contradictionRisk: 46,
    issueRoles: ["legal drafter", "sanctions architect", "Western vote consolidator"],
  },
  china: {
    allies: ["Russia", "Pakistan", "Iran", "many G77 delegations"],
    redLines: ["country-specific monitoring", "external intervention", "sanctions or attribution language aimed at state sponsors"],
    supportConditions: ["host-state consent", "capacity-building", "development-first implementation"],
    preferredFraming: ["sovereignty", "non-interference", "reconstruction and development"],
    rejectedFraming: ["naming state sponsors", "binding investigations", "coercive enforcement"],
    concessionPaths: ["replace sanctions with dialogue mechanisms", "make reporting voluntary", "route implementation through host-state consent"],
    clauseCompatibility: ["capacity-building fund", "regional dialogue platform", "voluntary reporting"],
    sponsorValue: 82, swingPotential: 20, pressureSensitivity: 70, contradictionRisk: 58,
    issueRoles: ["sovereignty bloc anchor", "P5 blocker", "development-framing sponsor"],
  },
  russia: {
    allies: ["China", "Iran", "Syria", "North Korea"],
    redLines: ["NATO framing", "country-specific condemnation", "sanctions expansion", "language weakening P5 discretion"],
    supportConditions: ["anti-sanctions balance", "recognition of host-state sovereignty", "no attribution of proxy sponsorship"],
    preferredFraming: ["security parity", "non-interference", "anti-terrorism through state authorities"],
    rejectedFraming: ["external accountability missions", "Western-led enforcement", "proxy attribution"],
    concessionPaths: ["trade condemnation for ceasefire language", "make mechanisms regional/consent-based", "include equal-treatment obligations"],
    clauseCompatibility: ["host-state consent", "regional contact group", "anti-terror cooperation without naming sponsors"],
    sponsorValue: 70, swingPotential: 14, pressureSensitivity: 82, contradictionRisk: 66,
    issueRoles: ["P5 blocker", "sovereignty hardliner", "procedural spoiler"],
  },
  india: {
    allies: ["France", "United States", "Russia", "Global South partners"],
    redLines: ["Pakistan-friendly security language", "Kashmir analogies", "unequal implementation burdens"],
    supportConditions: ["strategic autonomy preserved", "development and capacity-building language", "terrorism language not diluted"],
    preferredFraming: ["state capacity", "counterterrorism", "development equity", "strategic autonomy"],
    rejectedFraming: ["external mediation analogies", "mandatory monitoring without consent", "one-sided bloc alignment"],
    concessionPaths: ["offer capacity-building wording", "separate humanitarian access from intrusive monitoring", "include terrorism financing language"],
    clauseCompatibility: ["counterterror financing controls", "capacity-building", "sovereignty-safe reconstruction"],
    sponsorValue: 72, swingPotential: 48, pressureSensitivity: 60, contradictionRisk: 52,
    issueRoles: ["Global South bridge", "counterterror voice", "selective co-sponsor"],
  },
  pakistan: {
    allies: ["China", "Saudi Arabia", "Turkey", "OIC partners"],
    redLines: ["India-led security framing", "terrorism language that isolates Pakistan", "Kashmir-adjacent sovereignty analogies"],
    supportConditions: ["balanced regional language", "development assistance", "Islamic bloc credibility preserved"],
    preferredFraming: ["humanitarian protection", "self-determination language where useful", "balanced counterterrorism"],
    rejectedFraming: ["India as a model security actor", "one-sided counterterror obligations", "monitoring that can be redirected at Pakistan"],
    concessionPaths: ["add balanced condemnation of all non-state armed actors", "offer development assistance language", "let OIC language carry legitimacy"],
    clauseCompatibility: ["balanced security language", "humanitarian corridors", "capacity-building without naming state sponsors"],
    sponsorValue: 55, swingPotential: 62, pressureSensitivity: 76, contradictionRisk: 70,
    issueRoles: ["OIC swing", "security-sensitive abstention candidate", "rivalry-driven amendment actor"],
  },
  "saudi arabia": {
    allies: ["United States", "Gulf states", "Egypt", "Pakistan"],
    redLines: ["Iran-aligned framing", "human-rights monitoring of domestic governance", "language threatening energy or regime security"],
    supportConditions: ["Iran/proxy language is balanced", "sovereignty is explicit", "humanitarian obligations do not invite scrutiny"],
    preferredFraming: ["regional stability", "humanitarian assistance", "state authority", "energy stability"],
    rejectedFraming: ["external investigations", "militia normalization", "Iran-friendly compromise text"],
    concessionPaths: ["offer reconstruction funding visibility", "avoid domestic rights monitoring", "include all non-state actors language"],
    clauseCompatibility: ["reconstruction fund", "regional security dialogue", "humanitarian aid with sovereignty caveat"],
    sponsorValue: 66, swingPotential: 44, pressureSensitivity: 68, contradictionRisk: 58,
    issueRoles: ["Gulf bloc broker", "funding lever", "Iran-sensitive swing"],
  },
  iran: {
    allies: ["Syria", "Russia", "China", "regional partner networks"],
    redLines: ["proxy attribution", "sanctions expansion", "Israel or US security language", "nuclear spillover wording"],
    supportConditions: ["anti-sanctions balance", "sovereignty language", "no naming of Iranian-backed groups"],
    preferredFraming: ["anti-coercion", "sovereignty", "regional self-determination"],
    rejectedFraming: ["state sponsor language", "targeted sanctions", "Western security architecture"],
    concessionPaths: ["replace sanctions with inclusive dialogue", "add equal-treatment language", "frame ceasefire around all external actors"],
    clauseCompatibility: ["anti-sanctions preamble", "regional dialogue", "non-interference safeguards"],
    sponsorValue: 42, swingPotential: 20, pressureSensitivity: 90, contradictionRisk: 78,
    issueRoles: ["hard blocker", "proxy-framing risk", "sovereignty coalition signal"],
  },
  israel: {
    allies: ["United States", "Germany", "United Kingdom", "France"],
    redLines: ["one-sided ceasefire demands", "language legitimizing Hamas or Hezbollah", "external investigations without security carve-outs"],
    supportConditions: ["hostage/civilian protection language", "explicit non-state armed actor condemnation", "security guarantees"],
    preferredFraming: ["counterterrorism", "civilian protection with security safeguards", "demilitarization"],
    rejectedFraming: ["unconditional ceasefire", "occupation-only framing", "sanctions against Israeli officials"],
    concessionPaths: ["pair humanitarian access with inspection safeguards", "use all parties language carefully", "separate aid delivery from political recognition"],
    clauseCompatibility: ["counterterror safeguards", "civilian evacuation mechanisms", "demilitarized humanitarian corridors"],
    sponsorValue: 52, swingPotential: 18, pressureSensitivity: 88, contradictionRisk: 72,
    issueRoles: ["security red-line actor", "Western coalition stress test", "high-amendment-risk target"],
  },
  turkey: {
    allies: ["Azerbaijan", "Qatar", "Pakistan", "NATO partners"],
    redLines: ["Kurdish militia legitimization", "border-security restrictions", "refugee burden without support"],
    supportConditions: ["border security recognized", "migration burden-sharing", "regional mediation role"],
    preferredFraming: ["regional mediation", "state sovereignty", "counterterrorism", "refugee support"],
    rejectedFraming: ["open-ended intervention", "militia recognition", "NATO-only framing"],
    concessionPaths: ["offer refugee funding language", "include border security clause", "give Turkey a mediation role"],
    clauseCompatibility: ["regional mediation group", "refugee assistance", "counterterror safeguards"],
    sponsorValue: 63, swingPotential: 58, pressureSensitivity: 67, contradictionRisk: 56,
    issueRoles: ["regional bridge", "migration lever", "counterterror swing"],
  },
  egypt: {
    allies: ["Saudi Arabia", "Jordan", "United States", "Arab Group"],
    redLines: ["border/refugee burden without support", "Sinai security exposure", "Muslim Brotherhood-friendly language"],
    supportConditions: ["Arab legitimacy", "border security", "humanitarian corridor management support"],
    preferredFraming: ["state authority", "humanitarian access through controlled channels", "Arab League coordination"],
    rejectedFraming: ["forced displacement", "open-border obligations", "external domestic monitoring"],
    concessionPaths: ["offer logistics support", "include anti-displacement language", "route humanitarian mechanisms through regional partners"],
    clauseCompatibility: ["humanitarian corridor coordination", "anti-displacement safeguards", "Arab League consultation"],
    sponsorValue: 62, swingPotential: 52, pressureSensitivity: 65, contradictionRisk: 50,
    issueRoles: ["regional gateway", "humanitarian logistics actor", "Arab bloc bridge"],
  },
  jordan: {
    allies: ["United States", "Saudi Arabia", "Egypt", "Arab Group"],
    redLines: ["forced displacement", "refugee burden without funding", "destabilizing border-security language"],
    supportConditions: ["humanitarian funding", "anti-displacement commitment", "regional legitimacy"],
    preferredFraming: ["humanitarian protection", "refugee support", "regional de-escalation"],
    rejectedFraming: ["open-ended refugee absorption", "military escalation", "unfunded aid obligations"],
    concessionPaths: ["offer refugee support funding", "add anti-displacement operative text", "use Jordan as corridor coordinator"],
    clauseCompatibility: ["anti-displacement clause", "humanitarian corridor support", "regional de-escalation"],
    sponsorValue: 60, swingPotential: 64, pressureSensitivity: 62, contradictionRisk: 44,
    issueRoles: ["humanitarian bridge", "swing-state persuader", "regional credibility carrier"],
  },
  qatar: {
    allies: ["Turkey", "United States", "Gulf partners"],
    redLines: ["language foreclosing mediation channels", "blanket condemnation that damages mediator role"],
    supportConditions: ["mediation role protected", "humanitarian access emphasized", "balanced language"],
    preferredFraming: ["mediation", "humanitarian diplomacy", "ceasefire facilitation"],
    rejectedFraming: ["all-or-nothing counterterror framing", "public humiliation of mediator channels"],
    concessionPaths: ["assign contact-group or mediation language", "soften naming while preserving non-state actor controls"],
    clauseCompatibility: ["contact group", "mediation channel", "humanitarian pause language"],
    sponsorValue: 58, swingPotential: 60, pressureSensitivity: 54, contradictionRisk: 50,
    issueRoles: ["mediator", "ceasefire broker", "quiet co-sponsor"],
  },
  germany: {
    allies: ["France", "United States", "United Kingdom", "EU members", "Israel"],
    redLines: ["language weakening Israel security guarantees", "unfunded reconstruction commitments without governance standards"],
    supportConditions: ["humanitarian protection", "accountability language", "funding oversight"],
    preferredFraming: ["civilian protection", "rules-based order", "reconstruction with governance safeguards"],
    rejectedFraming: ["blanket equivalence between state and non-state actors", "weak oversight"],
    concessionPaths: ["offer funding but demand monitoring", "soften enforcement verbs for stronger reporting"],
    clauseCompatibility: ["reconstruction trust fund", "civilian protection", "monitoring/reporting"],
    sponsorValue: 70, swingPotential: 36, pressureSensitivity: 46, contradictionRisk: 48,
    issueRoles: ["funding sponsor", "EU cohesion actor", "humanitarian-security balancer"],
  },
  brazil: {
    allies: ["South Africa", "India", "G77 partners", "GRULAC partners"],
    redLines: ["coercive intervention", "unfunded mandates", "country targeting without consent"],
    supportConditions: ["sovereignty safeguards", "development financing", "broad consensus"],
    preferredFraming: ["Global South mediation", "capacity-building", "dialogue"],
    rejectedFraming: ["punitive enforcement-first text", "P5-only ownership"],
    concessionPaths: ["offer bridge language", "move enforcement into review mechanism", "add development finance"],
    clauseCompatibility: ["dialogue platform", "capacity-building", "consent-based monitoring"],
    sponsorValue: 68, swingPotential: 66, pressureSensitivity: 48, contradictionRisk: 42,
    issueRoles: ["bridge state", "Global South legitimacy carrier", "swing consolidator"],
  },
  "south africa": {
    allies: ["Brazil", "India", "African Group", "BRICS partners"],
    redLines: ["one-sided condemnation", "weak anti-apartheid/human-rights consistency", "P5-dominated implementation"],
    supportConditions: ["balanced accountability", "African/Global South ownership", "humanitarian credibility"],
    preferredFraming: ["non-aligned mediation", "rights plus sovereignty", "inclusive reconstruction"],
    rejectedFraming: ["Western ownership", "selective accountability", "coercion without negotiation"],
    concessionPaths: ["give Global South authorship", "add inclusive dialogue", "use voluntary monitoring"],
    clauseCompatibility: ["inclusive peace process", "humanitarian accountability", "capacity-building"],
    sponsorValue: 64, swingPotential: 62, pressureSensitivity: 50, contradictionRisk: 46,
    issueRoles: ["non-aligned mediator", "rights-sovereignty bridge", "bloc legitimacy actor"],
  },
  indonesia: {
    allies: ["ASEAN partners", "G77 partners", "OIC partners"],
    redLines: ["anti-Islamic framing", "intervention-heavy enforcement", "weak humanitarian access"],
    supportConditions: ["OIC-sensitive humanitarian language", "sovereignty safeguards", "capacity-building"],
    preferredFraming: ["humanitarian protection", "moderate Islamic diplomacy", "non-interference"],
    rejectedFraming: ["military-first language", "forced alignment with great powers"],
    concessionPaths: ["add humanitarian access", "soften enforcement", "give ASEAN/OIC consultation language"],
    clauseCompatibility: ["humanitarian access", "regional consultation", "capacity-building"],
    sponsorValue: 62, swingPotential: 68, pressureSensitivity: 46, contradictionRisk: 38,
    issueRoles: ["moderate OIC bridge", "large swing", "consensus sponsor"],
  },
  nigeria: {
    allies: ["African Group", "G77 partners", "United Kingdom"],
    redLines: ["underfunded counterterror obligations", "external security conditionality", "ignoring African state-capacity parallels"],
    supportConditions: ["counterterror capacity-building", "state capacity language", "development finance"],
    preferredFraming: ["state capacity", "counterterror assistance", "development-security nexus"],
    rejectedFraming: ["punitive conditionality", "security burdens without funding"],
    concessionPaths: ["offer training/funding language", "include regional capacity-building", "avoid naming-and-shaming"],
    clauseCompatibility: ["capacity-building", "terror financing controls", "regional security assistance"],
    sponsorValue: 58, swingPotential: 60, pressureSensitivity: 55, contradictionRisk: 44,
    issueRoles: ["African swing", "counterterror legitimacy actor", "capacity-building advocate"],
  },
  mexico: {
    allies: ["GRULAC partners", "United States", "Global South partners"],
    redLines: ["militarized intervention", "migration burdens without support", "weak rule-of-law language"],
    supportConditions: ["humanitarian protection", "rule-of-law capacity", "non-militarized implementation"],
    preferredFraming: ["civilian protection", "institutional capacity", "humanitarian law"],
    rejectedFraming: ["military-first enforcement", "unfunded migration obligations"],
    concessionPaths: ["add rule-of-law support", "keep implementation civilian", "include migration support"],
    clauseCompatibility: ["rule-of-law assistance", "civilian protection", "institutional capacity-building"],
    sponsorValue: 57, swingPotential: 58, pressureSensitivity: 42, contradictionRisk: 38,
    issueRoles: ["GRULAC bridge", "civilian-protection voice", "moderate sponsor"],
  },
};

function unique(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const item = value?.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function agendaIsMiddleEastProxy(agenda: NormalizedAgenda): boolean {
  return /middle east|proxy|non-state|militia|fragmentation|governance collapse|state capacity|ceasefire/i.test(agenda.rawAgenda);
}

function blocTactics(bloc: string): TacticalDoctrine {
  if (/Western|WEOG|EU|NATO/i.test(bloc)) {
    return {
      allies: ["Western partners", "EU/WEOG delegations"],
      redLines: ["weak accountability", "blanket anti-sanctions wording", "language legitimizing armed groups"],
      supportConditions: ["credible monitoring", "civilian protection", "implementation oversight"],
      preferredFraming: ["rules-based order", "humanitarian protection", "accountability"],
      rejectedFraming: ["pure non-interference", "unverified sanctions relief", "vague implementation"],
      concessionPaths: ["soften verbs from demands to calls upon", "add review clauses", "pair enforcement with technical support"],
      clauseCompatibility: ["monitoring mechanism", "targeted accountability", "civilian protection"],
      sponsorValue: 60, swingPotential: 35, pressureSensitivity: 45, contradictionRisk: 42,
      issueRoles: ["institutional sponsor", "implementation drafter"],
    };
  }
  if (/Arab|OIC/i.test(bloc)) {
    return {
      allies: ["Arab Group partners", "OIC partners"],
      redLines: ["forced displacement", "external domestic monitoring", "language that favors a regional rival"],
      supportConditions: ["sovereignty safeguards", "regional legitimacy", "humanitarian protection"],
      preferredFraming: ["regional stability", "sovereignty", "humanitarian access"],
      rejectedFraming: ["foreign intervention", "militia normalization", "public blame of Arab partners"],
      concessionPaths: ["add Arab League/OIC consultation", "include reconstruction support", "use balanced all-parties language"],
      clauseCompatibility: ["regional consultation", "humanitarian corridors", "reconstruction assistance"],
      sponsorValue: 52, swingPotential: 55, pressureSensitivity: 62, contradictionRisk: 48,
      issueRoles: ["regional legitimacy actor", "swing bloc participant"],
    };
  }
  if (/G77|African|GRULAC|CARICOM/i.test(bloc)) {
    return {
      allies: ["G77 partners", "regional group partners"],
      redLines: ["unfunded mandates", "coercive intervention", "conditionality tied to domestic governance"],
      supportConditions: ["capacity-building", "development financing", "sovereignty language"],
      preferredFraming: ["state capacity", "development support", "non-punitive implementation"],
      rejectedFraming: ["sanctions-first strategy", "externally imposed monitoring", "donor-only control"],
      concessionPaths: ["offer financing language", "make reporting voluntary", "add technology/training support"],
      clauseCompatibility: ["capacity-building", "reconstruction financing", "voluntary reporting"],
      sponsorValue: 50, swingPotential: 62, pressureSensitivity: 46, contradictionRisk: 38,
      issueRoles: ["swing pool", "legitimacy carrier"],
    };
  }
  if (/NAM|Eastern/i.test(bloc)) {
    return {
      allies: ["non-aligned partners", "sovereignty-focused delegations"],
      redLines: ["external enforcement", "country-specific monitoring", "great-power ownership of implementation"],
      supportConditions: ["non-interference", "host-state consent", "balanced obligations"],
      preferredFraming: ["strategic autonomy", "sovereignty", "regional consent"],
      rejectedFraming: ["coercive enforcement", "selective accountability", "military intervention"],
      concessionPaths: ["replace enforcement with dialogue", "add consent requirements", "make obligations reciprocal"],
      clauseCompatibility: ["dialogue platform", "consent-based implementation", "balanced obligations"],
      sponsorValue: 45, swingPotential: 52, pressureSensitivity: 58, contradictionRisk: 44,
      issueRoles: ["sovereignty vote", "amendment actor"],
    };
  }
  return {
    allies: ["regional partners"],
    redLines: ["unfunded obligations", "loss of policy space"],
    supportConditions: ["clear benefits", "low implementation burden"],
    preferredFraming: ["practical cooperation", "regional stability"],
    rejectedFraming: ["open-ended commitments", "public blame"],
    concessionPaths: ["ask for a yes/abstain threshold", "offer softer verbs", "add review language"],
    clauseCompatibility: ["consultation mechanism", "phased implementation"],
    sponsorValue: 42, swingPotential: 56, pressureSensitivity: 44, contradictionRisk: 36,
    issueRoles: ["transactional swing"],
  };
}

function agendaPosture(country: string, agenda: NormalizedAgenda, doctrine: Partial<CountryDoctrine>, tactics: TacticalDoctrine): string {
  if (agendaIsMiddleEastProxy(agenda)) {
    const sovereignty = (doctrine.sovereigntySensitivity ?? 60) >= 78;
    const enforcement = (doctrine.enforcementTolerance ?? 45) >= 60;
    const proxyRisk = tactics.redLines.some((line) => /proxy|militia|armed|terror|Iran|Israel|Kurdish/i.test(line));
    if (proxyRisk) return `${country} will read this agenda through proxy attribution and regional-security exposure; wording that names sponsors or legitimizes armed groups will change its vote faster than generic humanitarian language.`;
    if (sovereignty && enforcement) return `${country} can support action on non-state armed actors, but only if enforcement is routed through legitimate state or UN channels and not framed as external regime management.`;
    if (sovereignty) return `${country} prioritizes sovereignty, host-state consent, and non-interference on Middle East fragmentation; convert enforcement asks into dialogue, capacity-building, or voluntary review.`;
    if (enforcement) return `${country} is comparatively open to monitoring, sanctions review, or accountability language, but still needs humanitarian and reconstruction language to avoid looking punitive.`;
    return `${country} is likely to behave as a conditional swing on Middle East fragmentation: it wants stabilization and humanitarian access without inheriting implementation or bloc-alignment costs.`;
  }
  if (agendaHasDomain(agenda, ["climate", "development"])) return `${country} will prioritize financing, implementation burden, and development equity before accepting compliance language.`;
  if (agendaHasDomain(agenda, ["human-rights", "population"])) return `${country} will separate broad rights language from intrusive domestic monitoring; split principle from implementation to keep support.`;
  if (agendaHasDomain(agenda, ["sanctions", "trade"])) return `${country} will test whether economic measures are targeted, reversible, and insulated from trade blowback.`;
  return `${country} will evaluate this agenda through ${tactics.preferredFraming.slice(0, 2).join(" and ")}; ask for concrete wording rather than assuming bloc alignment.`;
}

function blocDefaults(bloc: string): Partial<CountryDoctrine> {
  if (/G77|African|GRULAC|CARICOM/i.test(bloc)) {
    return {
      doctrine: ["development space", "capacity building", "sovereignty", "equitable financing"],
      dependencies: ["development finance", "technology transfer", "commodity exposure"],
      sovereigntySensitivity: 72, enforcementTolerance: 36, amendmentTendency: "medium",
      negotiationStyle: "asks for financing, flexibility, and non-punitive implementation before committing",
    };
  }
  if (/NAM|Arab|OIC/i.test(bloc)) {
    return {
      doctrine: ["non-interference", "regional consent", "sovereignty", "balanced language"],
      dependencies: ["regional legitimacy", "security stability", "aid access"],
      sovereigntySensitivity: 84, enforcementTolerance: 30, amendmentTendency: "high",
      negotiationStyle: "will accept consensus framing while resisting monitoring or coercive clauses",
    };
  }
  if (/Western|WEOG|EU|NATO/i.test(bloc)) {
    return {
      doctrine: ["rules-based order", "verification", "institutional accountability", "rights language"],
      dependencies: ["alliance cohesion", "public credibility", "implementation funding"],
      sovereigntySensitivity: 48, enforcementTolerance: 68, amendmentTendency: "medium",
      negotiationStyle: "seeks enforceable language but can soften verbs to hold swing support",
    };
  }
  return {
    doctrine: ["strategic autonomy", "regional stability", "institutional access"],
    dependencies: ["trade interdependence", "diplomatic access"],
    sovereigntySensitivity: 62, enforcementTolerance: 48, amendmentTendency: "medium",
    negotiationStyle: "waits for concrete text before making public commitments",
  };
}

function agendaObjections(agenda: NormalizedAgenda, doctrine: Partial<CountryDoctrine>): string[] {
  const objections: string[] = [];
  if (agenda.modifiers.enforcementWeight > 0.55 && (doctrine.sovereigntySensitivity ?? 50) > 70) objections.push("external enforcement or country-specific monitoring");
  if (agendaHasDomain(agenda, ["sanctions", "trade"])) objections.push("extraterritorial sanctions and trade disruption");
  if (agendaHasDomain(agenda, ["security", "peacekeeping"])) objections.push("mandates without host-state or regional consent");
  if (agendaIsMiddleEastProxy(agenda)) objections.push("wording that names proxy sponsors without a balanced regional formula");
  if (agendaHasDomain(agenda, ["climate", "development"])) objections.push("unfunded implementation burdens");
  if (agendaHasDomain(agenda, ["human-rights", "population"])) objections.push("intrusive reporting on domestic policy");
  if (agendaHasDomain(agenda, ["technology"])) objections.push("IP restrictions or data rules that reduce strategic autonomy");
  return objections.slice(0, 4);
}

export function getCountryDoctrine(country: string, intel: CountryIntel | undefined, entry: BlocEntry | undefined, agenda: NormalizedAgenda): CountryDoctrine {
  const info = getCountry(country);
  const bloc = entry?.bloc || intel?.ideology || info?.defaultBloc || "unaligned";
  const base = blocDefaults(bloc);
  const override = COUNTRY_OVERRIDES[country.toLowerCase()] ?? {};
  const tacticBase = blocTactics(bloc);
  const tacticOverride = COUNTRY_TACTICS[country.toLowerCase()] ?? {};
  const tactics: TacticalDoctrine = { ...tacticBase, ...tacticOverride };
  const merged = { ...base, ...override };
  const rivalries = unique([...(override.rivalries ?? []), ...(intel?.rivals ?? [])]);
  const dependencies = unique([...(override.dependencies ?? []), ...(intel?.dependencies ?? []), ...(base.dependencies ?? [])]).slice(0, 6);
  const priorities = unique([...(intel?.strategicInterests ?? []), ...(merged.doctrine ?? []), ...tactics.preferredFraming]).slice(0, 7);
  const likelyObjections = unique([...agendaObjections(agenda, merged), ...tactics.rejectedFraming]).slice(0, 5);
  const hasNamedDoctrine = !!COUNTRY_OVERRIDES[country.toLowerCase()] || !!COUNTRY_TACTICS[country.toLowerCase()];

  return {
    country,
    bloc,
    doctrine: merged.doctrine ?? ["strategic autonomy"],
    allies: unique([...(tactics.allies ?? []), ...(intel?.allies ?? [])]).slice(0, 7),
    rivalries,
    dependencies,
    sovereigntySensitivity: merged.sovereigntySensitivity ?? 60,
    enforcementTolerance: merged.enforcementTolerance ?? 45,
    amendmentTendency: merged.amendmentTendency ?? "medium",
    negotiationStyle: intel?.diplomacyNotes?.trim() || merged.negotiationStyle || "position depends on concrete clause wording",
    priorities,
    likelyObjections,
    agendaPosture: agendaPosture(country, agenda, merged, tactics),
    redLines: unique([...tactics.redLines, ...likelyObjections]).slice(0, 7),
    supportConditions: unique(tactics.supportConditions).slice(0, 6),
    preferredFraming: unique(tactics.preferredFraming).slice(0, 6),
    rejectedFraming: unique(tactics.rejectedFraming).slice(0, 6),
    concessionPaths: unique(tactics.concessionPaths).slice(0, 6),
    clauseCompatibility: unique(tactics.clauseCompatibility).slice(0, 6),
    sponsorValue: tactics.sponsorValue,
    swingPotential: tactics.swingPotential,
    pressureSensitivity: Math.max(tactics.pressureSensitivity, entry?.riskLevel ?? intel?.riskLevel ?? 0),
    contradictionRisk: tactics.contradictionRisk,
    issueRoles: unique(tactics.issueRoles).slice(0, 4),
    confidence: hasNamedDoctrine ? "high" : intel || entry ? "medium" : "low",
    freshnessLabel: hasNamedDoctrine ? "Local doctrine index + live committee state" : "Bloc fallback + local committee state",
  };
}

export function negotiationPressure(country: string, negotiations: NegotiationState[] = []): number {
  const n = negotiations.find((item) => item.country.toLowerCase() === country.toLowerCase());
  if (!n) return 0;
  if (n.status === "successful") return -12;
  if (n.status === "failed") return 18;
  if (n.status === "stalled") return 12;
  if (n.status === "active") return 6;
  return 0;
}
