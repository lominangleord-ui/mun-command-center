import { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function Snapshots() {
  const { activeCommittee, addSnapshot, restoreSnapshot, deleteSnapshot } = useApp();
  const [name, setName] = useState("");
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;

  const snapshots = activeCommittee.snapshots;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Session Snapshots</h1>
          <p className="text-[11px] text-gray-500">Preserve and restore committee state for safe rollback.</p>
        </div>
        <span className="text-[10px] text-gray-500 px-2 py-1 rounded-md bg-gray-800/50 border border-gray-800/40">
          {snapshots.length} / 30 snapshots
        </span>
      </div>

      {/* Quick snapshot */}
      <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3.5">
        <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <div className="w-1 h-1 rounded-full bg-violet-400" /> Save New Snapshot
        </div>
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Snapshot name (e.g., 'Before Resolution Merge')"
            className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
          <button onClick={() => { if (name.trim()) { addSnapshot(name.trim()); setName(""); } }}
            disabled={!name.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-md">
            📸 Save
          </button>
          <button onClick={() => addSnapshot(`Quick @ ${new Date().toLocaleTimeString()}`)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-md border border-gray-700/40">
            Quick
          </button>
        </div>
      </div>

      {/* Snapshot suggestions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Before unmod", desc: "Save before unmoderated caucus" },
          { label: "Pre-vote", desc: "Save before key vote" },
          { label: "Pre-merge", desc: "Save before resolution merge" },
          { label: "Pre-export", desc: "Save before sharing POV" },
        ].map((s) => (
          <button key={s.label} onClick={() => addSnapshot(s.label)}
            className="text-left p-2.5 bg-gray-900/50 hover:bg-gray-800/60 border border-gray-800/40 hover:border-gray-700/60 rounded-md transition-colors group">
            <div className="text-[10px] font-medium text-gray-300 group-hover:text-white">📸 {s.label}</div>
            <div className="text-[9px] text-gray-600 mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Snapshot list */}
      <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-800/40 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-blue-400" />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Saved Snapshots</span>
        </div>
        {snapshots.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2 opacity-40">📸</div>
            <p className="text-gray-600 text-xs">No snapshots yet. Save one before any risky operation.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40 max-h-[500px] overflow-y-auto">
            {snapshots.map((s) => (
              <div key={s.id} className="p-3 hover:bg-gray-800/30 group">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-sm font-medium text-white">{s.name}</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">{new Date(s.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setConfirmRestore(s.id)}
                      className="text-[10px] px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-medium">
                      ↺ Restore
                    </button>
                    <button onClick={() => deleteSnapshot(s.id)}
                      className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-red-600/20 text-gray-400 hover:text-red-300 border border-gray-700/40 hover:border-red-500/30">
                      Delete
                    </button>
                  </div>
                </div>
                {/* Snapshot preview */}
                <div className="mt-2 grid grid-cols-5 gap-2 text-[9px]">
                  <div className="text-gray-500">Phase: <span className="text-violet-300">{s.state.contextPack.current_phase}</span></div>
                  <div className="text-gray-500">Speeches: <span className="text-blue-300">{s.state.speeches.length}</span></div>
                  <div className="text-gray-500">Clauses: <span className="text-rose-300">{s.state.clauses.length}</span></div>
                  <div className="text-gray-500">Allies: <span className="text-emerald-300">{s.state.contextPack.allies.length}</span></div>
                  <div className="text-gray-500">Logs: <span className="text-cyan-300">{s.state.timeline.length}</span></div>
                </div>

                {confirmRestore === s.id && (
                  <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-md">
                    <div className="text-[10px] text-amber-300 mb-2 font-medium">
                      ⚠ Restoring this snapshot will replace your current committee state. Current state will be lost unless you save a snapshot first.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { restoreSnapshot(s.id); setConfirmRestore(null); }}
                        className="text-[10px] px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium">
                        Confirm Restore
                      </button>
                      <button onClick={() => setConfirmRestore(null)}
                        className="text-[10px] px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
