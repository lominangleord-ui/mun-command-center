import type { RelationshipLabel } from "../types";
import { normalizeAgenda, type AgendaModifiers } from "../lib/intelligence/agendaNormalization";

// ─── Agenda Ontology: each agenda topic defines how ALL systems behave ───

export interface AgendaTopic {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  category: "security" | "humanitarian" | "economic" | "governance" | "environmental" | "mixed";
  // How this agenda shifts relationship calculations
  relationshipModifiers: {
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
  };
  tacticalKeywords: string[];
  favoredBlocs: string[];
  disfavoredBlocs: string[];
}

export const AGENDA_ONTOLOGY: Record<string, AgendaTopic> = {
  middle_east_fragmentation: {
    id: "middle_east_fragmentation",
    label: "State Fragmentation, Non-State Actors, Proxy Warfare & Governance Crisis in the Middle East",
    shortLabel: "ME Fragmentation & Proxy Warfare",
    description: "Addressing the crisis of state fragmentation, the rise of non-state armed actors, proxy warfare dynamics, and governance collapse across the Middle East region.",
    category: "security",
    relationshipModifiers: {
      sovereigntyWeight: 0.9,
      interventionTolerance: 0.3,
      humanitarianWeight: 0.7,
      blocCohesionWeight: 0.8,
      swingVolatility: 0.6,
      enforcementWeight: 0.5,
      reconstructionWeight: 0.8,
      proxyWarfareWeight: 0.95,
      sanctionsWeight: 0.6,
      ceasefireWeight: 0.85,
    },
    tacticalKeywords: [
      "sovereignty", "territorial integrity", "non-state actors", "proxy",
      "governance", "stabilization", "ceasefire", "humanitarian corridor",
      "reconstruction", "state capacity", "militia", "extremism",
      "counterterrorism", "regional architecture", "multilateral",
    ],
    favoredBlocs: ["G77", "NAM", "Arab League"],
    disfavoredBlocs: ["WEOG"],
  },
  climate_security: {
    id: "climate_security",
    label: "Climate Change as a Threat to International Peace and Security",
    shortLabel: "Climate & Security",
    description: "Addressing climate change as an existential threat multiplier for international peace, security, and stability.",
    category: "mixed",
    relationshipModifiers: {
      sovereigntyWeight: 0.4,
      interventionTolerance: 0.6,
      humanitarianWeight: 0.8,
      blocCohesionWeight: 0.7,
      swingVolatility: 0.5,
      enforcementWeight: 0.4,
      reconstructionWeight: 0.6,
      proxyWarfareWeight: 0.1,
      sanctionsWeight: 0.3,
      ceasefireWeight: 0.2,
    },
    tacticalKeywords: [
      "climate justice", "loss and damage", "adaptation", "mitigation",
      "vulnerable states", "just transition", "green climate fund",
      "carbon neutrality", "resilience", "sustainable development",
    ],
    favoredBlocs: ["G77", "AOSIS", "EU"],
    disfavoredBlocs: ["Oil-exporting states"],
  },
  cyber_security: {
    id: "cyber_security",
    label: "Cybersecurity and Responsible State Behavior in Cyberspace",
    shortLabel: "Cybersecurity",
    description: "Developing norms for responsible state behavior in cyberspace and addressing cyber threats to international security.",
    category: "security",
    relationshipModifiers: {
      sovereigntyWeight: 0.7,
      interventionTolerance: 0.4,
      humanitarianWeight: 0.3,
      blocCohesionWeight: 0.6,
      swingVolatility: 0.7,
      enforcementWeight: 0.5,
      reconstructionWeight: 0.2,
      proxyWarfareWeight: 0.6,
      sanctionsWeight: 0.7,
      ceasefireWeight: 0.3,
    },
    tacticalKeywords: [
      "cyber sovereignty", "critical infrastructure", "attribution",
      "norms", "confidence-building", "capacity building",
      "information integrity", "digital divide", "cybercrime",
    ],
    favoredBlocs: ["WEOG", "EU"],
    disfavoredBlocs: ["States opposing binding norms"],
  },
  disarmament: {
    id: "disarmament",
    label: "General and Complete Disarmament",
    shortLabel: "Disarmament",
    description: "Advancing general and complete disarmament under effective international control.",
    category: "security",
    relationshipModifiers: {
      sovereigntyWeight: 0.8,
      interventionTolerance: 0.2,
      humanitarianWeight: 0.5,
      blocCohesionWeight: 0.9,
      swingVolatility: 0.4,
      enforcementWeight: 0.6,
      reconstructionWeight: 0.3,
      proxyWarfareWeight: 0.2,
      sanctionsWeight: 0.5,
      ceasefireWeight: 0.4,
    },
    tacticalKeywords: [
      "verification", "compliance", "transparency", "confidence-building",
      "nuclear-free", "conventional weapons", "arms trade treaty",
      "dual-use", "export controls",
    ],
    favoredBlocs: ["G77", "NAM"],
    disfavoredBlocs: ["Nuclear-armed P5 states"],
  },
};

// ─── Modifier application: given a delegate country and agenda, compute adjusted scores ───

export function applyAgendaModifiers(
  baseScore: number,
  agendaId: string,
  modifierKey: keyof AgendaTopic["relationshipModifiers"]
): number {
  const agenda = AGENDA_ONTOLOGY[agendaId];
  const modifier = agenda?.relationshipModifiers[modifierKey] ?? normalizeAgenda(agendaId).modifiers[modifierKey];
  return Math.round(baseScore * modifier);
}

// ─── Compute agenda-adjusted relationship label ───

export function computeAgendaRelationship(
  baseSupport: number,
  agendaId: string
): RelationshipLabel {
  const adjusted = applyAgendaModifiers(baseSupport, agendaId, "swingVolatility");
  if (adjusted >= 70) return "strong_ally";
  if (adjusted >= 55) return "likely_ally";
  if (adjusted >= 40) return "neutral";
  if (adjusted >= 25) return "uncertain";
  return "opponent";
}

// ─── Check if a keyword matches the current agenda ───

export function matchesAgendaKeywords(text: string, agendaId: string): { compatible: boolean; weight: number } {
  const lower = text.toLowerCase();
  const agenda = AGENDA_ONTOLOGY[agendaId];
  const keywords = agenda?.tacticalKeywords ?? normalizeAgenda(agendaId).keywords;
  const hitCount = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
  return {
    compatible: hitCount > 0,
    weight: Math.min(hitCount / 3, 1),
  };
}

// ─── Get the current active agenda modifiers for display ───

export function getActiveAgendaModifiers(agendaId: string): AgendaModifiers {
  return AGENDA_ONTOLOGY[agendaId]?.relationshipModifiers ?? normalizeAgenda(agendaId).modifiers;
}

// ─── Determine if a clause keyword is agenda-compatible ───

export function isClauseKeywordCompatible(keyword: string, agendaId: string): { compatible: boolean; weight: number } {
  const lower = keyword.toLowerCase();
  const agenda = AGENDA_ONTOLOGY[agendaId];
  const keywords = agenda?.tacticalKeywords ?? normalizeAgenda(agendaId).keywords;
  const hitCount = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
  return {
    compatible: hitCount > 0,
    weight: Math.min(hitCount / 3, 1),
  };
}
