import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { contextToExportBlock, parseImportBlock } from "../../lib/contextPack";
import { buildExternalPrompt } from "../../lib/promptTemplates";
import { copyToClipboard, downloadAsFile, readFileAsText, exportCommitteeAsJSON, importCommitteeFromJSON, exportPOVPackage, importPOVPackage } from "../../lib/exportImport";
import { executeAgent } from "../../agents";
import { AGENT_META, type AgentName } from "../../types";
import type { StoredCommittee } from "../../types";
import { searchCountries } from "../../lib/countries";
import { buildExportableIntelligencePacket } from "../../api/services/exportIntelligenceService";
import { generateMarkdownBriefing } from "../../lib/services/synthesisService";

export default function ExportCenter() {
  const { activeCommittee, updateContextPack, updateCommittee, addTimelineEvent } = useApp();
  const [tab, setTab] = useState<"export" | "import" | "pov" | "external">("export");
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [extAgent, setExtAgent] = useState<AgentName>("SpeechForge");
  const [extTask, setExtTask] = useState("");
  const [extPrompt, setExtPrompt] = useState("");
  const [extResponse, setExtResponse] = useState("");
  const [mergeResult, setMergeResult] = useState<string | null>(null);
  
  // POV Export State
  const [povCountry, setPovCountry] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; flag: string }[]>([]);

  if (!activeCommittee) return <div className="flex items-center justify-center h-full"><p className="text-gray-500 text-sm">Select or create a committee first.</p></div>;
  const ctx = activeCommittee.contextPack;

  const cp = async (text: string, label: string) => { if (await copyToClipboard(text)) { setCopied(label); setTimeout(() => setCopied(null), 2000); } };

  const handleCountryInput = (v: string) => {
    setPovCountry(v);
    if (v.length >= 2) {
      setSuggestions(searchCountries(v).slice(0, 6).map(c => ({ name: c.name, flag: c.flag })));
    } else {
      setSuggestions([]);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;

    // Check if it's a munpack POV package
    const pov = importPOVPackage(importText);
    if (pov) {
      await updateCommittee((_) => pov);
      await addTimelineEvent({ type: "import", title: "Imported POV Package", description: `Loaded perspective from ${ctx.country}` });
      setImportResult("✓ Successfully imported POV scenario package.");
      return;
    }

    const jsonData = importCommitteeFromJSON(importText);
    if (jsonData) { 
      await updateCommittee((_) => jsonData);
      setImportResult("✓ Full committee backup restored."); 
      return; 
    }

    const p = parseImportBlock(importText);
    if (p.context) { 
      await updateContextPack({ ...ctx, ...p.context }); 
      setImportResult("✓ Context updated from block."); 
    } else { 
      const r = executeAgent("NoteScribe", { task: importText, context: ctx }); 
      setImportResult(`Processed text:\n${r.answer}`); 
    }
  };

  const handleMerge = async () => {
    if (!extResponse.trim()) return;
    const ans = executeAgent("SessionLead", { task: `Merge: ${extResponse}`, context: ctx }).answer;
    setMergeResult(ans);
    await updateCommittee((c: StoredCommittee) => ({ ...c, contextPack: { ...c.contextPack, latest_updates: [...c.contextPack.latest_updates, `External AI: ${extResponse.slice(0, 80)}…`] } }));
    await addTimelineEvent({ type: "action", title: "Merged AI Insights", description: "Updated context with external AI response" });
  };

  const handlePOVExport = async () => {
    if (!povCountry.trim()) return;
    const pkg = exportPOVPackage(activeCommittee, povCountry);
    downloadAsFile(pkg, `${povCountry.replace(/\s+/g, "_")}_POV_Package.munpack.json`);
    await addTimelineEvent({ type: "export", title: "Exported POV Package", description: `Exported scenario for ${povCountry}` });
  };

  const handleIntelligenceExport = async () => {
    const packet = await buildExportableIntelligencePacket(activeCommittee);
    downloadAsFile(JSON.stringify(packet, null, 2), `${ctx.country || "country"}-intelligence-packet.json`);
    await addTimelineEvent({ type: "export", title: "Exported intelligence packet", description: "Included factual sources, freshness metadata, and inferred analysis" });
  };

  const handleBriefingExport = async () => {
    const md = generateMarkdownBriefing(activeCommittee);
    downloadAsFile(md, `${ctx.committee || "committee"}-briefing.md`, "text/markdown");
    await addTimelineEvent({ type: "export", title: "Exported tactical briefing", description: "Markdown briefing with trends, analysis, and recommendations" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div><h1 className="text-lg font-bold text-white tracking-tight">Export Center</h1><p className="text-[11px] text-gray-500">Export context, share POV packages with allies, import responses.</p></div>

      <div className="flex gap-0.5 bg-gray-900/60 rounded-md p-0.5 border border-gray-800/40 w-fit">
        {(["export", "pov", "import", "external"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-[10px] font-medium rounded transition-colors ${tab === t ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}>
            {t === "export" ? "↗ Backup" : t === "pov" ? "🤝 Share POV" : t === "import" ? "↙ Import" : "⇄ External AI"}
          </button>
        ))}
      </div>

      {tab === "export" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400" />Full Backup</h2>
            <div className="flex gap-1.5">
              <CpBtn onClick={() => cp(exportCommitteeAsJSON(activeCommittee), "full")} copied={copied === "full"} label="Copy Full Data" />
              <button onClick={() => downloadAsFile(exportCommitteeAsJSON(activeCommittee), `${ctx.committee || "mun"}-backup.json`)} className="text-[10px] px-2 py-1 rounded-md bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">↓ Download .json</button>
              <button onClick={handleIntelligenceExport} className="text-[10px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-300 hover:bg-blue-500/15 border border-blue-500/20">↓ Intelligence Packet</button>
              <button onClick={handleBriefingExport} className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/20">↓ Tactical Briefing (.md)</button>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-pink-400" />Context Block (Text)</h2>
            <pre className="bg-gray-800/30 border border-gray-800/30 rounded-md p-2.5 text-[10px] text-gray-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{contextToExportBlock(ctx)}</pre>
            <div className="flex gap-1.5 mt-2">
              <CpBtn onClick={() => cp(contextToExportBlock(ctx), "block")} copied={copied === "block"} label="Copy Block" />
              <button onClick={() => downloadAsFile(contextToExportBlock(ctx), `${ctx.committee || "mun"}-context.txt`, "text/plain")} className="text-[10px] px-2 py-1 rounded-md bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30">↓ .txt</button>
            </div>
          </div>
        </div>
      )}

      {tab === "pov" && (
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
          <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400" />Share Scenario Package</h2>
          <p className="text-[10px] text-gray-400 mb-3">Create a `.munpack.json` file tailored for an ally. They can import it to instantly see the committee state, accepted clauses, and bloc tracker from their perspective. Personal speeches and notes are excluded.</p>
          
          <div className="relative mb-3 max-w-sm">
            <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1">Target Country</label>
            <input type="text" value={povCountry} onChange={(e) => handleCountryInput(e.target.value)} onBlur={() => setTimeout(() => setSuggestions([]), 200)}
              placeholder="e.g., France" className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            {suggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-xl overflow-hidden">
                {suggestions.map((s) => (
                  <button key={s.name} onMouseDown={() => { setPovCountry(s.name); setSuggestions([]); }} className="w-full text-left px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-1.5">
                    <span>{s.flag}</span><span>{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handlePOVExport} disabled={!povCountry.trim()} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white text-[10px] font-medium rounded-md transition-colors">
            ↓ Generate POV Package
          </button>
        </div>
      )}

      {tab === "import" && (
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
          <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400" />Import Data</h2>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste Context Block, Backup JSON, or .munpack data here…" rows={6}
            className="w-full bg-gray-800/30 border border-gray-800/30 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none font-mono" />
          <div className="flex gap-1.5 mt-2">
            <button onClick={handleImport} disabled={!importText.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-[10px] font-medium rounded-md transition-colors">↙ Import & Merge</button>
            <label className="px-2 py-1.5 text-[10px] rounded-md bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30 cursor-pointer">📁 Select File<input type="file" accept=".json,.txt" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImportText(await readFileAsText(f)); }} className="hidden" /></label>
            <button onClick={() => { setImportText(""); setImportResult(null); }} className="px-2 py-1.5 text-[10px] rounded-md bg-gray-800/50 text-gray-500 hover:text-gray-300 border border-gray-800/30">Clear</button>
          </div>
          {importResult && <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md p-2"><pre className="text-[10px] text-emerald-300 whitespace-pre-wrap font-sans">{importResult}</pre></div>}
        </div>
      )}

      {tab === "external" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
            <h2 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-purple-400" />External AI Bridge</h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Agent</label>
                <select value={extAgent} onChange={(e) => setExtAgent(e.target.value as AgentName)} className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                  {(Object.entries(AGENT_META) as [AgentName, typeof AGENT_META[AgentName]][]).map(([n, m]) => <option key={n} value={n}>{m.icon} {n}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Task</label>
                <input type="text" value={extTask} onChange={(e) => setExtTask(e.target.value)} placeholder="Write a compelling opening speech" className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
              </div>
            </div>
            <button onClick={() => extTask.trim() && setExtPrompt(buildExternalPrompt(extAgent, ctx, extTask))} disabled={!extTask.trim()}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 text-white text-[10px] font-medium rounded-md transition-colors mb-2">Generate Prompt</button>
            {extPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-[9px] text-gray-500 uppercase tracking-wider">Prompt</span><CpBtn onClick={() => cp(extPrompt, "prompt")} copied={copied === "prompt"} label="Copy" small /></div>
                <pre className="bg-gray-800/30 border border-gray-800/30 rounded-md p-2.5 text-[10px] text-gray-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{extPrompt}</pre>
                <div className="border-t border-gray-800/30 pt-2">
                  <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Paste External Response</label>
                  <textarea value={extResponse} onChange={(e) => setExtResponse(e.target.value)} placeholder="Paste from ChatGPT, Claude, Gemini…" rows={3} className="w-full bg-gray-800/30 border border-gray-800/30 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none" />
                  <button onClick={handleMerge} disabled={!extResponse.trim()} className="mt-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white text-[10px] font-medium rounded-md transition-colors">🧠 Merge into Context</button>
                </div>
                {mergeResult && <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-2"><pre className="text-[10px] text-emerald-300 whitespace-pre-wrap font-sans">{mergeResult}</pre></div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CpBtn({ onClick, copied, label, small }: { onClick: () => void; copied: boolean; label: string; small?: boolean }) {
  return (
    <button onClick={onClick} className={`${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"} rounded-md transition-colors ${copied ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30" : "bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-gray-800/30"}`}>
      {copied ? "✓ Copied" : `📋 ${label}`}
    </button>
  );
}
