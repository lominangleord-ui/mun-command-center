import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function TimelineDock() {
  const { activeCommittee } = useApp();
  const navigate = useNavigate();
  if (!activeCommittee) return null;

  const items = activeCommittee.timeline.slice(0, 8);

  return (
    <div className="h-16 border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-xl flex-shrink-0">
      <div className="h-full flex items-center gap-3 px-4 overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-[0.22em]">Live Timeline</span>
        </div>
        {items.length === 0 ? (
          <div className="text-[10px] text-gray-600">Activity stream will populate as committee events occur.</div>
        ) : (
          items.map((e) => (
            <button key={e.id} onClick={() => navigate("/memory")}
              className="flex-shrink-0 min-w-[220px] max-w-[300px] rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06] transition-all shadow-tactical">
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{e.icon || "•"}</span>
                <span className="text-[11px] text-white font-medium truncate">{e.title}</span>
                <span className="ml-auto text-[8px] text-gray-600 font-mono flex-shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-[9px] text-gray-500 truncate mt-0.5">{e.description}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
