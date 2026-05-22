import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { simulateClauseImpact } from "../../lib/clauseImpact";
import { checkStance } from "../../lib/stance";
import StanceWarning from "../../components/StanceWarning";
import ExternalAIBridge from "../../components/ExternalAIBridge";
import { buildProcedureModel, estimateScrappingRisk } from "../../lib/procedureRules";

export default function ClauseImpactSimulation() {
  const { activeCommittee, addAlert } = useApp();
  const [text, setText] = useState("");
  const [comparison, setComparison] = useState<string | null>(null);

  const ctxPack = activeCommittee?.contextPack;
  const blocEntries = activeCommittee?.blocEntries || [];

  const impact = useMemo(() => ctxPack && text.trim() ? simulateClauseImpact(text, ctxPack, blocEntries) : null, [text, ctxPack, blocEntries]);
  const compareImpact = useMemo(() => ctxPack && comparison?.trim() ? simulateClauseImpact(comparison, ctxPack, blocEntries) : null, [comparison, ctxPack, blocEntries]);
  const stanceWarnings = useMemo(() => ctxPack && text.trim() ? checkStance(text, ctxPack.country) : [], [text, ctxPack]);
  const procedure = useMemo(() => ctxPack ? buildProcedureModel(ctxPack, blocEntries, activeCommittee?.clauses || []) : null, [ctxPack, blocEntries, activeCommittee?.clauses]);
  const scrappingRisk = useMemo(() => estimateScrappingRisk(activeCommittee?.clauses || []), [activeCommittee?.clauses]);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;
  const ctx = activeCommittee.contextPack;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Resolution Impact Simulation</h1>
        <p className="text-[11px] text-gray-500">Heuristic prediction of how a clause will land — countries gained/lost, amendment risk, vote confidence.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5 space-y-2">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-rose-400" /> Original Clause
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
            placeholder="Paste or type the clause to analyze…"
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none font-mono" />
          <button onClick={() => setComparison(comparison === null ? text : null)}
            className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/40">
            {comparison === null ? "+ Compare with revision" : "− Hide comparison"}
          </button>
        </div>

        {comparison !== null && (
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5 space-y-2">
            <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-400" /> Revised Clause
            </div>
            <textarea value={comparison} onChange={(e) => setComparison(e.target.value)} rows={5}
              placeholder="Paste a revised version…"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none font-mono" />
          </div>
        )}
      </div>

      {/* Stance warnings */}
      {stanceWarnings.length > 0 && (
        <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-3.5">
          <div className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider mb-2">Policy Consistency Check</div>
          <StanceWarning warnings={stanceWarnings} />
        </div>
      )}

      {procedure && (
        <div className="bg-gray-900 border border-cyan-500/20 rounded-lg p-3.5">
          <div className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider mb-2">Procedure-Aware Draft Risk</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-white/[0.03] rounded-md border border-white/6 p-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Passage Target</div>
              <div className="text-lg font-bold text-blue-300 mt-1">{procedure.formalPaperworkVotesNeeded}</div>
              <p className="text-[10px] text-gray-500">Formal paperwork requires two-thirds.</p>
            </div>
            <div className="bg-white/[0.03] rounded-md border border-white/6 p-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Amendment Trap</div>
              <div className={`text-lg font-bold mt-1 ${scrappingRisk.risk === "high" ? "text-red-300" : scrappingRisk.risk === "medium" ? "text-amber-300" : "text-emerald-300"}`}>
                {scrappingRisk.risk.toUpperCase()}
              </div>
              <p className="text-[10px] text-gray-500">{scrappingRisk.explanation}</p>
            </div>
            <div className="bg-white/[0.03] rounded-md border border-white/6 p-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Defense Format</div>
              <div className="text-sm font-bold text-cyan-200 mt-1">{procedure.recommendedFormat.label}</div>
              <p className="text-[10px] text-gray-500">{procedure.recommendedFormat.tacticalUse}</p>
            </div>
          </div>
        </div>
      )}

      {/* Impact display */}
      {impact ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ImpactCard title="Original Impact" impact={impact} />
          {compareImpact && <ImpactCard title="Revised Impact" impact={compareImpact} compare={impact} />}
        </div>
      ) : (
        <div className="bg-gray-900/40 border border-gray-800/30 rounded-lg p-8 text-center">
          <div className="text-3xl mb-2 opacity-40">📊</div>
          <p className="text-gray-600 text-xs">Enter a clause to see impact analysis.</p>
        </div>
      )}

      {/* AI Bridge */}
      {text.trim() && (
        <ExternalAIBridge
          prompt={`Refine this resolution clause to maximize bloc support and minimize amendment risk. Original clause:\n\n"${text}"\n\nMy current vote confidence is ${impact?.voteConfidence}% with ${impact?.amendmentRisk}% amendment risk.`}
          context={ctx} suggestedModel="Claude" />
      )}

      {impact && (
        <button onClick={() => addAlert({ severity: impact.voteConfidence < 40 ? "warning" : "info", title: `Clause analyzed: ${impact.voteConfidence}% confidence`, description: `Amendment risk: ${impact.amendmentRisk}%. ${impact.blocReaction}` })}
          className="text-[10px] px-3 py-1.5 rounded bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30">
          📋 Log this analysis as alert
        </button>
      )}
    </div>
  );
}

