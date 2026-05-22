import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { getFlag, searchCountries } from "../../lib/countries";
import type { NegotiationState } from "../../types";
import ExternalAIBridge from "../../components/ExternalAIBridge";

export default function NegotiationWorkspace() {
  const { activeCommittee, addNegotiation, updateNegotiation, deleteNegotiation } = useApp();
  const [country, setCountry] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; flag: string }[]>([]);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;

  const handleCountryInput = (v: string) => {
    setCountry(v);
    if (v.length >= 2) {
      const tracked = activeCommittee.blocEntries.map((e) => ({ name: e.country, flag: getFlag(e.country) }));
      const search = searchCountries(v).slice(0, 6).map((c) => ({ name: c.name, flag: c.flag }));
      const combined = [...tracked.filter((t) => t.name.toLowerCase().includes(v.toLowerCase())), ...search];
      setSuggestions(combined.slice(0, 6).filter((c, i, a) => a.findIndex((x) => x.name === c.name) === i));
    } else {
      setSuggestions([]);
    }
  };

  const start = (name: string) => {
    if (activeCommittee.negotiations.find((n) => n.country.toLowerCase() === name.toLowerCase())) return;
    const entry = activeCommittee.blocEntries.find((e) => e.country.toLowerCase() === name.toLowerCase());
    addNegotiation({
      country: name,
      demands: [], concessions: [], redLines: [], promises: [], talkingPoints: [], risks: [],
      targetFraming: entry ? `${entry.stance === "ally" ? "Reinforce alliance" : entry.stance === "opponent" ? "Reduce hostility" : "Persuade swing"}` : "Bilateral cooperation",
      followUpActions: [],
      status: "active",
    });
    setCountry("");
    setSuggestions([]);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Negotiation Workspace</h1>
        <p className="text-[11px] text-gray-500">Per-country bilateral talks: demands, concessions, red lines, follow-ups.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
        <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <div className="w-1 h-1 rounded-full bg-emerald-400" /> Start New Negotiation
        </div>
        <div className="relative">
          <input type="text" value={country} onChange={(e) => handleCountryInput(e.target.value)}
            onBlur={() => setTimeout(() => setSuggestions([]), 200)}
            onKeyDown={(e) => e.key === "Enter" && country.trim() && start(country.trim())}
            placeholder="Country name…"
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
          {suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-2xl max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button key={s.name} onMouseDown={() => start(s.name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-gray-800">
                  <span>{s.flag}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active negotiations */}
      {activeCommittee.negotiations.length === 0 ? (
        <div className="bg-gray-900/40 border border-gray-800/30 rounded-lg p-8 text-center">
          <div className="text-3xl mb-2 opacity-40">🤝</div>
          <p className="text-gray-600 text-xs">No active negotiations. Start one above to track a bilateral talk.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeCommittee.negotiations.map((n) => (
            <NegCard key={n.id} neg={n}
              isOpen={openId === n.id}
              onToggle={() => setOpenId(openId === n.id ? null : n.id)}
              onUpdate={(u) => updateNegotiation(n.id, u)}
              onDelete={() => deleteNegotiation(n.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function NegCard({ neg, isOpen, onToggle, onUpdate, onDelete }: {
  neg: NegotiationState; isOpen: boolean;
  onToggle: () => void; onUpdate: (u: Partial<NegotiationState>) => void; onDelete: () => void;
}) {
  const { activeCommittee } = useApp();
  const ctx = activeCommittee!.contextPack;
  const statusColor = {
    idle: "text-gray-400 bg-gray-500/10 border-gray-500/30",
    active: "text-blue-300 bg-blue-500/10 border-blue-500/30",
    stalled: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    successful: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    failed: "text-red-300 bg-red-500/10 border-red-500/30",
  }[neg.status];

  const totalItems = neg.demands.length + neg.concessions.length + neg.redLines.length + neg.promises.length;

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors">
        <span className="text-xl">{getFlag(neg.country)}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{neg.country}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider ${statusColor}`}>{neg.status}</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{neg.targetFraming || "No framing set"} · {totalItems} items · Updated {new Date(neg.updatedAt).toLocaleString()}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[10px] text-gray-600 hover:text-red-400 px-2">Delete</button>
        <span className="text-gray-500 text-xs">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800/40 p-3.5 space-y-3">
          {/* Status + framing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-wider">Status</label>
              <select value={neg.status} onChange={(e) => onUpdate({ status: e.target.value as NegotiationState["status"] })}
                className="w-full mt-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                <option value="idle">Idle</option>
                <option value="active">Active</option>
                <option value="stalled">Stalled</option>
                <option value="successful">Successful</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-wider">Target Framing</label>
              <input type="text" value={neg.targetFraming} onChange={(e) => onUpdate({ targetFraming: e.target.value })}
                placeholder="How to frame the ask…"
                className="w-full mt-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            </div>
          </div>

          {/* Lists grid */}
          <div className="grid grid-cols-2 gap-3">
            <ListEditor label="Demands" color="blue" items={neg.demands} onChange={(items) => onUpdate({ demands: items })} placeholder="What we want…" />
            <ListEditor label="Concessions" color="emerald" items={neg.concessions} onChange={(items) => onUpdate({ concessions: items })} placeholder="What we'll give…" />
            <ListEditor label="Red Lines" color="red" items={neg.redLines} onChange={(items) => onUpdate({ redLines: items })} placeholder="Non-negotiable…" />
            <ListEditor label="Promises Made" color="amber" items={neg.promises} onChange={(items) => onUpdate({ promises: items })} placeholder="Commitments given…" />
            <ListEditor label="Talking Points" color="violet" items={neg.talkingPoints} onChange={(items) => onUpdate({ talkingPoints: items })} placeholder="Key arguments…" />
            <ListEditor label="Risks" color="rose" items={neg.risks} onChange={(items) => onUpdate({ risks: items })} placeholder="What could go wrong…" />
          </div>

          <ListEditor label="Follow-up Actions" color="cyan" items={neg.followUpActions} onChange={(items) => onUpdate({ followUpActions: items })} placeholder="Next steps…" />

          {/* AI Bridge */}
          <ExternalAIBridge
            prompt={`Build a negotiation script for bilateral talks with ${neg.country}. Use the demands, concessions, red lines, and target framing below.`}
            extraContext={`NEGOTIATION TARGET: ${neg.country}\nTarget Framing: ${neg.targetFraming}\nDemands: ${neg.demands.join("; ")}\nConcessions: ${neg.concessions.join("; ")}\nRed Lines: ${neg.redLines.join("; ")}`}
            context={ctx}
            suggestedModel="ChatGPT" compact />
        </div>
      )}
    </div>
  );
}

function ListEditor({ label, color, items, onChange, placeholder }: {
  label: string; color: string; items: string[]; onChange: (items: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");
  const colorClass: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-300",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    red: "border-red-500/30 bg-red-500/5 text-red-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-300",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
  };

  return (
    <div className={`rounded-md border p-2 ${colorClass[color]}`}>
      <div className="text-[9px] font-semibold uppercase tracking-wider opacity-80 mb-1.5">{label}</div>
      <div className="space-y-1 mb-1.5">
        {items.length === 0 ? (
          <div className="text-[10px] opacity-50 italic">None yet</div>
        ) : items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px]">
            <span className="opacity-60">•</span>
            <span className="flex-1 text-gray-200">{item}</span>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 text-[10px]">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onChange([...items, input.trim()]); setInput(""); } }}
          placeholder={placeholder}
          className="flex-1 bg-gray-950/40 border border-gray-800/40 rounded px-2 py-0.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { onChange([...items, input.trim()]); setInput(""); } }}
          className="px-1.5 text-[11px] bg-gray-800/60 hover:bg-gray-700 text-gray-300 rounded">+</button>
      </div>
    </div>
  );
}
