import type { FreshnessInfo, SourceMetadata } from "./api";

export interface PolicyResearchSource {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  abstract?: string;
  citedByCount?: number;
  relevanceScore?: number;
  source: SourceMetadata;
  freshness: FreshnessInfo;
}

export interface ResearchBrief {
  query: string;
  sources: PolicyResearchSource[];
  generatedAt: string;
  errors: string[];
}