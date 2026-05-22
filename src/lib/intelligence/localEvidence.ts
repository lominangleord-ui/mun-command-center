export interface LocalEvidenceEntry {
  id: string;
  country: string;
  title: string;
  claim: string;
  asOfYear: number;
  confidence: "high" | "medium" | "low";
  freshness: "structural" | "mixed" | "outdated";
}

export const AZERBAIJAN_2013_LOCAL_EVIDENCE: LocalEvidenceEntry[] = [
  {
    id: "az-2013-sovereignty-core",
    country: "Azerbaijan",
    title: "Sovereignty-first doctrine",
    claim: "Azerbaijan frames DISEC strategy around territorial integrity, non-interference, and delegitimization of armed secessionist/proxy actors.",
    asOfYear: 2013,
    confidence: "high",
    freshness: "structural",
  },
  {
    id: "az-2013-nam-oic-bridge",
    country: "Azerbaijan",
    title: "NAM/OIC bridge behavior",
    claim: "Azerbaijan uses NAM/OIC coalition channels to gather broad sovereignist backing while avoiding rigid bloc dependency.",
    asOfYear: 2013,
    confidence: "medium",
    freshness: "mixed",
  },
  {
    id: "az-2013-proxy-border-risk",
    country: "Azerbaijan",
    title: "Proxy and border-security sensitivity",
    claim: "Azerbaijan treats proxy warfare, illicit arms flows, and foreign-fighter movements as direct risks to border security and domestic stability.",
    asOfYear: 2013,
    confidence: "high",
    freshness: "mixed",
  },
  {
    id: "az-2013-clause-preferences",
    country: "Azerbaijan",
    title: "Clause preference pattern",
    claim: "Azerbaijan tends to support host-state-consent language, anti-proxy controls, and state-capacity clauses while resisting intervention-first or regime-change wording.",
    asOfYear: 2013,
    confidence: "medium",
    freshness: "mixed",
  },
];

export function getLocalEvidence(country: string, simulationYear: number): LocalEvidenceEntry[] {
  const key = country.trim().toLowerCase();
  if (key !== "azerbaijan") return [];
  return AZERBAIJAN_2013_LOCAL_EVIDENCE.filter((item) => item.asOfYear <= simulationYear);
}
