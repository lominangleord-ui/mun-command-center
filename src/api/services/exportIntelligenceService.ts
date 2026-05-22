import type { StoredCommittee } from "../../types";
import { buildCountryProfile } from "./countryService";
import { buildIntelligenceBrief } from "./intelligenceService";

export async function buildExportableIntelligencePacket(committee: StoredCommittee) {
  const country = committee.contextPack.country;
  const agenda = committee.contextPack.agenda;
  const profile = country ? await buildCountryProfile(country, false) : null;
  const brief = country && agenda ? await buildIntelligenceBrief(country, agenda) : null;
  return {
    version: 1,
    type: "mun-intelligence-packet",
    exportedAt: new Date().toISOString(),
    committeeId: committee.id,
    committee: committee.contextPack.committee,
    agenda,
    country,
    factualData: {
      countryMetadata: profile?.metadata ?? null,
      indicators: profile?.indicators ?? null,
      events: brief?.events ?? [],
      researchSources: brief?.researchSources ?? [],
      sources: [...(profile?.sources ?? []), ...(brief?.sources ?? [])],
      freshness: [...(profile?.freshness ?? [])],
    },
    inferredAnalysis: {
      blocAlignment: committee.contextPack.bloc || null,
      allies: committee.contextPack.allies,
      opponents: committee.contextPack.opponents,
      trackedRelationships: committee.blocEntries.map((e) => ({ country: e.country, stance: e.stance, support: e.supportLevel, risk: e.riskLevel })),
      basis: [
        "Manual committee state",
        "REST Countries metadata where available",
        "World Bank indicators where available",
        "GDELT event feed where available",
      ],
    },
    manualNotes: committee.notes.slice(0, 20),
  };
}