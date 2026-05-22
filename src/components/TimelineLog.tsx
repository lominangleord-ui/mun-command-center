import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function TimelineLog() {
  const { activeCommittee } = useApp();
  const nav = useNavigate();
  if (!activeCommittee) return null;

  const timeline = activeCommittee.timeline.slice(0, 8);

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-cyan-400" />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Recent Activity</span>
          <span className="text-[8px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{activeCommittee.timeline.length}</span>
        </div>
        <button onClick={() => nav("/memory")} className="text-[9px] text-gray-500 hover:text-gray-300">View all →</button>
      </div>

      {timeline.length === 0 ? (
        <div className="text-[10px] text-gray-600 text-center py-3">Activity will appear here as you use the app.</div>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {timeline.map((e) => (
            <div key={e.id} className="flex items-start gap-2 px-1.5 py-1 rounded hover:bg-gray-800/30 text-[10px]">
              <span className="text-sm flex-shrink-0 leading-none">{e.icon || "•"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-200 font-medium truncate">{e.title}</span>
                  <span className="text-[8px] text-gray-600 font-mono ml-auto flex-shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-500 truncate">{e.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
