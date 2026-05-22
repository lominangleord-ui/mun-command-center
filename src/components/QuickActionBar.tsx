import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function QuickActionBar() {
  const { activeCommittee, addSnapshot, addTimelineEvent, addAlert, compressContext } = useApp();
  const nav = useNavigate();

  if (!activeCommittee) return null;

  const actions = [
    { label: "Add Country", icon: "+", onClick: () => nav("/bloc-tracker"), color: "emerald" },
    { label: "Speech", icon: "🎤", onClick: () => nav("/speech-builder"), color: "blue" },
    { label: "Clause", icon: "📝", onClick: () => nav("/clause-builder"), color: "rose" },
    { label: "Predict", icon: "📊", onClick: () => nav("/voting-room"), color: "cyan" },
    { label: "Negotiate", icon: "🤝", onClick: () => nav("/negotiation-workspace"), color: "violet" },
    { label: "Live Mode", icon: "●", onClick: () => nav("/live"), color: "red" },
    { label: "Snapshot", icon: "📸", onClick: () => { addSnapshot(`Quick @ ${new Date().toLocaleTimeString()}`); }, color: "amber" },
    { label: "Compress", icon: "🧠", onClick: () => compressContext(), color: "indigo" },
    { label: "Export POV", icon: "↗", onClick: () => nav("/export-center"), color: "teal" },
    { label: "Add Note", icon: "📋", onClick: () => { addTimelineEvent({ type: "action", title: "Manual log entry", description: "User-flagged moment", icon: "📋" }); addAlert({ severity: "info", title: "Logged", description: "Timeline entry recorded" }); }, color: "lime" },
  ];

  const colorClass: Record<string, string> = {
    emerald: "bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border-emerald-500/30",
    blue: "bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border-blue-500/30",
    rose: "bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border-rose-500/30",
    cyan: "bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 border-cyan-500/30",
    violet: "bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border-violet-500/30",
    red: "bg-red-600/15 hover:bg-red-600/25 text-red-300 border-red-500/30",
    amber: "bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border-amber-500/30",
    indigo: "bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border-indigo-500/30",
    teal: "bg-teal-600/15 hover:bg-teal-600/25 text-teal-300 border-teal-500/30",
    lime: "bg-lime-600/15 hover:bg-lime-600/25 text-lime-300 border-lime-500/30",
  };

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <div className="w-1 h-1 rounded-full bg-orange-400" />
        <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Quick Action Bar</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${colorClass[a.color]}`}>
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
