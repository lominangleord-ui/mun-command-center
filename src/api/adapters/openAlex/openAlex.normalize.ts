import { createFreshness } from "../../core/freshness";
import { createSourceMetadata } from "../../core/sourceMetadata";
import type { PolicyResearchSource } from "../../models/research";

function reconstructAbstract(raw: any): string | undefined {
  const index = raw?.abstract_inverted_index;
  if (!index || typeof index !== "object") return undefined;
  const words: string[] = [];
  Object.entries(index).forEach(([word, positions]) => {
    if (Array.isArray(positions)) positions.forEach((pos) => { if (typeof pos === "number" && pos < 250) words[pos] = word; });
  });
  const text = words.filter(Boolean).join(" ");
  return text ? (text.length > 400 ? text.slice(0, 400) + "..." : text) : undefined;
}

export function normalizeOpenAlexWork(raw: any, endpoint: string): PolicyResearchSource {
  const authors = Array.isArray(raw?.authorships)
    ? raw.authorships.map((a: any) => a?.author?.display_name).filter(Boolean)
    : [];
  return {
    id: raw?.id || raw?.doi || raw?.title || "openalex-work",
    title: raw?.title || "Untitled source",
    authors,
    year: raw?.publication_year,
    doi: raw?.doi || undefined,
    abstract: reconstructAbstract(raw),
    citedByCount: raw?.cited_by_count,
    relevanceScore: raw?.relevance_score,
    source: createSourceMetadata("OpenAlex", endpoint, "CC0"),
    freshness: createFreshness("live"),
  };
}