import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import type { TimelineEventType } from "../../types";

export default function Memory() {
  const { activeCommittee, compressContext, pinMemory, addTimelineEvent } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TimelineEventType>("all");
  const [pinInput, setPinInput] = useState("");

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;

  const timeline = activeCommittee.timeline;
  const memories = activeCommittee.memories;

  const filteredTimeline = useMemo(() => {
    return timeline.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [timeline, filter, search]);

  const types: Array<"all" | TimelineEventType> = ["all", "relationship", "draft", "negotiation", "vote", "snapshot", "alert", "memory", "action"];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Committee Memory</h1>
        <p className="text-[11px] text-gray-500">Searchable timeline of every action, decision, and strategic shift.</p>
      </div>

      {/* Pinned memories */}
      <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-amber-400" /> Pinned Memories ({memories.length})
          </div>
          <div className="flex gap-1.5">
            <button onClick={compressContext}
              className="text-[10px] px-2 py-1 rounded bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30">
              🧠 Compress Context
            </button>
            <button onClick={() => addTimelineEvent({ type: "memory", title: "Key decision marked", description: "Manual checkpoint", icon: "📌" })}
              className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/40">
              Mark Decision
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <input type="text" value={pinInput} onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && pinInput.trim()) { pinMemory(pinInput.trim()); setPinInput(""); } }}
            placeholder="Pin a fact, promise, or strategic note…"
            className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
          <button onClick={() => { if (pinInput.trim()) { pinMemory(pinInput.trim()); setPinInput(""); } }}
            disabled={!pinInput.trim()}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 text-white text-[10px] font-medium rounded-md">
            📌 Pin
          </button>
        </div>
        {memories.length === 0 ? (
          <div className="text-[10px] text-gray-600 text-center py-3">No memories pinned yet.</div>
        ) : (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {memories.map((m, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-gray-800/30 rounded-md text-[11px]">
                <span className="text-amber-400 flex-shrink-0">📌</span>
                <pre className="text-gray-300 whitespace-pre-wrap font-sans flex-1 leading-relaxed">{m}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-800/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-cyan-400" /> Activity Timeline ({timeline.length})
            </div>
          </div>
          <div className="flex gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timeline…"
              className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50" />
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
              className="bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none">
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {filteredTimeline.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2 opacity-40">🕒</div>
            <p className="text-gray-600 text-xs">{timeline.length === 0 ? "No timeline events yet — actions will be logged automatically." : "No events match your filter."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40 max-h-[500px] overflow-y-auto">
            {filteredTimeline.map((e) => (
              <div key={e.id} className="px-3 py-2 hover:bg-gray-800/20 flex items-start gap-3">
                <div className="text-base flex-shrink-0 mt-0.5">{e.icon || "•"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-white">{e.title}</span>
                    <span className="text-[8px] text-gray-600 font-mono">{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{e.description}</div>
                </div>
                <span className="text-[8px] text-gray-600 uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800/60 flex-shrink-0">{e.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
