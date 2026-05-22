import type { StoredCommittee, ContextPack } from "../types";
import { COMMITTEE_SIMULATION_YEAR, canonicalImportantRules } from "./committee/committeeContext";

const DB_NAME = "mun-command-center";
const DB_VERSION = 2;
const STORE_NAME = "committees";
const SETTINGS_KEY = "mun-settings";
const FALLBACK_KEY = "mun-command-center-fallback";

let indexedDbUnavailable = false;

function readFallback(): StoredCommittee[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw).map(normalizeCommittee) : [];
  } catch {
    return [];
  }
}

function writeFallback(committees: StoredCommittee[]): void {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(committees));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (indexedDbUnavailable || typeof indexedDB === "undefined") {
      indexedDbUnavailable = true;
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      indexedDbUnavailable = true;
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => undefined;
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function withStoreCursor(fn: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createDefaultContext(): ContextPack {
  return {
    committee: "", agenda: "", country: "", role: "Delegate",
    current_phase: "roll_call", bloc: "", allies: [], opponents: [],
    active_goal: "", important_rules: canonicalImportantRules(), latest_updates: [], next_action_needed: "",
    simulationYear: COMMITTEE_SIMULATION_YEAR,
    simulationYearSource: "default_2013",
    committeeSize: 193,
    committeeType: "unga",
    delegateMode: "double",
    delegateRole: "unassigned",
    partnerName: "",
  };
}

export function createDefaultCommittee(): StoredCommittee {
  return {
    id: generateId(), contextPack: createDefaultContext(), speeches: [], clauses: [],
    blocEntries: [], notes: [], resolutions: [], timeline: [], alerts: [],
    snapshots: [], negotiations: [], countryIntel: [], memories: [],
    positionPaper: {
      corePosition: "", keyPolicies: [], nonNegotiables: [],
      openToCompromise: [], priorResolutions: [], suggestedLanguage: [],
    },
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

// Backfill any missing fields from older stored committees
export function normalizeCommittee(c: any): StoredCommittee {
  const def = createDefaultCommittee();
  const ctx = c.contextPack || {};
  return {
    ...def,
    ...c,
    contextPack: {
      ...def.contextPack,
      ...ctx,
      delegateMode: "double",
      allies: Array.isArray(ctx.allies) ? ctx.allies : [],
      opponents: Array.isArray(ctx.opponents) ? ctx.opponents : [],
      important_rules: Array.isArray(ctx.important_rules) ? ctx.important_rules : [],
      latest_updates: Array.isArray(ctx.latest_updates) ? ctx.latest_updates : [],
      simulationYearSource: ctx.simulationYearSource === "chair_override" ? "chair_override" : "default_2013",
      simulationYear: ctx.simulationYearSource === "chair_override"
        ? (typeof ctx.simulationYear === "number" && Number.isFinite(ctx.simulationYear) ? ctx.simulationYear : COMMITTEE_SIMULATION_YEAR)
        : COMMITTEE_SIMULATION_YEAR,
    },
    speeches: c.speeches || [],
    clauses: c.clauses || [],
    blocEntries: c.blocEntries || [],
    notes: c.notes || [],
    resolutions: c.resolutions || [],
    timeline: c.timeline || [],
    alerts: c.alerts || [],
    snapshots: c.snapshots || [],
    negotiations: c.negotiations || [],
    countryIntel: c.countryIntel || [],
    memories: c.memories || [],
    positionPaper: c.positionPaper || def.positionPaper,
    id: c.id || def.id,
    createdAt: c.createdAt || def.createdAt,
    updatedAt: c.updatedAt || def.updatedAt,
  };
}

export async function getAllCommittees(): Promise<StoredCommittee[]> {
  if (indexedDbUnavailable) return readFallback();
  try {
    const result = await withStore<StoredCommittee[]>("readonly", (store) => store.getAll());
    return (result || []).map(normalizeCommittee);
  } catch {
    indexedDbUnavailable = true;
    return readFallback();
  }
}

export async function getCommittee(id: string): Promise<StoredCommittee | undefined> {
  if (indexedDbUnavailable) return readFallback().find((c) => c.id === id);
  try {
    const r = await withStore<StoredCommittee | undefined>("readonly", (store) => store.get(id));
    return r ? normalizeCommittee(r) : undefined;
  } catch {
    indexedDbUnavailable = true;
    return readFallback().find((c) => c.id === id);
  }
}

export async function saveCommittee(data: StoredCommittee): Promise<void> {
  data.updatedAt = Date.now();
  if (indexedDbUnavailable) {
    const all = readFallback();
    const idx = all.findIndex((c) => c.id === data.id);
    if (idx >= 0) all[idx] = data;
    else all.push(data);
    writeFallback(all);
    return;
  }
  try {
    await withStoreCursor((store) => store.put(data));
  } catch {
    indexedDbUnavailable = true;
    await saveCommittee(data);
  }
}

export async function deleteCommittee(id: string): Promise<void> {
  if (indexedDbUnavailable) {
    writeFallback(readFallback().filter((c) => c.id !== id));
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export interface AppSettings {
  activeCommitteeId: string | null;
  viewMode: "tactical" | "drafting" | "diplomacy" | "voting" | "compact" | "presentation";
  liveMode: boolean;
  sidebarOpen: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  activeCommitteeId: null,
  viewMode: "tactical",
  liveMode: false,
  sidebarOpen: true,
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const merged = { ...getSettings(), ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
}
