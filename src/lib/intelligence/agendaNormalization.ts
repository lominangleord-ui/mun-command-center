import type { AgendaTopic } from "../../api/models/dossier";

export type AgendaDomain =
  | "climate" | "security" | "trade" | "health" | "technology"
  | "human-rights" | "development" | "peacekeeping" | "disarmament"
  | "reform" | "migration" | "humanitarian" | "sovereignty"
  | "sanctions" | "population" | "institutional";

export interface AgendaModifiers {
  sovereigntyWeight: number;
  interventionTolerance: number;
  humanitarianWeight: number;
  blocCohesionWeight: number;
  swingVolatility: number;
  enforcementWeight: number;
  reconstructionWeight: number;
  proxyWarfareWeight: number;
  sanctionsWeight: number;
  ceasefireWeight: number;
}

export interface NormalizedAgenda {
  rawAgenda: string;
  normalizedAgendaId: string;
  primaryTopic: AgendaTopic;
  keywords: string[];
  detectedDomains: AgendaDomain[];
  modifiers: AgendaModifiers;
  confidence: "low" | "medium" | "high";
  explanation: string;
}

const DOMAIN_PATTERNS: Array<{ domain: AgendaDomain; topic: AgendaTopic; words: string[]; pattern: RegExp; modifiers: Partial<AgendaModifiers> }> = [
  { domain: "climate", topic: "climate", words: ["climate", "emissions", "adaptation", "loss and damage", "carbon", "green finance"], pattern: /climat|emission|carbon|temperature|sustainab|green|cop\s*\d|adaptation|loss\s+and\s+damage/i, modifiers: { humanitarianWeight: 0.75, enforcementWeight: 0.42, reconstructionWeight: 0.62, swingVolatility: 0.52 } },
  { domain: "security", topic: "security", words: ["security", "conflict", "ceasefire", "military", "stability", "non-state actors"], pattern: /secur|peace|conflict|terror|military|weapon|missile|ceasefire|disturb|instability|proxy|non-state/i, modifiers: { sovereigntyWeight: 0.86, interventionTolerance: 0.32, enforcementWeight: 0.58, proxyWarfareWeight: 0.78, ceasefireWeight: 0.78, swingVolatility: 0.62 } },
  { domain: "trade", topic: "trade", words: ["trade", "tariffs", "sanctions", "supply chains", "market access"], pattern: /trade|tariff|sanction|wto|import|export|supply\s*chain|economic\s*coer|market\s+access/i, modifiers: { sanctionsWeight: 0.72, enforcementWeight: 0.55, blocCohesionWeight: 0.62, swingVolatility: 0.58 } },
  { domain: "health", topic: "health", words: ["health", "pandemic", "vaccines", "WHO", "disease surveillance"], pattern: /health|pandemic|covid|disease|who|pharma|vaccine|epidemic|surveillance/i, modifiers: { humanitarianWeight: 0.82, reconstructionWeight: 0.58, enforcementWeight: 0.36 } },
  { domain: "technology", topic: "technology", words: ["technology", "cyber", "AI", "data governance", "digital divide"], pattern: /tech|digital|ai\b|cyber|data\s*govern|innovat|internet|critical\s+infrastructure/i, modifiers: { sovereigntyWeight: 0.65, enforcementWeight: 0.52, swingVolatility: 0.68, proxyWarfareWeight: 0.48 } },
  { domain: "human-rights", topic: "human-rights", words: ["human rights", "monitoring", "detention", "gender", "freedoms"], pattern: /human.right|gender|freedom|detention|disappear|atrocit|civilian\s+protection/i, modifiers: { humanitarianWeight: 0.86, sovereigntyWeight: 0.78, interventionTolerance: 0.38, enforcementWeight: 0.5 } },
  { domain: "development", topic: "development", words: ["development", "SDGs", "poverty", "aid", "debt relief", "capacity building"], pattern: /develop|poverty|sdg|aid|debt|ldc|oda|capacity.build|financing/i, modifiers: { reconstructionWeight: 0.72, humanitarianWeight: 0.68, enforcementWeight: 0.28, blocCohesionWeight: 0.72 } },
  { domain: "peacekeeping", topic: "peacekeeping", words: ["peacekeeping", "mandate", "blue helmets", "mission drawdown"], pattern: /peacekeep|pko|un\s*mission|mandate|blue\s*helmet|deploy|drawdown/i, modifiers: { sovereigntyWeight: 0.72, interventionTolerance: 0.42, ceasefireWeight: 0.82, enforcementWeight: 0.52 } },
  { domain: "disarmament", topic: "disarmament", words: ["disarmament", "arms control", "verification", "NPT", "dual-use"], pattern: /disarm|arms.control|npt|ctbt|cluster.munition|landmine|verification|dual-use/i, modifiers: { sovereigntyWeight: 0.75, enforcementWeight: 0.62, blocCohesionWeight: 0.78 } },
  { domain: "reform", topic: "reform", words: ["UN reform", "veto", "Security Council", "representation"], pattern: /un.reform|security.council.reform|charter|veto|membership|representation/i, modifiers: { institutional: 1 } as Partial<AgendaModifiers> },
  { domain: "migration", topic: "migration", words: ["migration", "refugees", "asylum", "displacement", "burden sharing"], pattern: /migra|asylum|border|displacement|refugee|burden.shar/i, modifiers: { humanitarianWeight: 0.76, sovereigntyWeight: 0.7, swingVolatility: 0.64 } },
  { domain: "sanctions", topic: "trade", words: ["sanctions", "embargo", "compliance", "targeted measures"], pattern: /sanction|embargo|compliance|targeted\s+measure|asset\s+freeze/i, modifiers: { sanctionsWeight: 0.9, enforcementWeight: 0.72, sovereigntyWeight: 0.74, swingVolatility: 0.66 } },
  { domain: "population", topic: "development", words: ["population", "demography", "fertility", "reproductive health"], pattern: /population|demograph|birth|fertility|reproductive/i, modifiers: { sovereigntyWeight: 0.78, humanitarianWeight: 0.62, enforcementWeight: 0.24, swingVolatility: 0.7 } },
  { domain: "humanitarian", topic: "human-rights", words: ["humanitarian access", "relief", "corridors", "civilian protection"], pattern: /humanitarian|relief|corridor|civilian|aid\s+access/i, modifiers: { humanitarianWeight: 0.9, ceasefireWeight: 0.7, reconstructionWeight: 0.66 } },
  { domain: "sovereignty", topic: "security", words: ["sovereignty", "non-interference", "territorial integrity"], pattern: /sovereign|non-interference|territorial\s+integrity|domestic\s+jurisdiction/i, modifiers: { sovereigntyWeight: 0.92, interventionTolerance: 0.2, enforcementWeight: 0.35 } },
];

