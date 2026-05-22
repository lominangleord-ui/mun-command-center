import type { SourceDefinition } from "./sourceRegistry";

export type ClaimStatus =
  | "FACT"
  | "OFFICIAL_POSITION"
  | "INFERENCE"
  | "DISPUTED_CLAIM"
  | "PROPAGANDA_RISK"
  | "STALE_INFO";

export interface VerifiedClaim {
  status: ClaimStatus;
  claim: string;
  confidence: "high" | "medium" | "low";
  sourceLabels: string[];
  reasoning: string;
}

export function scoreSourceTrust(source: SourceDefinition): number {
  const tierScore = source.trustTier === "primary" ? 100
    : source.trustTier === "strong-secondary" ? 80
    : source.trustTier === "secondary" ? 60
    : 35;
  const biasPenalty = source.biasRisk === "high" ? 20 : source.biasRisk === "medium" ? 10 : 0;
  return Math.max(0, tierScore - biasPenalty + Math.min(20, source.overridePriority / 10));
}

export function classifyClaim(
  claim: string,
  sources: SourceDefinition[],
  options: { official?: boolean; disputed?: boolean; stale?: boolean; propagandaRisk?: boolean } = {},
): VerifiedClaim {
  const trust = sources.length ? Math.round(sources.reduce((sum, source) => sum + scoreSourceTrust(source), 0) / sources.length) : 0;
  const confidence: VerifiedClaim["confidence"] = trust >= 82 ? "high" : trust >= 60 ? "medium" : "low";

  let status: ClaimStatus = "INFERENCE";
  if (options.stale) status = "STALE_INFO";
  else if (options.propagandaRisk) status = "PROPAGANDA_RISK";
  else if (options.disputed) status = "DISPUTED_CLAIM";
  else if (options.official) status = "OFFICIAL_POSITION";
  else if (confidence === "high") status = "FACT";

  return {
    status,
    claim,
    confidence,
    sourceLabels: sources.map((s) => s.label),
    reasoning: `avg_trust=${trust}; source_count=${sources.length}; flags=${Object.entries(options).filter(([, v]) => v).map(([k]) => k).join(",") || "none"}`,
  };
}

export function detectSimulationYearViolations(text: string, simulationYear: number): string[] {
  const violations: string[] = [];
  const years = text.match(/\b(19|20)\d{2}\b/g) || [];
  for (const yearText of years) {
    const year = Number(yearText);
    if (year > simulationYear) violations.push(`Contains out-of-scope year ${year} (> ${simulationYear})`);
  }
  return violations;
}