function ImpactCard({ title, impact, compare }: { title: string; impact: any; compare?: any }) {
  const diff = (a: number, b?: number) => {
    if (b === undefined) return null;
    const d = a - b;
    if (d === 0) return null;
    return <span className={`text-[9px] ml-1 ${d > 0 ? "text-emerald-400" : "text-red-400"}`}>{d > 0 ? "+" : ""}{d}</span>;
  };

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5 space-y-3">
      <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Vote Confidence" value={`${impact.voteConfidence}%`} color={impact.voteConfidence >= 60 ? "emerald" : impact.voteConfidence >= 40 ? "amber" : "red"} extra={diff(impact.voteConfidence, compare?.voteConfidence)} />
        <Stat label="Amendment Risk" value={`${impact.amendmentRisk}%`} color={impact.amendmentRisk <= 30 ? "emerald" : impact.amendmentRisk <= 60 ? "amber" : "red"} extra={diff(impact.amendmentRisk, compare?.amendmentRisk)} />
        <Stat label="Sponsor Probability" value={`${impact.sponsorProbability}%`} color={impact.sponsorProbability >= 60 ? "emerald" : "amber"} extra={diff(impact.sponsorProbability, compare?.sponsorProbability)} />
        <Stat label="Tone Risk" value={`${impact.diplomaticToneRisk}%`} color={impact.diplomaticToneRisk <= 30 ? "emerald" : impact.diplomaticToneRisk <= 60 ? "amber" : "red"} extra={diff(impact.diplomaticToneRisk, compare?.diplomaticToneRisk)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/40 rounded-md p-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Countries Gained</div>
          <div className="text-lg font-bold text-emerald-300">+{impact.countriesGained}</div>
        </div>
        <div className="bg-gray-800/40 rounded-md p-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Countries Lost</div>
          <div className="text-lg font-bold text-red-300">−{impact.countriesLost}</div>
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-md p-2">
        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Bloc Reaction</div>
        <div className="text-xs text-gray-300 mt-0.5">{impact.blocReaction}</div>
      </div>

      <div className="bg-gray-800/40 rounded-md p-2">
        <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Likely Objections</div>
        <ul className="text-[11px] text-gray-300 space-y-0.5">
          {impact.likelyObjections.map((o: string, i: number) => <li key={i} className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">▸</span>{o}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, color, extra }: { label: string; value: string; color: string; extra?: any }) {
  const c = { emerald: "text-emerald-300", amber: "text-amber-300", red: "text-red-300" }[color];
  return (
    <div className="bg-gray-800/40 rounded-md p-2">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold ${c}`}>{value}{extra}</div>
    </div>
  );
}
