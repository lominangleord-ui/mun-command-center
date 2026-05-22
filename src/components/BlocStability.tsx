import { useApp } from "../context/AppContext";
import { computeBlocStability } from "../lib/blocStability";
import { useMemo } from "react";

export default function BlocStability() {
  const { activeCommittee } = useApp();
  if (!activeCommittee) return null;

  const stability = useMemo(() => computeBlocStability(activeCommittee.blocEntries, activeCommittee.timeline), [activeCommittee.blocEntries, activeCommittee.timeline]);

  if (activeCommittee.blocEntries.length === 0) return null;

  const trendIcon = { rising: "↑", stable: "→", falling: "↓" }[stability.trend];
  const trendColor = { rising: "text-emerald-400", stable: "text-gray-400", falling: "text-red-400" }[stability.trend];

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Bloc Stability</span>
        </div>
        <div className={`text-xs font-bold ${trendColor}`}>{trendIcon} {stability.trend}</div>
      </div>

      <div className="space-y-2">
        <Bar label="Cohesion" value={stability.cohesion} color="emerald" />
        <Bar label="Rebellion Risk" value={stability.rebellionRisk} color="red" />
        <Bar label="Swing Instability" value={stability.swingInstability} color="amber" />
      </div>

      <div className="mt-3 pt-2.5 border-t border-gray-800/40 flex items-center justify-between">
        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Confidence Score</div>
        <div className={`text-2xl font-bold ${stability.confidenceScore >= 60 ? "text-emerald-300" : stability.confidenceScore >= 40 ? "text-amber-300" : "text-red-300"}`}>
          {stability.confidenceScore}<span className="text-xs text-gray-500">/100</span>
        </div>
      </div>

      {stability.recentChanges.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-800/40 space-y-0.5">
          {stability.recentChanges.map((c, i) => <div key={i} className="text-[9px] text-gray-500 truncate">• {c}</div>)}
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const c = { emerald: "bg-emerald-500", red: "bg-red-500", amber: "bg-amber-500" }[color];
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] mb-0.5">
        <span className="text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-gray-300 font-mono">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${c} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