const BASE_MODIFIERS: AgendaModifiers = {
  sovereigntyWeight: 0.55,
  interventionTolerance: 0.5,
  humanitarianWeight: 0.5,
  blocCohesionWeight: 0.55,
  swingVolatility: 0.5,
  enforcementWeight: 0.45,
  reconstructionWeight: 0.45,
  proxyWarfareWeight: 0.2,
  sanctionsWeight: 0.25,
  ceasefireWeight: 0.25,
};

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80) || "unspecified";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalizeAgenda(rawAgenda: string): NormalizedAgenda {
  const raw = rawAgenda.trim() || "Unspecified agenda";
  const hits = DOMAIN_PATTERNS.filter((d) => d.pattern.test(raw));
  const detectedDomains = hits.map((h) => h.domain);
  const keywords = Array.from(new Set(hits.flatMap((h) => h.words))).slice(0, 16);
  const primary = hits[0]?.topic ?? "general";
  const modifiers = { ...BASE_MODIFIERS };

  for (const hit of hits) {
    for (const [key, value] of Object.entries(hit.modifiers)) {
      if (key in modifiers && typeof value === "number") {
        const k = key as keyof AgendaModifiers;
        modifiers[k] = clamp01((modifiers[k] + value) / 2);
      }
    }
  }

  const confidence = hits.length >= 2 ? "high" : hits.length === 1 ? "medium" : "low";
  const normalizedAgendaId = hits.length
    ? `${hits.slice(0, 3).map((h) => h.domain).join("+")}:${slugify(raw)}`
    : `custom:${slugify(raw)}`;

  return {
    rawAgenda: raw,
    normalizedAgendaId,
    primaryTopic: primary,
    keywords: keywords.length ? keywords : raw.split(/\s+/).filter((w) => w.length > 4).slice(0, 8),
    detectedDomains: detectedDomains.length ? detectedDomains : ["institutional"],
    modifiers,
    confidence,
    explanation: hits.length
      ? `Matched ${detectedDomains.join(", ")} agenda domain${hits.length > 1 ? "s" : ""}.`
      : "No ontology domain matched; using explicit custom agenda analysis instead of a silent generic fallback.",
  };
}

export function agendaHasDomain(agenda: NormalizedAgenda, domains: AgendaDomain[]): boolean {
  return agenda.detectedDomains.some((d) => domains.includes(d));
}

export function agendaKeywordQuery(agenda: NormalizedAgenda): string {
  return agenda.keywords.slice(0, 6).map((k) => k.includes(" ") ? `"${k}"` : k).join(" OR ");
}
