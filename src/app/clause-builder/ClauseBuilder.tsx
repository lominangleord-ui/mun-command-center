import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { executeAgentAsync } from "../../agents";
import { generateId } from "../../lib/storage";
import type { Clause } from "../../types";
import ExternalAIBridge from "../../components/ExternalAIBridge";
import StanceWarning from "../../components/StanceWarning";
import { checkStance, checkBlocAlignment } from "../../lib/stance";
import { simulateClauseImpact } from "../../lib/clauseImpact";
import { useNavigate } from "react-router-dom";
import LanguageCompatibilityEngine from "../../components/LanguageCompatibilityEngine";

const STATUSES: Clause["status"][] = ["draft", "proposed", "accepted", "amended", "rejected"];
const PRE = ["Recognizing", "Deeply concerned", "Acknowledging", "Recalling", "Reaffirming", "Noting with appreciation", "Guided by", "Bearing in mind"];
const OP = ["Calls upon", "Encourages", "Requests", "Urges", "Decides", "Recommends", "Endorses", "Invites", "Establishes"];

export default function ClauseBuilder() {
  const { activeCommittee, addClause, updateCommittee } = useApp();
  const [type, setType] = useState<Clause["type"]>("operative");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const stanceWarnings = useMemo(() => activeCommittee && text.trim() ? [...checkStance(text, activeCommittee.contextPack.country), ...checkBlocAlignment(text, activeCommittee.contextPack.allies)] : [], [text, activeCommittee]);
  const impact = useMemo(() => activeCommittee && text.trim() ? simulateClauseImpact(text, activeCommittee.contextPack, activeCommittee.blocEntries) : null, [text, activeCommittee]);

  if (!activeCommittee) return <div className="flex items-center justify-center h-full"><p className="text-gray-500 text-sm">Select or create a committee first.</p></div>;
  const ctx = activeCommittee.contextPack;

  const gen = async (task: string) => {
    setBusy(true);
    const res = await executeAgentAsync("ClauseSmith", { task, context: ctx });
    setOutput(res.answer);
    setBusy(false);
  };

  const handleSave = async () => {
    const t = text || output;
    if (!t.trim()) return;
    await addClause({ id: generateId(), type, text: t.trim(), status: "draft", amendments: [], createdAt: Date.now() });
    setText("");
  };

  const starters = type === "preambulatory" ? PRE : OP;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Clause Builder</h1>
          <p className="text-[11px] text-gray-500">Draft, refine, and track resolution clauses with live impact analysis.</p>
        </div>
        <button onClick={() => nav("/clause-impact")} className="text-[10px] px-3 py-1.5 rounded-md bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30">📊 Full Impact Sim →</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5 space-y-2.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400" />Draft</h2>
            <div className="flex gap-1">
              {(["preambulatory", "operative"] as const).map((t) => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 text-[10px] py-1.5 rounded-md border transition-all ${type === t ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-medium" : "bg-gray-800/30 border-gray-800/30 text-gray-500 hover:border-gray-700"}`}>
                  {t === "preambulatory" ? "Preamb." : "Operative"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-0.5">
              {starters.map((s) => (
                <button key={s} onClick={() => setText(s + " ")} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/40 text-gray-500 hover:text-gray-300 border border-gray-800/30">{s}</button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={type === "operative" ? "Calls upon all member states to…" : "Recognizing the urgent need for…"} rows={5}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none" />

            {/* Stance warnings */}
            {stanceWarnings.length > 0 && <StanceWarning warnings={stanceWarnings} compact />}

            <div className="flex gap-1 flex-wrap">
              <button onClick={() => gen(text ? `Draft a ${type} clause: ${text}` : `Draft ${type} clauses for ${ctx.agenda}`)} disabled={busy} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-md transition-colors min-w-[80px]">{busy ? "..." : "Generate"}</button>
              <button onClick={() => gen(`Simplify: ${text}`)} className="text-[10px] px-2 py-1.5 rounded-md bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">Simplify</button>
              <button onClick={() => gen(`Strengthen: ${text}`)} className="text-[10px] px-2 py-1.5 rounded-md bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">Strengthen</button>
              <button onClick={() => gen(`Make compromise: ${text}`)} className="text-[10px] px-2 py-1.5 rounded-md bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">Soften</button>
            </div>
            <button onClick={handleSave} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors">+ Save Clause</button>
          </div>

          {/* Live impact */}
          {impact && (
            <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
              <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <div className="w-1 h-1 rounded-full bg-cyan-400" /> Live Impact Preview
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Vote" value={`${impact.voteConfidence}%`} color={impact.voteConfidence >= 60 ? "emerald" : impact.voteConfidence >= 40 ? "amber" : "red"} />
                <Stat label="Amend" value={`${impact.amendmentRisk}%`} color={impact.amendmentRisk <= 30 ? "emerald" : impact.amendmentRisk <= 60 ? "amber" : "red"} />
                <Stat label="Sponsor" value={`${impact.sponsorProbability}%`} color={impact.sponsorProbability >= 60 ? "emerald" : "amber"} />
                <Stat label="Tone" value={`${impact.diplomaticToneRisk}%`} color={impact.diplomaticToneRisk <= 30 ? "emerald" : impact.diplomaticToneRisk <= 60 ? "amber" : "red"} />
              </div>
              <div className="mt-2 text-[10px] text-gray-400">{impact.blocReaction}</div>
            </div>
          )}

          <LanguageCompatibilityEngine />

          <ExternalAIBridge prompt={text ? `Refine this ${type} clause:\n\n"${text}"` : `Draft ${type} clauses for ${ctx.agenda}`} context={ctx} suggestedModel="Claude" />
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400" />AI Output</h2>
            <div className="bg-gray-800/30 border border-gray-800/30 rounded-md p-3 max-h-72 overflow-y-auto">
              {output ? <pre className="text-[12px] text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre> : <p className="text-gray-600 text-xs">Generate clause suggestions →</p>}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400" />Tracker ({activeCommittee.clauses.length})</h2>
            {activeCommittee.clauses.length === 0 ? <p className="text-gray-600 text-xs py-2 text-center">No clauses saved.</p> : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {activeCommittee.clauses.map((c) => (
                  <div key={c.id} className="bg-gray-800/30 border border-gray-800/30 rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] px-1 py-0 rounded font-medium ${c.type === "operative" ? "bg-blue-500/15 text-blue-300" : "bg-purple-500/15 text-purple-300"}`}>{c.type}</span>
                        <select value={c.status} onChange={(e) => updateCommittee((cm) => ({ ...cm, clauses: cm.clauses.map((cl) => cl.id === c.id ? { ...cl, status: e.target.value as Clause["status"] } : cl) }))}
                          className="text-[9px] bg-gray-800 border border-gray-700/50 rounded px-1 py-0 text-gray-400">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button onClick={() => updateCommittee((cm) => ({ ...cm, clauses: cm.clauses.filter((cl) => cl.id !== c.id) }))} className="text-[9px] text-gray-600 hover:text-red-400">✕</button>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const c = ({ emerald: "text-emerald-300 border-emerald-500/30", amber: "text-amber-300 border-amber-500/30", red: "text-red-300 border-red-500/30" } as const)[color] || "text-gray-300 border-gray-700";
  return (
    <div className={`bg-gray-800/40 rounded-md p-1.5 border ${c}`}>
      <div className="text-[8px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold ${c.split(" ")[0]}`}>{value}</div>
    </div>
  );
}
