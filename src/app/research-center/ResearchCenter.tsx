import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { buildIntelligenceBrief } from "../../api/services/intelligenceService";
import type { IntelligenceBrief } from "../../api/models/intelligence";
import { copyToClipboard, downloadAsFile } from "../../lib/exportImport";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { describeFreshness } from "../../api/core/freshness";
import { searchOpenAlexWorks } from "../../api/adapters/openAlex/openAlex.adapter";
import type { PolicyResearchSource } from "../../api/models/research";

export default function ResearchCenter() {
  const { activeCommittee } = useApp();
  const [queryCountry, setQueryCountry] = useState("");
  const [queryAgenda, setQueryAgenda] = useState("");
  const [extraQuery, setExtraQuery] = useState("");
  const [submitted, setSubmitted] = useState<{ country: string; agenda: string; extra: string } | null>(null);

  useEffect(() => {
    if (activeCommittee?.contextPack.country) setQueryCountry(activeCommittee.contextPack.country);
    if (activeCommittee?.contextPack.agenda) setQueryAgenda(activeCommittee.contextPack.agenda);
  }, [activeCommittee?.contextPack.country, activeCommittee?.contextPack.agenda]);

  const trimmedExtra = useMemo(() => extraQuery.trim(), [extraQuery]);

  const briefResource = useApiResource<IntelligenceBrief | null>(async () => {
    if (!submitted) return null;
    return buildIntelligenceBrief(submitted.country, submitted.agenda);
  }, [submitted]);

  const extraResearch = useApiResource<PolicyResearchSource[] | null>(async () => {
    if (!submitted || !trimmedExtra) return null;
    const r = await searchOpenAlexWorks(trimmedExtra, 6);
    return r.success && r.data ? r.data : r.staleData ?? [];
  }, [submitted, trimmedExtra]);

  if (!activeCommittee) return <div className="p-6 text-sm text-gray-500">Create a committee first.</div>;

  const ctx = activeCommittee.contextPack;
  const run = () => setSubmitted({ country: queryCountry || ctx.country, agenda: queryAgenda || ctx.agenda, extra: trimmedExtra });
  const briefData = briefResource.data;

  const exportBrief = async () => {
    if (!briefData) return;
    await copyToClipboard(JSON.stringify(briefData, null, 2));
  };

  const downloadBrief = () => {
    if (!briefData) return;
    const country = briefData.country.replace(/\s+/g, "_") || "research";
    downloadAsFile(JSON.stringify(briefData, null, 2), `${country}-research-brief.json`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Research / Briefing Center</h1>
        <p className="text-[11px] text-gray-500">
          OpenAlex policy sources and GDELT event context, separated into factual evidence and inferred analysis.
        </p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] shadow-tactical p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={queryCountry}
            onChange={(e) => setQueryCountry(e.target.value)}
            placeholder="Country or actor"
            className="bg-black/30 border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
          <input
            value={queryAgenda}
            onChange={(e) => setQueryAgenda(e.target.value)}
            placeholder="Agenda topic"
            className="bg-black/30 border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
          <input
            value={extraQuery}
            onChange={(e) => setExtraQuery(e.target.value)}
            placeholder="Extra OpenAlex query (optional)"
            className="bg-black/30 border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={briefResource.status === "loading"}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium"
          >
            {briefResource.status === "loading" ? "Searching live sources…" : "Build Brief"}
          </button>
          <button
            onClick={exportBrief}
            disabled={!briefData}
            className="px-3 py-2 rounded-xl border border-white/8 bg-white/[0.04] text-gray-300 disabled:text-gray-600 text-xs"
          >
            Copy JSON
          </button>
          <button
            onClick={downloadBrief}
            disabled={!briefData}
            className="px-3 py-2 rounded-xl border border-white/8 bg-white/[0.04] text-gray-300 disabled:text-gray-600 text-xs"
          >
            Download
          </button>
        </div>
      </div>

      {briefResource.status === "loading" && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-xs text-gray-500 animate-pulse">
          Fetching public sources…
        </div>
      )}

      {briefResource.status === "error" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-200">
          {briefResource.error || "Brief failed to load."}
        </div>
      )}

      {briefData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FactualPanel brief={briefData} />
          <ResearchPanel brief={briefData} extra={extraResearch.data ?? null} loading={extraResearch.status === "loading"} />
          <InferenceFooter brief={briefData} />
        </div>
      )}
    </div>
  );
}

function FactualPanel({ brief }: { brief: IntelligenceBrief }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.03] shadow-tactical p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">
          Factual: GDELT Event Context ({brief.events.length})
        </div>
        <span className="text-[8px] text-gray-500">last 14d · top 8</span>
      </div>
      {brief.events.length === 0 ? (
        <p className="text-xs text-gray-500">
          No high-signal events surfaced. Treat as quiet baseline; verify directly with primary sources.
        </p>
      ) : (
        brief.events.map((e) => (
          <a
            key={e.id}
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-white/6 bg-black/20 px-3 py-2 hover:bg-white/[0.04]"
          >
            <div className="text-xs text-gray-200 leading-snug line-clamp-2">{e.title}</div>
            <div className="text-[9px] text-gray-600 mt-1">{e.sourceDomain} · {e.date}</div>
          </a>
        ))
      )}
    </section>
  );
}

function ResearchPanel({ brief, extra, loading }: { brief: IntelligenceBrief; extra: PolicyResearchSource[] | null; loading: boolean }) {
  const merged = useMemo(() => {
    const seen = new Set<string>();
    const all = [...brief.researchSources, ...(extra ?? [])];
    return all.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [brief.researchSources, extra]);

  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.03] shadow-tactical p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">
          Factual: OpenAlex Research ({merged.length}){loading ? " · …" : ""}
        </div>
        <span className="text-[8px] text-gray-500">peer-reviewed / policy</span>
      </div>
      {merged.length === 0 ? (
        <p className="text-xs text-gray-500">No policy sources returned for the current query.</p>
      ) : (
        merged.slice(0, 8).map((p) => (
          <div key={p.id} className="rounded-xl border border-white/6 bg-black/20 px-3 py-2">
            <div className="text-xs text-gray-200 leading-snug">{p.title}</div>
            <div className="text-[9px] text-gray-600 mt-1">
              {p.year || "—"} · {p.authors.slice(0, 3).join(", ") || "Unknown authors"}
              {typeof p.citedByCount === "number" ? ` · cited ${p.citedByCount}×` : ""}
            </div>
            {p.doi && (
              <a href={p.doi} target="_blank" rel="noreferrer" className="text-[9px] text-blue-300 hover:underline">
                DOI / source ↗
              </a>
            )}
          </div>
        ))
      )}
    </section>
  );
}

function InferenceFooter({ brief }: { brief: IntelligenceBrief }) {
  return (
    <section className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] shadow-tactical p-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">
            Inferred Analysis (review before citing)
          </div>
          <ul className="text-[11px] text-amber-200/90 list-disc pl-4 space-y-0.5">
            {brief.inferredAnalysis.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">
            Source / Freshness
          </div>
          <div className="flex flex-wrap gap-1">
            {brief.sources.map((s, i) => (
              <span key={i} title={s.endpoint} className="text-[9px] px-2 py-1 rounded-lg border border-white/8 bg-white/[0.03] text-gray-400">
                {s.name} · {describeFreshness({ fetchedAt: s.fetchedAt, cacheStatus: "live", ageMs: Date.now() - new Date(s.fetchedAt).getTime() })}
              </span>
            ))}
          </div>
        </div>
      </div>
      {brief.errors.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-200">
          {brief.errors.join(" · ")}
        </div>
      )}
    </section>
  );
}
