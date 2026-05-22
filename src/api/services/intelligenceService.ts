import { searchGdeltEvents } from "../adapters/gdelt/gdelt.adapter";
import { searchOpenAlexWorks } from "../adapters/openAlex/openAlex.adapter";
import type { IntelligenceBrief } from "../models/intelligence";
import { normalizeAgenda, agendaKeywordQuery } from "../../lib/intelligence/agendaNormalization";
import { aiOrchestrator } from "../../lib/ai/orchestration/aiOrchestrator";
import { buildSourceBackedCountryIntel, toSourceIntelBrief } from "../../lib/intelligence/sourceIntelligenceEngine";

export async function buildIntelligenceBrief(country: string, agenda: string): Promise<IntelligenceBrief> {
  const simulationYear = 2013;
  const normalized = normalizeAgenda(agenda);
  const query = `"${country}" AND (${agendaKeywordQuery(normalized) || "United Nations OR diplomacy"} OR "${normalized.rawAgenda}")`;
  const sourceIntel = await buildSourceBackedCountryIntel(country, normalized.rawAgenda, { simulationYear, maxEvents: 6, maxResearch: 5 });
  const sourceBrief = toSourceIntelBrief(sourceIntel, 3);
  const [events, papers] = await Promise.all([searchGdeltEvents(query), searchOpenAlexWorks(`${country} "${normalized.rawAgenda}" ${normalized.keywords.slice(0, 3).join(" ")}`, 5)]);
  const evRaw = events.success && events.data ? events.data : events.staleData ?? [];
  const researchRaw = papers.success && papers.data ? papers.data : papers.staleData ?? [];
  const ev = evRaw.filter((item) => {
    const year = Number(item.date?.match(/\b(19|20)\d{2}\b/)?.[0] || 0);
    return !year || year <= simulationYear;
  });
  const research = researchRaw.filter((item) => !item.year || item.year <= simulationYear);
  const ai = await aiOrchestrator.generate({
    task: "country-intelligence",
    sourceIntelBrief: sourceBrief,
    messages: [
      {
        role: "user",
        content: [
          `Country: ${country}`,
          `Agenda: ${normalized.rawAgenda}`,
          `Structured source counts: GDELT=${ev.length}, OpenAlex=${research.length}`,
          "Produce a concise tactical assessment: likely posture, red lines, workable wording, dangerous wording, sponsor likelihood, and one next negotiation move. Label inference and uncertainty.",
        ].join("\n"),
      },
    ],
    cacheTtlMs: 1000 * 60 * 30,
    maxTokens: 700,
  });
  return {
    country,
    agenda: normalized.rawAgenda,
    events: ev,
    researchSources: research,
    generatedAt: new Date().toISOString(),
    errors: [
      ...(!events.success && events.error ? [events.error.message] : []),
      ...(!papers.success && papers.error ? [papers.error.message] : []),
    ],
    sources: [events.source, papers.source],
    factualSummary: [
      `${ev.length} recent GDELT event references found for ${normalized.detectedDomains.join(", ")} domain(s)`,
      `${research.length} policy/research sources found using normalized agenda keywords`,
      `Source-backed profile: confidence=${sourceIntel.confidence}; freshness=${sourceIntel.freshness}; simulation year=${sourceIntel.simulationYear}`,
      `Timeline gating applied: ${evRaw.length - ev.length} event(s) and ${researchRaw.length - research.length} research item(s) excluded after ${simulationYear}.`,
    ],
    inferredAnalysis: [
      ...sourceBrief.slice(0, 3),
      ...(ev.length > 0
      ? [`Recent media attention may affect negotiation tone on "${normalized.rawAgenda}"`]
      : [`No high-signal recent events found for "${normalized.rawAgenda}"; treat this as low evidence, not stability`]),
    ],
    aiStrategicAssessment: ai.error?.code === "NO_PROVIDER" ? undefined : ai.content,
    aiProviderMetadata: ai.error?.code === "NO_PROVIDER" ? undefined : `${ai.provider}/${ai.model}${ai.cached ? " cached" : ""}${ai.fallbackUsed ? " fallback" : ""}`,
  };
}
