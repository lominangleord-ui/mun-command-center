import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { executeAgentAsync } from "../../agents";
import ExternalAIBridge from "../../components/ExternalAIBridge";
import { getFlag } from "../../lib/countries";
import { buildProcedureModel } from "../../lib/procedureRules";

export default function VotingRoom() {
  const { activeCommittee } = useApp();
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;
  const ctx = activeCommittee.contextPack;
  const entries = activeCommittee.blocEntries;
  const procedure = buildProcedureModel(ctx, entries, activeCommittee.clauses);

  const allies = entries.filter((e) => e.stance === "ally");
  const opponents = entries.filter((e) => e.stance === "opponent");
  const swings = entries.filter((e) => e.stance === "swing");

  // Bug 1 fix: use committeeSize from ContextPack, defaulting to 193 for UNGA
  const total = ctx.committeeSize ?? 193;
  const unknown = Math.max(0, total - entries.length);

  const aPct = Math.round((allies.length / total) * 100);
  const oPct = Math.round((opponents.length / total) * 100);
  const uPct = Math.round((unknown / total) * 100);

  const simpleMajority = procedure.simpleMajorityNeeded;
  const twoThirds = procedure.formalPaperworkVotesNeeded;
  const motionVotesNeeded = Math.max(0, simpleMajority - allies.length);
  const formalVotesNeeded = Math.max(0, twoThirds - allies.length);

  const analyze = async (task: string) => {
    setBusy(true);
    const res = await executeAgentAsync("VoteCalc", { task: task || "Predict overall vote outcome", context: ctx });
    setOutput(res.answer);
    setBusy(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Voting Room</h1>
        <p className="text-[11px] text-gray-500">Predict outcomes, assess clause risk, optimize wording.</p>
      </div>

      {/* Whip count targets */}
      <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.7),rgba(15,23,42,0.7))] backdrop-blur-xl shadow-tactical p-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-2">Handbook Vote Model ({total} delegations)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-xl border border-white/6 p-3">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em]">Proceedings</div>
            <div className="text-xl font-bold text-emerald-300 mt-1">{simpleMajority} <span className="text-xs text-gray-500 font-normal">votes needed</span></div>
            {motionVotesNeeded > 0
              ? <p className="text-[10px] text-amber-400 mt-1">Need {motionVotesNeeded} more for motions</p>
              : <p className="text-[10px] text-emerald-400 mt-1">Simple majority secured for motions</p>
            }
          </div>
          <div className="bg-white/[0.03] rounded-xl border border-white/6 p-3">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em]">Formal Paperwork</div>
            <div className="text-xl font-bold text-blue-300 mt-1">{twoThirds} <span className="text-xs text-gray-500 font-normal">votes needed</span></div>
            {formalVotesNeeded > 0
              ? <p className="text-[10px] text-amber-400 mt-1">Need {formalVotesNeeded} more for resolutions</p>
              : <p className="text-[10px] text-emerald-400 mt-1">Two-thirds threshold secured</p>
            }
          </div>
          <div className="bg-white/[0.03] rounded-xl border border-white/6 p-3">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em]">Quorum</div>
            <div className={`text-xl font-bold mt-1 ${procedure.quorumMet ? "text-emerald-300" : "text-amber-300"}`}>
              {procedure.knownDelegations}/{procedure.quorumNeeded}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">One tenth of committee strength; double delegations count once.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/6 bg-white/[0.02] p-2">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em] mb-1">Roll-Call Constraints</div>
            {procedure.votingNotes.slice(0, 3).map((note) => (
              <p key={note} className="text-[10px] text-gray-400">{note}</p>
            ))}
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] p-2">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em] mb-1">Abstention Model</div>
            <p className="text-[10px] text-gray-400">Present and voting delegations cannot abstain on final paperwork.</p>
            <p className="text-[10px] text-gray-400">Votes with rights are policy-risk signals, not extra vote categories.</p>
          </div>
        </div>
      </div>

      {/* Overall support */}
      <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.7),rgba(15,23,42,0.7))] backdrop-blur-xl shadow-tactical p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-cyan-400" /> Estimated Support
          </div>
          <div className="text-2xl font-bold text-cyan-300 tabular-nums">{aPct + Math.round(uPct / 3)}%</div>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-black/40 mb-2">
          <div className="bg-emerald-500/90 transition-all duration-700" style={{ width: `${aPct}%` }} title={`Allies ${aPct}%`} />
          <div className="bg-amber-500/80 transition-all duration-700" style={{ width: `${uPct}%` }} title={`Unknown ${uPct}%`} />
          <div className="bg-red-500/90 transition-all duration-700" style={{ width: `${oPct}%` }} title={`Opponents ${oPct}%`} />
        </div>
        <div className="flex flex-wrap gap-3 text-[10px]">
          <Legend color="bg-emerald-500/90" label={`Allies ${aPct}% (${allies.length})`} />
          <Legend color="bg-amber-500/80" label={`Unknown ${uPct}% (${unknown})`} />
          <Legend color="bg-red-500/90" label={`Opposition ${oPct}% (${opponents.length})`} />
        </div>
      </div>

      {/* Whip lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <WhipList label="With Us" color="emerald" items={allies.map((e) => ({ name: e.country, flag: getFlag(e.country), support: e.supportLevel }))} />
        <WhipList label="Unknown / Swing" color="amber" items={[
          ...swings.map((e) => ({ name: e.country, flag: getFlag(e.country), support: e.supportLevel })),
          ...Array.from({ length: Math.max(0, unknown - swings.length) }, (_, i) => ({ name: `Unassigned ${i + 1}`, flag: "🏳️", support: 0 })),
        ]} />
        <WhipList label="Against" color="red" items={opponents.map((e) => ({ name: e.country, flag: getFlag(e.country), support: e.supportLevel }))} />
      </div>

      {/* Analysis */}
      <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.7),rgba(15,23,42,0.7))] backdrop-blur-xl shadow-tactical p-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-2 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-blue-400" /> Vote Analysis
        </div>
        <div className="flex gap-2 mb-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze(query)}
            placeholder="Ask about vote predictions, passage probability…"
            className="flex-1 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
          <button onClick={() => analyze(query)} disabled={busy} className="px-4 py-2 bg-[linear-gradient(135deg,#3654FF,#4B6CFF)] hover:brightness-110 disabled:bg-gray-800 text-white text-xs font-medium rounded-xl shadow-[0_8px_24px_rgba(54,84,255,0.22)]">{busy ? "..." : "Analyze"}</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {["Predict overall vote outcome", "Which clauses are most at risk?", "What wording improves passage?", "Identify deal-breakers"].map((q) => (
            <button key={q} onClick={() => { setQuery(q); analyze(q); }} className="text-[10px] px-2 py-0.5 rounded-xl bg-white/[0.03] text-gray-500 hover:text-gray-300 border border-white/6">{q}</button>
          ))}
        </div>
        {output && <pre className="mt-3 bg-black/30 border border-white/6 rounded-xl p-3 text-[12px] text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">{output}</pre>}
      </div>

      <ExternalAIBridge prompt={`Run a comprehensive whip count for the current resolution. Total: ${total} states. Formal paperwork requires ${twoThirds} yes votes under the conference handbook; committee motions require ${simpleMajority}. Allies: ${ctx.allies.join(", ") || "none"}. Opponents: ${ctx.opponents.join(", ") || "none"}. Present-and-voting delegations cannot abstain. Predict the vote and suggest 3 lobbying targets.`} context={ctx} suggestedModel="ChatGPT" />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${color}`} /><span className="text-gray-400">{label}</span></span>;
}

function WhipList({ label, color, items }: { label: string; color: "emerald" | "amber" | "red"; items: Array<{ name: string; flag: string; support: number }> }) {
  const styles: Record<string, string> = {
    emerald: "border-emerald-500/15 bg-emerald-500/5",
    amber: "border-amber-500/15 bg-amber-500/5",
    red: "border-red-500/15 bg-red-500/5",
  };
  const textStyles: Record<string, string> = { emerald: "text-emerald-300", amber: "text-amber-300", red: "text-red-300" };
  return (
    <div className={`rounded-2xl border p-3 ${styles[color]}`}>
      <div className={`text-[9px] uppercase tracking-[0.18em] font-semibold mb-2 ${textStyles[color]}`}>{label} ({items.length})</div>
      {items.length === 0 ? (
        <div className="text-[10px] text-gray-600 italic">—</div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {items.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] bg-white/[0.02] px-1.5 py-1 rounded-lg">
              <span className="text-sm leading-none">{c.flag}</span>
              <span className="text-gray-300 flex-1 truncate">{c.name}</span>
              {c.support > 0 && <span className="text-[9px] text-gray-500 font-mono">{c.support}%</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
