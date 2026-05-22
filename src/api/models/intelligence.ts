import type { FreshnessInfo, SourceMetadata } from "./api";
import type { PolicyResearchSource } from "./research";

export interface GeopoliticalEvent {
  id: string;
  title: string;
  url: string;
  date: string;
  sourceDomain: string;
  tone?: number;
  relevance: number;
  source: SourceMetadata;
  freshness: FreshnessInfo;
}

export interface IntelligenceBrief {
  country: string;
  agenda: string;
  events: GeopoliticalEvent[];
  researchSources: PolicyResearchSource[];
  generatedAt: string;
  errors: string[];
  sources: SourceMetadata[];
  factualSummary: string[];
  inferredAnalysis: string[];
  aiStrategicAssessment?: string;
  aiProviderMetadata?: string;
}
