import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { executeAgentAsync } from "../../agents";
import { generateId } from "../../lib/storage";
import type { Speech } from "../../types";
import ExternalAIBridge from "../../components/ExternalAIBridge";
import StanceWarning from "../../components/StanceWarning";
import { checkStance } from "../../lib/stance";

const TYPES: { value: Speech["type"]; label: string }[] = [
  { value: "opening", label: "Opening" }, { value: "moderated", label: "Moderated" },
  { value: "rebuttal", label: "Rebuttal" }, { value: "closing", label: "Closing" },
];
const TONES = ["Formal & Diplomatic", "Assertive & Sharp", "Conciliatory", "Passionate", "Technical"];

export default function SpeechBuilder() {
  const { activeCommittee, addSpeech } = useApp();
  const [speechType, setSpeechType] = useState<Speech["type"]>("opening");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("60");
  const [tone, setTone] = useState("Formal & Diplomatic");
  const [output, setOutput] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const stanceWarnings = useMemo(() => activeCommittee && (output || topic) ? checkStance(`${topic} ${output}`, activeCommittee.contextPack.country) : [], [output, topic, activeCommittee]);

  if (!activeCommittee) return <div className="flex items-center justify-center h-full"><p className="text-gray-500 text-sm">Select or create a committee first.</p></div>;
  const ctx = activeCommittee.contextPack;

  const gen = async (task: string, extra?: string) => {
    setBusy(true);
    const res = await executeAgentAsync("SpeechForge", { task, context: ctx, extra: extra || tone });
    setOutput(res.answer);
    setBusy(false);
  };

  const handleSave = async () => {
    if (!output.trim()) return;
    await addSpeech({ id: generateId(), type: speechType, topic: topic || speechType, content: output, createdAt: Date.now() });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Speech Builder</h1>
        <p className="text-[11px] text-gray-500">Generate committee-ready speeches with stance-checked output.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5 space-y-2.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-amber-400" />Config</h2>
            <div className="grid grid-cols-4 gap-1">
              {TYPES.map((t) => (
                <button key={t.value} onClick={() => setSpeechType(t.value)} className={`text-[10px] py-1.5 rounded-md border transition-all ${speechType === t.value ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-medium" : "bg-gray-800/30 border-gray-800/30 text-gray-500 hover:border-gray-700"}`}>{t.label}</button>
              ))}
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Topic</label>
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Climate finance mechanisms" className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Duration</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                  <option value="30">30s</option><option value="45">45s</option><option value="60">60s</option><option value="90">90s</option><option value="120">2min</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                  {TONES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => gen(`Write a ${duration}-second ${speechType} speech${topic ? ` on: ${topic}` : ""}`)} disabled={busy} className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-md transition-colors">{busy ? "Generating..." : "🎤 Generate"}</button>
          </div>

          {stanceWarnings.length > 0 && (
            <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-2.5">
              <div className="text-[9px] font-semibold text-amber-300 uppercase tracking-wider mb-1.5">Stance Check</div>
              <StanceWarning warnings={stanceWarnings} compact />
            </div>
          )}

          {activeCommittee.speeches.length > 0 && (
            <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
              <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Saved ({activeCommittee.speeches.length})</h2>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {activeCommittee.speeches.map((s) => (
                  <button key={s.id} onClick={() => { setOutput(s.content); setSpeechType(s.type); setTopic(s.topic); }} className="w-full text-left p-1.5 rounded-md bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800/30 text-[10px]">
                    <span className="text-blue-400 font-medium">{s.type}</span><span className="text-gray-500"> — {s.topic}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <ExternalAIBridge prompt={`Write a ${duration}-second ${speechType} speech${topic ? ` on: ${topic}` : ""}. Tone: ${tone}.`} context={ctx} suggestedModel="Claude" />
        </div>

        <div className="lg:col-span-3 bg-gray-900 border border-gray-800/60 rounded-lg p-3.5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400" />Output</h2>
            {output && (
              <div className="flex gap-1">
                <button onClick={() => gen(`Write a ${Math.max(30, parseInt(duration) - 15)}-second shorter ${speechType} speech${topic ? ` on: ${topic}` : ""}`, `${tone}, concise`)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">Shorter</button>
                <button onClick={() => gen(`Write a ${duration}-second stronger ${speechType} speech${topic ? ` on: ${topic}` : ""}`, "assertive, powerful")} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">Stronger</button>
                <button onClick={handleSave} className={`text-[9px] px-1.5 py-0.5 rounded border ${saved ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" : "bg-gray-800/50 text-gray-400 hover:text-gray-200 border-gray-800/30"}`}>{saved ? "✓ Saved" : "Save"}</button>
              </div>
            )}
          </div>
          <div className="flex-1 bg-gray-800/30 border border-gray-800/30 rounded-md p-3 overflow-y-auto min-h-[280px]">
            {output ? <pre className="text-[12px] text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre> : <div className="flex items-center justify-center h-full text-gray-600 text-xs">Configure and generate →</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
