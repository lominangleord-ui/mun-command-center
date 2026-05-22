/**
 * DossierCard
 *
 * Renders a CountryDossier as a structured intelligence brief.
 * The component is purely presentational — all prose is generated
 * by dossierService.ts, not here.
 *
 * Layout:
 *   1. Data quality / freshness strip
 *   2. Overview paragraph
 *   3. Key facts (FACT-labelled, source-cited)
 *   4. Strategic inference (INFERENCE-labelled)
 *   5. Bloc behaviour
 *   6. Negotiation strategy
 *   7. Red lines
 *   8. Resolution preferences
 *   9. Recommended action (highlighted)
 */

import { useState } from "react";
import type { CountryDossier, EvidenceItem, EvidenceBasis } from "../../../api/models/dossier";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { buildCountryDossier, type DossierContextOptions } from "../../../lib/services/dossierService";
import type { BlocEntry, CountryIntel } from "../../../types";

interface Props {
  country: string;
  agenda: string;
  blocEntry?: BlocEntry;
  intel?: CountryIntel;
  contextOptions?: DossierContextOptions;
  compact?: boolean;
}

// ── Basis badge ───────────────────────────────────────────────────────────────
const BASIS_STYLE: Record<EvidenceBasis, { label: string; cls: string }> = {
  FACT:           { label: "FACT",           cls: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  INFERENCE:      { label: "INFERENCE",      cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  RECOMMENDATION: { label: "ACTION",         cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  UNCERTAIN:      { label: "UNCERTAIN",      cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  CONTRADICTION:  { label: "DISCREPANCY",    cls: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
};

function BasisTag({ basis }: { basis: EvidenceBasis }) {
  const s = BASIS_STYLE[basis];
  return <span className={`text-[7px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${s.cls}`}>{s.label}</span>;
}

function EvidenceBlock({ item, className = "" }: { item: EvidenceItem; className?: string }) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <BasisTag basis={item.basis} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-300 leading-relaxed">{item.claim}</p>
        {item.sourceLabel && (
          <p className="text-[9px] text-gray-600 mt-0.5">
            ↳ {item.sourceLabel}
            {item.fetchedAt && ` · ${new Date(item.fetchedAt).toLocaleDateString()}`}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, dot, children }: { title: string; dot: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-1 h-1 rounded-full ${dot}`} />
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── Data quality strip ────────────────────────────────────────────────────────
function DataQualityStrip({ dossier }: { dossier: CountryDossier }) {
  const q = dossier.dataQuality;
  const items = [
    { label: "World Bank", ok: q.hasLiveWorldBankData },
    { label: "GDELT", ok: q.hasLiveGdeltSignals },
    { label: "OpenAlex", ok: q.hasOpenAlexSources },
    { label: "Local tracking", ok: q.hasLocalTrackingData },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(({ label, ok }) => (
        <span key={label} className={`text-[8px] px-1.5 py-0.5 rounded border ${ok ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-gray-800 text-gray-600"}`}>
          {ok ? "✓" : "–"} {label}
        </span>
      ))}
      <span className={`ml-auto text-[8px] px-1.5 py-0.5 rounded border ${dossier.confidence === "high" ? "border-blue-500/20 bg-blue-500/5 text-blue-300" : dossier.confidence === "medium" ? "border-amber-500/20 bg-amber-500/5 text-amber-300" : "border-gray-700 text-gray-500"}`}>
        {dossier.confidence.toUpperCase()} CONFIDENCE
      </span>
      <span className="text-[8px] text-gray-600">
        Generated {new Date(dossier.generatedAt).toLocaleTimeString()}
      </span>
    </div>
  );
}

function CountryRefList({ title, items, tone }: { title: string; items: CountryDossier["operationalBrief"]["allies"]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">{title}</div>
      <div className="space-y-1">
        {items.slice(0, 3).map((item) => (
          <div key={`${title}-${item.country}`} className="bg-black/20 border border-white/6 rounded px-2 py-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold ${tone}`}>{item.country}</span>
              <span className="ml-auto text-[8px] text-gray-500 font-mono">{item.score}</span>
            </div>
            <p className="text-[9px] text-gray-500 truncate">{item.nextMove}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DossierCard({ country, agenda, blocEntry, intel, contextOptions, compact = false }: Props) {
  const [expanded, setExpanded] = useState(!compact);
  const entryFingerprint = JSON.stringify(blocEntry ? {
    stance: blocEntry.stance, supportLevel: blocEntry.supportLevel, riskLevel: blocEntry.riskLevel,
    contactStatus: blocEntry.contactStatus, bloc: blocEntry.bloc, notes: blocEntry.notes, updatedAt: blocEntry.updatedAt,
  } : null);
  const intelFingerprint = JSON.stringify(intel ? {
    ideology: intel.ideology, strategicInterests: intel.strategicInterests, allies: intel.allies,
    rivals: intel.rivals, dependencies: intel.dependencies, regionalConcerns: intel.regionalConcerns,
    votingTendencies: intel.votingTendencies, diplomacyNotes: intel.diplomacyNotes,
    riskLevel: intel.riskLevel, supportLevel: intel.supportLevel,
  } : null);
  const contextFingerprint = JSON.stringify(contextOptions ?? {});

  const resource = useApiResource<CountryDossier>(
    () => buildCountryDossier(country, agenda, blocEntry, intel, contextOptions),
    [country, agenda, entryFingerprint, intelFingerprint, contextFingerprint]
  );

  if (!country || !agenda) {
    return (
      <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 text-[11px] text-gray-600">
        Select a country and set an agenda to generate an intelligence dossier.
      </div>
    );
  }

  if (resource.status === "loading" && !resource.data) {
    return (
      <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 space-y-2 animate-pulse">
        <div className="h-2 w-32 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
        <div className="h-3 w-4/6 rounded bg-white/5" />
        <div className="text-[9px] text-gray-600 mt-2">Building intelligence dossier…</div>
      </div>
    );
  }

  if (resource.status === "error" && !resource.data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
        <div className="text-[10px] text-red-300 font-semibold uppercase tracking-wider">Intelligence unavailable</div>
        <p className="text-[10px] text-red-200/70">{resource.error || "Failed to build dossier."}</p>
        <button onClick={resource.refresh} className="text-[9px] px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10">
          Retry
        </button>
      </div>
    );
  }

  const dossier = resource.data;
  if (!dossier) return null;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/6 flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Intelligence Dossier</div>
          <div className="text-sm text-white font-semibold mt-0.5">
            {country}
            <span className="ml-2 text-[9px] text-gray-500 font-normal">
              {dossier.agendaTopic.replace(/-/g, " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resource.refresh} className="text-[9px] px-1.5 py-1 rounded border border-white/8 text-gray-500 hover:text-white" title="Refresh">↻</button>
          {compact && (
            <button onClick={() => setExpanded(!expanded)} className="text-[9px] px-2 py-1 rounded border border-white/8 text-gray-400 hover:text-white">
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Data quality strip */}
        <DataQualityStrip dossier={dossier} />

        {/* Operational brief */}
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-[0.2em]">Operational Brief</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400 capitalize">{dossier.operationalBrief.relationshipRole}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-300">Sponsor {dossier.operationalBrief.sponsorProbability}%</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded border border-red-500/20 text-red-300">Oppose {dossier.operationalBrief.oppositionProbability}%</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded border border-amber-500/20 text-amber-300">Bluff {dossier.operationalBrief.bluffRisk}%</span>
            <span className="ml-auto text-[8px] text-gray-500">{dossier.operationalBrief.confidence} confidence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-black/20 border border-white/6 rounded p-2">
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">What To Say</div>
              <p className="text-[10px] text-cyan-100 leading-relaxed">{dossier.operationalBrief.whatToSay}</p>
            </div>
            <div className="bg-black/20 border border-white/6 rounded p-2">
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">What To Avoid</div>
              <p className="text-[10px] text-red-200 leading-relaxed">{dossier.operationalBrief.whatToAvoid}</p>
            </div>
            <div className="bg-black/20 border border-white/6 rounded p-2">
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Next Move</div>
              <p className="text-[10px] text-emerald-200 leading-relaxed">{dossier.operationalBrief.recommendedNextMove}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <CountryRefList title="Allies To Use" items={dossier.operationalBrief.allies} tone="text-emerald-300" />
            <CountryRefList title="Swing States" items={dossier.operationalBrief.swingStates} tone="text-amber-300" />
            <CountryRefList title="Avoid / Oppose" items={dossier.operationalBrief.likelyOpponents} tone="text-red-300" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Clause Compatibility</div>
              <div className="flex flex-wrap gap-1">
                {dossier.operationalBrief.clauseCompatibility.map((item) => (
                  <span key={item} className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{item}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Risk Warnings</div>
              <div className="space-y-1">
                {dossier.operationalBrief.riskWarnings.slice(0, 2).map((warning) => (
                  <p key={warning} className="text-[9px] text-amber-200 leading-relaxed">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Committee Dynamics */}
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Committee Temperature</div>
            <div className="text-sm font-semibold text-white capitalize">{dossier.committeeDynamics.temperature}</div>
          </div>
          <div className="flex-2 text-[10px] text-gray-400 leading-relaxed border-l border-indigo-500/20 pl-3">
            {dossier.committeeDynamics.temperatureRationale}
          </div>
        </div>

        {/* Overview — always visible */}
        <Section title="Strategic Overview" dot="bg-cyan-400">
          <EvidenceBlock item={dossier.overview} />
        </Section>

        {expanded && (
          <>
            {/* Key facts */}
            {dossier.keyFacts.length > 0 && (
              <Section title="Key Facts" dot="bg-blue-400">
                {dossier.keyFacts.map((item, i) => <EvidenceBlock key={i} item={item} />)}
              </Section>
            )}

            {/* Strategic inference + research */}
            {dossier.strategicInference.length > 0 && (
              <Section title="Geopolitical & Research Signals" dot="bg-violet-400">
                {dossier.strategicInference.map((item, i) => <EvidenceBlock key={i} item={item} />)}
              </Section>
            )}

            {/* Bloc behaviour */}
            {dossier.blocBehaviour.length > 0 && (
              <Section title="Bloc Behaviour" dot="bg-emerald-400">
                {dossier.blocBehaviour.map((item, i) => <EvidenceBlock key={i} item={item} />)}
              </Section>
            )}

            {/* Negotiation */}
            {dossier.negotiationStrategy.length > 0 && (
              <Section title="Negotiation Strategy" dot="bg-amber-400">
                {dossier.negotiationStrategy.map((item, i) => <EvidenceBlock key={i} item={item} />)}
              </Section>
            )}

            {/* Red lines */}
            {dossier.redLines.length > 0 && (
              <Section title="Red Lines" dot="bg-red-400">
                {dossier.redLines.map((item, i) => <EvidenceBlock key={i} item={item} />)}
              </Section>
            )}

            {/* Resolution preferences */}
            {dossier.resolutionPreferences.length > 0 && (
              <Section title="Resolution Preferences" dot="bg-teal-400">
                {dossier.resolutionPreferences.map((item, i) => <EvidenceBlock key={i} item={item} />)}
              </Section>
            )}

            {/* Leverage points — exploitable interests */}
            {dossier.leveragePoints.length > 0 && (
              <Section title="Exploitable Leverage" dot="bg-amber-400">
                {dossier.leveragePoints.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[7px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/20">{item.category}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-300 leading-relaxed">{item.signal}</p>
                      {item.sourceLabel && <p className="text-[9px] text-gray-600 mt-0.5">↳ {item.sourceLabel}</p>}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Pressure points — vulnerabilities */}
            {dossier.pressurePoints.length > 0 && (
              <Section title="Pressure Points" dot="bg-red-400">
                {dossier.pressurePoints.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <BasisTag basis={item.basis} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-300 leading-relaxed">{item.signal}</p>
                      {item.sourceLabel && <p className="text-[9px] text-gray-600 mt-0.5">↳ {item.sourceLabel}</p>}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Contradictions — exploitable discrepancies */}
            {dossier.contradictions.length > 0 && (
              <Section title="Contradictions (Exploitable)" dot="bg-rose-400">
                {dossier.contradictions.map((item, i) => (
                  <div key={i} className="bg-rose-500/[0.04] border border-rose-500/15 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <BasisTag basis={item.basis === "FACT" ? "FACT" : "CONTRADICTION"} />
                      <div>
                        <p className="text-[10px] text-rose-200 font-medium leading-relaxed">{item.tension}</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed mt-1"><span className="text-amber-400">▸</span> {item.opportunity}</p>
                      </div>
                    </div>
                    {item.sourceLabel && <p className="text-[9px] text-gray-600">↳ {item.sourceLabel}</p>}
                  </div>
                ))}
              </Section>
            )}

            {/* Game theory projections */}
            {dossier.gameTheory && (
              <div className="rounded-lg border border-violet-500/15 bg-violet-500/[0.03] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-[0.2em]">Committee Projections</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Projection label="Sponsor" value={dossier.gameTheory.sponsorLikelihood} />
                  <Projection label="Co-sponsor" value={dossier.gameTheory.coSponsorLikelihood} />
                  <Projection label="Abstain Risk" value={dossier.gameTheory.abstentionRisk} />
                  <Projection label="Amend Resist" value={dossier.gameTheory.amendmentResistance} />
                  <Projection label="Compromise" value={dossier.gameTheory.compromiseProbability} />
                  <Projection label="Fracture Risk" value={dossier.gameTheory.coalitionFractureRisk} />
                  <Projection label="Pressure Vuln." value={dossier.gameTheory.pressureVulnerability} />
                </div>
                {dossier.gameTheory.rationale.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dossier.gameTheory.rationale.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <BasisTag basis={item.basis} />
                        <p className="text-[10px] text-gray-400">{item.claim}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sponsor assessment */}
            {dossier.sponsorAssessment && (
              <div className="rounded-lg border border-blue-500/15 bg-blue-500/[0.03] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em]">Sponsor Assessment</span>
                  <span className={`ml-auto text-[8px] px-1.5 py-0.5 rounded border ${dossier.sponsorAssessment.confidence === "high" ? "border-emerald-500/20 text-emerald-300" : dossier.sponsorAssessment.confidence === "medium" ? "border-amber-500/20 text-amber-300" : "border-gray-600 text-gray-500"}`}>
                    {dossier.sponsorAssessment.confidence} confidence
                  </span>
                </div>
                <div className="text-[13px] text-white font-medium mb-2">
                  {dossier.sponsorAssessment.role === "sponsor" ? "Can sponsor" :
                   dossier.sponsorAssessment.role === "co-sponsor" ? "Likely co-sponsor" :
                   dossier.sponsorAssessment.role === "swing" ? "Swing — needs persuasion" :
                   dossier.sponsorAssessment.role === "supporter" ? "Will support if convinced" :
                   dossier.sponsorAssessment.role === "abstain" ? "Likely to abstain" :
                   "Expected to block"}
                </div>
                {dossier.sponsorAssessment.conditions.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Conditions</div>
                    {dossier.sponsorAssessment.conditions.map((c, i) => (
                      <p key={i} className="text-[10px] text-gray-300 flex items-start gap-1.5">
                        <span className="text-blue-400">▸</span>{c}
                      </p>
                    ))}
                  </div>
                )}
                {dossier.sponsorAssessment.basis.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 mt-1">
                    <BasisTag basis={item.basis} />
                    <p className="text-[10px] text-gray-400">{item.claim}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Recommended action — always visible */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BasisTag basis="RECOMMENDATION" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Recommended Next Action</span>
          </div>
          <p className="text-[11px] text-emerald-200 leading-relaxed">{dossier.recommendedAction.claim}</p>
        </div>
      </div>
    </div>
  );
}

function Projection({ label, value }: { label: string; value: "low" | "medium" | "high" }) {
  const style = value === "high" ? "text-emerald-300" : value === "medium" ? "text-amber-300" : "text-gray-500";
  return (
    <div className="bg-white/[0.02] rounded-lg px-2 py-1.5">
      <div className="text-[8px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold ${style}`}>{value}</div>
    </div>
  );
}
