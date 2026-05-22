import type { AIRequest, AIResponse } from "../models/types";

const CACHE_KEY = "mun-ai-response-cache";

interface CacheEntry {
  key: string;
  expiresAt: number;
  createdAt: number;
  response: AIResponse;
}

function readCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(entries: CacheEntry[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(0, 80)));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function hashAIRequest(providerId: string, model: string, request: AIRequest): Promise<string> {
  const payload = stableStringify({
    providerId,
    model,
    task: request.task,
    messages: request.messages,
    country: request.context?.country,
    agenda: request.context?.agenda,
    phase: request.context?.current_phase,
    strategicContextGeneratedAt: request.strategicContext?.generatedAt,
    strategicSimulationYear: request.strategicContext?.simulationYear,
    strategicTimelineLockActive: request.strategicContext?.timelineLockActive,
    strategicTimelineLockSource: request.strategicContext?.timelineLockSource,
    nextBestMove: request.strategicContext?.nextBestMove,
    relationshipCount: request.strategicContext?.relationshipGraph.length,
    sourceIntelBrief: request.sourceIntelBrief?.slice(0, 20),
    strategicMode: request.strategicMode,
  });
  const bytes = new TextEncoder().encode(payload);
  if (!crypto?.subtle) return btoa(payload).slice(0, 96);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCachedAIResponse(key: string): AIResponse | null {
  const now = Date.now();
  const match = readCache().find((entry) => entry.key === key && entry.expiresAt > now);
  if (!match) return null;
  return {
    ...match.response,
    cached: true,
    sourceBasis: "cache",
    metadata: { ...match.response.metadata, cached: true },
  };
}

export function setCachedAIResponse(key: string, response: AIResponse, ttlMs = 1000 * 60 * 20): void {
  const entries = readCache().filter((entry) => entry.key !== key && entry.expiresAt > Date.now());
  writeCache([{ key, response, createdAt: Date.now(), expiresAt: Date.now() + ttlMs }, ...entries]);
}

export function clearAICache(): void {
  localStorage.removeItem(CACHE_KEY);
}
