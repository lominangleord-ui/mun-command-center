import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react";
import type {
  StoredCommittee, ContextPack, Speech, Clause, BlocEntry, Note,
  TimelineEvent, StrategicAlert, Snapshot, NegotiationState, ViewMode,
} from "../types";
import { syncContextFromEntries } from "../types";
import {
  getAllCommittees, getCommittee, saveCommittee,
  deleteCommittee as deleteCommitteeDB, createDefaultCommittee,
  getSettings, saveSettings, generateId,
} from "../lib/storage";
import { COMMITTEE_SIMULATION_YEAR, mergeCanonicalRules } from "../lib/committee/committeeContext";

interface AppState {
  committees: StoredCommittee[];
  activeCommittee: StoredCommittee | null;
  loading: boolean;
  sidebarOpen: boolean;
  liveMode: boolean;
  viewMode: ViewMode;
  lastSavedAt: number | null;
}

type Action =
  | { type: "INIT"; committees: StoredCommittee[]; active: StoredCommittee | null; settings: { sidebarOpen: boolean; liveMode: boolean; viewMode: ViewMode } }
  | { type: "SET_ACTIVE"; committee: StoredCommittee }
  | { type: "UPDATE_ACTIVE"; fn: (c: StoredCommittee) => StoredCommittee }
  | { type: "DELETE"; id: string }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "REFRESH"; committees: StoredCommittee[]; active: StoredCommittee | null }
  | { type: "TOGGLE_LIVE" }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "MARK_SAVED"; at: number };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        committees: action.committees,
        activeCommittee: action.active,
        loading: false,
        sidebarOpen: action.settings.sidebarOpen,
        liveMode: action.settings.liveMode,
        viewMode: action.settings.viewMode,
      };
    case "SET_ACTIVE":
      return { ...state, activeCommittee: action.committee };
    case "UPDATE_ACTIVE": {
      if (!state.activeCommittee) return state;
      const updated = action.fn(state.activeCommittee);
      updated.updatedAt = Date.now();
      return {
        ...state,
        activeCommittee: updated,
        committees: state.committees.map((c) => c.id === updated.id ? updated : c),
      };
    }
    case "DELETE": {
      const committees = state.committees.filter((c) => c.id !== action.id);
      const active = state.activeCommittee?.id === action.id ? (committees[0] ?? null) : state.activeCommittee;
      return { ...state, committees, activeCommittee: active };
    }
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "TOGGLE_LIVE":
      return { ...state, liveMode: !state.liveMode };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode };
    case "REFRESH":
      return { ...state, committees: action.committees, activeCommittee: action.active };
    case "MARK_SAVED":
      return { ...state, lastSavedAt: action.at };
    default:
      return state;
  }
}

