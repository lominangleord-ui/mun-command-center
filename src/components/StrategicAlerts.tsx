import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function StrategicAlerts() {
  const { activeCommittee, dismissAlert } = useApp();
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "critical">("all");

  if (!activeCommittee) return null;

  const all = activeCommittee.alerts.filter((a) => !a.dismissed);
  const filtered = filter === "all" ? all : all.filter((a) => a.severity === filter);

  if (all.length === 0) return null;

  const sevConfig = {
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", icon: "ℹ", dot: "bg-blue-400" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", icon: "⚠", dot: "bg-amber-400" },
    critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-300", icon: "🚨", dot: "bg-red-400" },
  };

  const counts = {
    all: all.length,
    info: all.filter((a) => a.severity === "info").length,
    warning: all.filter((a) => a.severity === "warning").length,
    critical: all.filter((a) => a.severity === "critical").length,
  };

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Strategic Alerts</span>
          <span className="text-[8px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{all.length}</span>
        </div>
        <div className="flex gap-1">
          {(["all", "critical", "warning", "info"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[9px] px-1.5 py-0.5 rounded ${filter === f ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {f} <span className="text-gray-600">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {filtered.slice(0, 10).map((a) => {
          const c = sevConfig[a.severity];
          return (
            <div key={a.id} className={`flex items-start gap-2 p-2 rounded-md border ${c.bg} ${c.border} group`}>
              <span className="text-sm flex-shrink-0 mt-0.5">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <div className={`text-[11px] font-medium ${c.text}`}>{a.title}</div>
                  <div className="text-[8px] text-gray-600 ml-auto font-mono">{new Date(a.timestamp).toLocaleTimeString()}</div>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{a.description}</div>
              </div>
              <button onClick={() => dismissAlert(a.id)} className="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 text-xs flex-shrink-0">✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
