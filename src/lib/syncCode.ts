import type { BlocEntry, Clause, NegotiationState, StrategicAlert, StoredCommittee } from "../types";

// Generate a compact base64 share code from current committee state
export function generateShareCode(committee: StoredCommittee): string {
  const minimal = {
    contextPack: {
      committee: committee.contextPack.committee,
      agenda: committee.contextPack.agenda,
      country: committee.contextPack.country,
      role: committee.contextPack.role,
      current_phase: committee.contextPack.current_phase,
      bloc: committee.contextPack.bloc,
      active_goal: committee.contextPack.active_goal,
      allies: committee.contextPack.allies,
      opponents: committee.contextPack.opponents,
      simulationYear: committee.contextPack.simulationYear,
      simulationYearSource: committee.contextPack.simulationYearSource,
      committeeSize: committee.contextPack.committeeSize,
      committeeType: committee.contextPack.committeeType,
      delegateMode: committee.contextPack.delegateMode,
      delegateRole: committee.contextPack.delegateRole,
      partnerName: committee.contextPack.partnerName,
    },
    blocEntries: committee.blocEntries,
    clauses: committee.clauses.filter((c) => c.status !== "draft"),
    negotiations: committee.negotiations,
    alerts: committee.alerts.filter((a) => !a.dismissed),
    timeline: committee.timeline.slice(-20),
  };
  return btoa(encodeURIComponent(JSON.stringify(minimal)));
}

export interface SyncResult {
  newBlocEntries: number;
  updatedBlocEntries: number;
  newClauses: number;
  newNegotiations: number;
  newAlerts: number;
}

// Parse and merge incoming share code — incoming data wins on conflicts
export function applyShareCode(code: string, existing: StoredCommittee): SyncResult {
  const incoming = JSON.parse(decodeURIComponent(atob(code)));
  const result: SyncResult = {
    newBlocEntries: 0,
    updatedBlocEntries: 0,
    newClauses: 0,
    newNegotiations: 0,
    newAlerts: 0,
  };

  // Merge bloc entries
  const existingMap = new Map(existing.blocEntries.map((e) => [e.country.toLowerCase(), e]));
  const mergedEntries: BlocEntry[] = [...existing.blocEntries];
  (incoming.blocEntries || []).forEach((inc: BlocEntry) => {
    const key = inc.country.toLowerCase();
    const ex = existingMap.get(key);
    if (!ex) {
      mergedEntries.push(inc);
      result.newBlocEntries++;
    } else if (inc.updatedAt > ex.updatedAt) {
      const idx = mergedEntries.findIndex((e) => e.id === ex.id);
      if (idx >= 0) mergedEntries[idx] = inc;
      result.updatedBlocEntries++;
    }
  });

  // Merge clauses (only non-draft from sync)
  const existingClauseIds = new Set(existing.clauses.map((c) => c.id));
  let mergedClauses = [...existing.clauses];
  (incoming.clauses || []).forEach((c: Clause) => {
    if (!existingClauseIds.has(c.id)) {
      mergedClauses.push(c);
      result.newClauses++;
    }
  });

  // Merge negotiations
  const existingNegIds = new Set(existing.negotiations.map((n) => n.id));
  let mergedNegotiations = [...existing.negotiations];
  (incoming.negotiations || []).forEach((n: NegotiationState) => {
    if (!existingNegIds.has(n.id)) {
      mergedNegotiations.push(n);
      result.newNegotiations++;
    }
  });

  // Merge alerts
  const existingAlertIds = new Set(existing.alerts.map((a) => a.id));
  const incomingAlerts = incoming.alerts || [];
  const newAlerts: StrategicAlert[] = incomingAlerts.filter(
    (a: StrategicAlert) => !existingAlertIds.has(a.id)
  );
  result.newAlerts = newAlerts.length;

  // Apply to existing via mutation
  existing.blocEntries = mergedEntries;
  existing.clauses = mergedClauses;
  existing.negotiations = mergedNegotiations;
  existing.alerts = [...existing.alerts, ...newAlerts];
  if (incoming.contextPack) {
    existing.contextPack = { ...existing.contextPack, ...incoming.contextPack };
  }
  if (incoming.timeline) {
    existing.timeline = [...incoming.timeline, ...existing.timeline].slice(0, 200);
  }

  return result;
}

export function mergeSharedCommittee(existing: StoredCommittee, incoming: StoredCommittee): StoredCommittee {
  const result: StoredCommittee = { ...existing };
  const entryMap = new Map(existing.blocEntries.map((e) => [e.country.toLowerCase(), e]));
  incoming.blocEntries.forEach((inc) => {
    const key = inc.country.toLowerCase();
    const current = entryMap.get(key);
    if (!current || inc.updatedAt >= current.updatedAt) entryMap.set(key, inc);
  });

  const clauseMap = new Map(existing.clauses.map((c) => [c.id, c]));
  incoming.clauses.forEach((inc) => {
    const current = clauseMap.get(inc.id);
    if (!current || inc.createdAt >= current.createdAt) clauseMap.set(inc.id, inc);
  });

  const speechMap = new Map(existing.speeches.map((s) => [s.id, s]));
  incoming.speeches.forEach((inc) => {
    const current = speechMap.get(inc.id);
    if (!current || inc.createdAt >= current.createdAt) speechMap.set(inc.id, inc);
  });

  const negMap = new Map(existing.negotiations.map((n) => [n.id, n]));
  incoming.negotiations.forEach((inc) => {
    const current = negMap.get(inc.id);
    if (!current || inc.updatedAt >= current.updatedAt) negMap.set(inc.id, inc);
  });

  const timelineMap = new Map(existing.timeline.map((t) => [t.id, t]));
  incoming.timeline.forEach((t) => timelineMap.set(t.id, t));

  const alertMap = new Map(existing.alerts.map((a) => [a.id, a]));
  incoming.alerts.forEach((a) => alertMap.set(a.id, a));

  return {
    ...result,
    contextPack: incoming.updatedAt >= existing.updatedAt ? incoming.contextPack : existing.contextPack,
    blocEntries: Array.from(entryMap.values()),
    clauses: Array.from(clauseMap.values()),
    speeches: Array.from(speechMap.values()),
    negotiations: Array.from(negMap.values()),
    timeline: Array.from(timelineMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 200),
    alerts: Array.from(alertMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100),
    memories: Array.from(new Set([...incoming.memories, ...existing.memories])).slice(0, 100),
    positionPaper: incoming.updatedAt >= existing.updatedAt ? incoming.positionPaper : existing.positionPaper,
    updatedAt: Math.max(existing.updatedAt, incoming.updatedAt),
  };
}
