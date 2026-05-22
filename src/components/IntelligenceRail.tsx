import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import StrategicAlerts from "./StrategicAlerts";
import BlocStability from "./BlocStability";
import { getFlag } from "../lib/countries";
import { buildProcedureModel } from "../lib/procedureRules";
import { buildSessionContext } from "../lib/strategic-context";

export default function IntelligenceRail() {
  const { activeCommittee, liveMode, viewMode } = useApp();
  const navigate = useNavigate();

  const summary = useMemo(() => {
    if (!activeCommittee) return null;
    const entries = activeCommittee.blocEntries;
    const allies = entries.filter((e) => e.stance === "ally");
    const opponents = entries.filter((e) => e.stance === "opponent");
    const swings = entries.filter((e) => e.stance === "swing");
    const avgRisk = entries.length ? Math.round(entries.reduce((s, e) => s + e.riskLevel, 0) / entries.length) : 0;
    const topSwing = swings.sort((a, b) => b.supportLevel - a.supportLevel)[0];
    const topRisk = [...allies].sort((a, b) => b.riskLevel - a.riskLevel)[0];
    const objective = activeCommittee.contextPack.next_action_needed || activeCommittee.contextPack.active_goal || "Set next objective";
    return {
      allies: allies.length,
      opponents: opponents.length,
      swings: swings.length,
      avgRisk,
      topSwing,
      topRisk,
      objective,
    };
  }, [activeCommittee]);
  const strategic = useMemo(() => activeCommittee ? buildSessionContext(activeCommittee) : null, [activeCommittee]);

  if (!activeCommittee || !summary || !strategic) return null;

  const threatLabel = summary.avgRisk >= 60 ? "High" : summary.avgRisk >= 35 ? "Moderate" : "Controlled";
  const threatClass = summary.avgRisk >= 60 ? "text-red-300 bg-red-500/10 border-red-500/20" : summary.avgRisk >= 35 ? "text-amber-300 bg-amber-500/10 border-amber-500/20" : "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
  const paper = activeCommittee.positionPaper;
  const procedure = buildProcedureModel(activeCommittee.contextPack, activeCommittee.blocEntries, activeCommittee.clauses);

  return (
    <aside className="h-full w-[320px] flex-shrink-0 border-l border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-xl">
      <div className="h-full overflow-y-auto px-3 py-3 space-y-3">
        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-tactical p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Intelligence Rail</div>
              <div className="mt-1 text-sm font-semibold text-white leading-tight">{activeCommittee.contextPack.committee}</div>
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                <span className="text-base leading-none">{getFlag(activeCommittee.contextPack.country)}</span>
                <span>{activeCommittee.contextPack.country}</span>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-xl border text-[9px] font-semibold uppercase tracking-[0.18em] ${threatClass}`}>
              {threatLabel}
            </div>
          </div>
        </div>

        {/* Objective */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-tactical p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Current Objective</div>
          <div className="mt-2 text-sm text-white leading-relaxed">{summary.objective}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => navigate("/live")} className={`flex-1 px-2 py-1.5 rounded-xl text-[10px] font-medium border transition-all ${liveMode ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.07]"}`}>
              {liveMode ? "● Live Active" : "Enter Live Mode"}
            </button>
            <button onClick={() => navigate("/memory")} className="px-2 py-1.5 rounded-xl text-[10px] font-medium border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.07] transition-all">
              Open Memory
            </button>
          </div>
        </div>

        {(paper.corePosition || paper.nonNegotiables.length > 0 || paper.keyPolicies.length > 0) && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-tactical p-3">
            <div className="text-[10px] text-amber-300 uppercase tracking-[0.22em] font-semibold">Position Paper</div>
            {paper.corePosition && <p className="mt-2 text-[11px] text-gray-300 leading-relaxed">{paper.corePosition}</p>}
            {paper.keyPolicies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {paper.keyPolicies.slice(0, 3).map((p) => (
                  <span key={p} className="text-[8px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded">{p}</span>
                ))}
              </div>
            )}
            {paper.nonNegotiables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {paper.nonNegotiables.slice(0, 4).map((r) => (
                  <span key={r} className="text-[8px] bg-red-500/10 text-red-300 border border-red-500/20 px-1.5 py-0.5 rounded">🚫 {r}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Strategic Summary */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-tactical p-3 space-y-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Strategic Summary</div>
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric label="Allies" value={summary.allies} color="emerald" />
            <MiniMetric label="Swing" value={summary.swings} color="amber" />
            <MiniMetric label="Opp." value={summary.opponents} color="red" />
          </div>
          {(summary.topSwing || summary.topRisk) && (
            <div className="space-y-2">
              {summary.topSwing && (
                <button onClick={() => navigate("/negotiation-workspace")} className="w-full text-left rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 hover:bg-amber-500/10 transition-colors">
                  <div className="text-[9px] text-amber-300 uppercase tracking-[0.18em] font-semibold">Best swing target</div>
                  <div className="mt-1 text-sm text-white">{summary.topSwing.country}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Support {summary.topSwing.supportLevel}% · Risk {summary.topSwing.riskLevel}%</div>
                </button>
              )}
              {summary.topRisk && (
                <button onClick={() => navigate("/bloc-tracker")} className="w-full text-left rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 hover:bg-red-500/10 transition-colors">
                  <div className="text-[9px] text-red-300 uppercase tracking-[0.18em] font-semibold">Watchlist ally</div>
                  <div className="mt-1 text-sm text-white">{summary.topRisk.country}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Risk {summary.topRisk.riskLevel}% · Support {summary.topRisk.supportLevel}%</div>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.035] shadow-tactical p-3">
          <div className="text-[10px] text-cyan-300 uppercase tracking-[0.22em] font-semibold">Procedure Lens</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniMetric label="Quorum" value={procedure.quorumNeeded} color={procedure.quorumMet ? "emerald" : "amber"} />
            <MiniMetric label="2/3" value={procedure.formalPaperworkVotesNeeded} color="amber" />
          </div>
          <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em] font-semibold">Next Motion</div>
            <div className="mt-1 text-xs text-white">{procedure.recommendedFormat.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{procedure.recommendedFormat.tacticalUse}</div>
          </div>
        </div>

        <BlocStability />

        <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.035] shadow-tactical p-3">
          <div className="text-[10px] text-blue-300 uppercase tracking-[0.22em] font-semibold">Strategic Intel Panel</div>
          <div className="mt-2 text-xs text-white leading-relaxed">{strategic.nextBestMove}</div>
          <div className="mt-2 grid grid-cols-[1fr_90px] gap-2">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/6 px-2 py-2">
              <div className="text-[8px] uppercase tracking-[0.18em] text-emerald-300">Mode</div>
              <div className="mt-1 text-[10px] text-white capitalize">{strategic.mode.replace(/_/g, " ")}</div>
            </div>
            <MiniMetric label="Signals" value={strategic.memorySignals.length} color="amber" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.035] shadow-tactical p-3">
          <div className="text-[10px] text-amber-300 uppercase tracking-[0.22em] font-semibold">Swing State Radar</div>
          <div className="mt-2 space-y-1.5">
            {strategic.relationshipGraph.filter((card) => card.sponsorProbability >= 40 && card.oppositionProbability < 60).slice(0, 3).map((card) => (
              <button key={card.country} onClick={() => navigate("/negotiation-workspace")} className="w-full text-left rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06]">
                <div className="text-xs text-white">{card.country}</div>
                <div className="text-[10px] text-gray-400">Sponsor {card.sponsorProbability}% · Bluff {card.bluffRisk}%</div>
              </button>
            ))}
            {strategic.relationshipGraph.length === 0 && <div className="text-[10px] text-gray-500">Add countries to the relationship map to activate radar.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.035] shadow-tactical p-3">
          <div className="text-[10px] text-violet-300 uppercase tracking-[0.22em] font-semibold">Chair Mood Tracker</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniMetric label="Strict" value={strategic.chairProfile.strictness} color={strategic.chairProfile.strictness > 65 ? "red" : "amber"} />
            <MiniMetric label="Motions" value={strategic.chairProfile.motionOpenness} color="emerald" />
          </div>
          <div className="mt-2 text-[10px] text-gray-400 leading-relaxed">{strategic.chairProfile.recommendation}</div>
        </div>

        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] shadow-tactical p-3">
          <div className="text-[10px] text-red-300 uppercase tracking-[0.22em] font-semibold">Amendment Risk</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniMetric label="Pressure" value={strategic.resolutionEvolution.amendmentPressure} color={strategic.resolutionEvolution.amendmentPressure > 55 ? "red" : "amber"} />
            <MiniMetric label="Clauses" value={strategic.resolutionEvolution.activeClauseCount} color="emerald" />
          </div>
          <div className="mt-2 text-[10px] text-gray-400 leading-relaxed">{strategic.resolutionEvolution.draftingAdvice}</div>
        </div>

        <StrategicAlerts />

        {/* Recommendations */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-tactical p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-2">Recommended Moves</div>
          <div className="space-y-1.5">
            <ActionChip label="Draft speech" onClick={() => navigate("/speech-builder")} />
            <ActionChip label="Open negotiations" onClick={() => navigate("/negotiation-workspace")} />
            <ActionChip label="Run vote simulation" onClick={() => navigate("/voting-room")} />
            <ActionChip label="Review map" onClick={() => navigate("/bloc-tracker")} />
          </div>
        </div>

        {/* View mode badge */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-tactical p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Active View Mode</div>
          <div className="mt-2 text-sm text-white capitalize">{viewMode}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Layout priorities adjusted for this workflow.</div>
        </div>
      </div>
    </aside>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: number; color: "emerald" | "amber" | "red" }) {
  const classes = {
    emerald: "text-emerald-300 bg-emerald-500/6 border-emerald-500/15",
    amber: "text-amber-300 bg-amber-500/6 border-amber-500/15",
    red: "text-red-300 bg-red-500/6 border-red-500/15",
  }[color];
  return (
    <div className={`rounded-xl border px-2 py-2 text-center ${classes}`}>
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="text-[8px] uppercase tracking-[0.18em] mt-1 opacity-80">{label}</div>
    </div>
  );
}

function ActionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-xl border border-white/8 bg-white/[0.03] text-[11px] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all">
      {label}
    </button>
  );
}
