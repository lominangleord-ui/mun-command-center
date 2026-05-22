import { createFreshness } from "../../core/freshness";
import { createSourceMetadata } from "../../core/sourceMetadata";
import type { GeopoliticalEvent } from "../../models/intelligence";

export function normalizeGdeltArticle(raw: any, endpoint: string): GeopoliticalEvent {
  const date = raw?.seendate || raw?.published || raw?.date || new Date().toISOString();
  const title = String(raw?.title || "Untitled GDELT item").replace(/\s+/g, " ").trim();
  const url = String(raw?.url || "");
  return {
    id: `${url}-${title}`,
    title,
    url,
    date,
    sourceDomain: raw?.domain || new URL(url || "https://gdeltproject.org").hostname,
    tone: typeof raw?.tone === "number" ? raw.tone : undefined,
    relevance: typeof raw?.relevance === "number" ? raw.relevance : 0.5,
    source: createSourceMetadata("GDELT 2.0 DOC", endpoint),
    freshness: createFreshness("live"),
  };
}