interface AppCtx extends AppState {
  createNewCommittee: () => Promise<StoredCommittee>;
  selectCommittee: (id: string) => Promise<void>;
  deleteCommittee: (id: string) => Promise<void>;
  updateContextPack: (pack: ContextPack) => Promise<void>;
  addSpeech: (s: Speech) => Promise<void>;
  addClause: (c: Clause) => Promise<void>;
  addBlocEntry: (e: BlocEntry) => Promise<void>;
  updateBlocEntry: (id: string, updates: Partial<BlocEntry>) => Promise<void>;
  deleteBlocEntry: (id: string) => Promise<void>;
  addNote: (n: Note) => Promise<void>;
  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => Promise<void>;
  addAlert: (alert: Omit<StrategicAlert, "id" | "timestamp" | "dismissed">) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  addSnapshot: (name: string) => Promise<void>;
  restoreSnapshot: (id: string) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  addNegotiation: (neg: Omit<NegotiationState, "id" | "updatedAt">) => Promise<void>;
  updateNegotiation: (id: string, updates: Partial<NegotiationState>) => Promise<void>;
  deleteNegotiation: (id: string) => Promise<void>;
  pinMemory: (text: string) => Promise<void>;
  compressContext: () => Promise<void>;
  updateCommittee: (fn: (c: StoredCommittee) => StoredCommittee) => Promise<void>;
  toggleSidebar: () => void;
  toggleLive: () => void;
  setViewMode: (mode: ViewMode) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be inside AppProvider");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    committees: [], activeCommittee: null, loading: true,
    sidebarOpen: true, liveMode: false, viewMode: "tactical", lastSavedAt: null,
  });

  // Keep a ref to the latest active committee for reliable async operations
  const activeRef = useRef<StoredCommittee | null>(null);
  activeRef.current = state.activeCommittee;

  // Initial load
  useEffect(() => {
    (async () => {
      const committees = await getAllCommittees();
      const settings = getSettings();
      let active: StoredCommittee | null = null;
      if (settings.activeCommitteeId) {
        active = await getCommittee(settings.activeCommitteeId) || null;
      }
      if (!active && committees.length > 0) {
        active = committees[0];
        saveSettings({ activeCommitteeId: active.id });
      }
      dispatch({
        type: "INIT", committees, active,
        settings: { sidebarOpen: settings.sidebarOpen, liveMode: settings.liveMode, viewMode: settings.viewMode },
      });
    })();
  }, []);

  const persist = useCallback(async (committee: StoredCommittee) => {
    await saveCommittee(committee);
    dispatch({ type: "MARK_SAVED", at: Date.now() });
  }, []);

  // Generic update + persist helper - relies on ref to avoid stale closure
  const mutate = useCallback(async (fn: (c: StoredCommittee) => StoredCommittee) => {
    const current = activeRef.current;
    if (!current) return;
    const updated = fn(current);
    updated.updatedAt = Date.now();
    dispatch({ type: "UPDATE_ACTIVE", fn });
    await persist(updated);
  }, [persist]);

  const createNewCommittee = useCallback(async () => {
    const c = createDefaultCommittee();
    await saveCommittee(c);
    saveSettings({ activeCommitteeId: c.id });
    const all = await getAllCommittees();
    dispatch({ type: "REFRESH", committees: all, active: c });
    return c;
  }, []);

  const selectCommittee = useCallback(async (id: string) => {
    const c = await getCommittee(id);
    if (c) {
      saveSettings({ activeCommitteeId: id });
      dispatch({ type: "SET_ACTIVE", committee: c });
    }
  }, []);

  const deleteCommittee = useCallback(async (id: string) => {
    await deleteCommitteeDB(id);
    const settings = getSettings();
    if (settings.activeCommitteeId === id) saveSettings({ activeCommitteeId: null });
    dispatch({ type: "DELETE", id });
  }, []);

  const updateContextPack = useCallback((pack: ContextPack) =>
    mutate((c) => ({
      ...c,
      contextPack: {
        ...pack,
        simulationYear: pack.simulationYearSource === "chair_override" ? pack.simulationYear : COMMITTEE_SIMULATION_YEAR,
        important_rules: mergeCanonicalRules(pack.important_rules),
      },
    })), [mutate]);

  const addSpeech = useCallback((s: Speech) =>
    mutate((c) => ({ ...c, speeches: [s, ...c.speeches] })), [mutate]);

  const addClause = useCallback((cl: Clause) =>
    mutate((c) => ({ ...c, clauses: [cl, ...c.clauses] })), [mutate]);

  const addBlocEntry = useCallback((entry: BlocEntry) =>
    mutate((c) => {
      const entries = [entry, ...c.blocEntries.filter((e) => e.country.toLowerCase() !== entry.country.toLowerCase())];
      return { ...c, blocEntries: entries, contextPack: syncContextFromEntries(c.contextPack, entries) };
    }), [mutate]);

  const updateBlocEntry = useCallback((id: string, updates: Partial<BlocEntry>) =>
    mutate((c) => {
      const entries = c.blocEntries.map((e) => e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e);
      return { ...c, blocEntries: entries, contextPack: syncContextFromEntries(c.contextPack, entries) };
    }), [mutate]);

  const deleteBlocEntry = useCallback((id: string) =>
    mutate((c) => {
      const entries = c.blocEntries.filter((e) => e.id !== id);
      return { ...c, blocEntries: entries, contextPack: syncContextFromEntries(c.contextPack, entries) };
    }), [mutate]);

  const addNote = useCallback((n: Note) =>
    mutate((c) => ({ ...c, notes: [n, ...c.notes] })), [mutate]);

  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, "id" | "timestamp">) =>
    mutate((c) => ({
      ...c,
      timeline: [{ id: generateId(), timestamp: Date.now(), ...event }, ...c.timeline].slice(0, 200),
    })), [mutate]);

  const addAlert = useCallback((alert: Omit<StrategicAlert, "id" | "timestamp" | "dismissed">) =>
    mutate((c) => {
      const newAlert: StrategicAlert = { id: generateId(), timestamp: Date.now(), dismissed: false, ...alert };
      const newEvent: TimelineEvent = { id: generateId(), timestamp: Date.now(), type: "alert", title: alert.title, description: alert.description, icon: alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️" };
      return { ...c, alerts: [newAlert, ...c.alerts].slice(0, 50), timeline: [newEvent, ...c.timeline].slice(0, 200) };
    }), [mutate]);

  const dismissAlert = useCallback((id: string) =>
    mutate((c) => ({ ...c, alerts: c.alerts.map((a) => a.id === id ? { ...a, dismissed: true } : a) })), [mutate]);

  const addSnapshot = useCallback((name: string) =>
    mutate((c) => {
      const snap: Snapshot = {
        id: generateId(),
        timestamp: Date.now(),
        name,
        state: {
          contextPack: c.contextPack, speeches: c.speeches, clauses: c.clauses,
          blocEntries: c.blocEntries, notes: c.notes, resolutions: c.resolutions,
          timeline: c.timeline, alerts: c.alerts, negotiations: c.negotiations,
          countryIntel: c.countryIntel, memories: c.memories,
        },
      };
      const ev: TimelineEvent = { id: generateId(), timestamp: Date.now(), type: "snapshot", title: `Snapshot: ${name}`, description: "Committee state preserved", icon: "📸" };
      return { ...c, snapshots: [snap, ...c.snapshots].slice(0, 30), timeline: [ev, ...c.timeline].slice(0, 200) };
    }), [mutate]);

  const restoreSnapshot = useCallback((id: string) =>
    mutate((c) => {
      const snap = c.snapshots.find((s) => s.id === id);
      if (!snap) return c;
      const ev: TimelineEvent = { id: generateId(), timestamp: Date.now(), type: "snapshot", title: `Restored: ${snap.name}`, description: "Reverted committee state", icon: "↺" };
      return { ...c, ...snap.state, snapshots: c.snapshots, timeline: [ev, ...snap.state.timeline].slice(0, 200) };
    }), [mutate]);

  const deleteSnapshot = useCallback((id: string) =>
    mutate((c) => ({ ...c, snapshots: c.snapshots.filter((s) => s.id !== id) })), [mutate]);

  const addNegotiation = useCallback((neg: Omit<NegotiationState, "id" | "updatedAt">) =>
    mutate((c) => {
      const n: NegotiationState = { id: generateId(), updatedAt: Date.now(), ...neg };
      const ev: TimelineEvent = { id: generateId(), timestamp: Date.now(), type: "negotiation", title: `Started negotiation with ${n.country}`, description: n.targetFraming || "Bilateral talks initiated", icon: "🤝" };
      return { ...c, negotiations: [n, ...c.negotiations], timeline: [ev, ...c.timeline].slice(0, 200) };
    }), [mutate]);

  const updateNegotiation = useCallback((id: string, updates: Partial<NegotiationState>) =>
    mutate((c) => ({ ...c, negotiations: c.negotiations.map((n) => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n) })), [mutate]);

  const deleteNegotiation = useCallback((id: string) =>
    mutate((c) => ({ ...c, negotiations: c.negotiations.filter((n) => n.id !== id) })), [mutate]);

  const pinMemory = useCallback((text: string) =>
    mutate((c) => {
      const ev: TimelineEvent = { id: generateId(), timestamp: Date.now(), type: "memory", title: "Pinned memory", description: text.slice(0, 80), icon: "📌" };
      return { ...c, memories: [text, ...c.memories].slice(0, 100), timeline: [ev, ...c.timeline].slice(0, 200) };
    }), [mutate]);

  const compressContext = useCallback(() =>
    mutate((c) => {
      const ctx = c.contextPack;
      const summary = [
        `[Summary @ ${new Date().toLocaleString()}]`,
        `${ctx.committee} · ${ctx.agenda} · Phase: ${ctx.current_phase}`,
        `Goal: ${ctx.active_goal || "—"}`,
        `Allies (${ctx.allies.length}): ${ctx.allies.join(", ") || "none"}`,
        `Opponents (${ctx.opponents.length}): ${ctx.opponents.join(", ") || "none"}`,
        `Speeches: ${c.speeches.length} · Clauses: ${c.clauses.length} · Negotiations: ${c.negotiations.length}`,
        `Recent updates: ${ctx.latest_updates.slice(-3).join("; ") || "none"}`,
      ].join("\n");
      const ev: TimelineEvent = { id: generateId(), timestamp: Date.now(), type: "memory", title: "Context compressed", description: "Generated rolling summary", icon: "🧠" };
      return { ...c, memories: [summary, ...c.memories].slice(0, 100), timeline: [ev, ...c.timeline].slice(0, 200) };
    }), [mutate]);

  const updateCommittee = useCallback((fn: (c: StoredCommittee) => StoredCommittee) =>
    mutate(fn), [mutate]);

  const toggleSidebar = useCallback(() => {
    saveSettings({ sidebarOpen: !state.sidebarOpen });
    dispatch({ type: "TOGGLE_SIDEBAR" });
  }, [state.sidebarOpen]);

  const toggleLive = useCallback(() => {
    saveSettings({ liveMode: !state.liveMode });
    dispatch({ type: "TOGGLE_LIVE" });
  }, [state.liveMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    saveSettings({ viewMode: mode });
    dispatch({ type: "SET_VIEW_MODE", mode });
  }, []);

  return (
    <Ctx.Provider value={{
      ...state, createNewCommittee, selectCommittee, deleteCommittee,
      updateContextPack, addSpeech, addClause, addBlocEntry, updateBlocEntry,
      deleteBlocEntry, addNote, addTimelineEvent, addAlert, dismissAlert,
      addSnapshot, restoreSnapshot, deleteSnapshot, addNegotiation, updateNegotiation,
      deleteNegotiation, pinMemory, compressContext, updateCommittee,
      toggleSidebar, toggleLive, setViewMode,
    }}>
      {children}
    </Ctx.Provider>
  );
}
