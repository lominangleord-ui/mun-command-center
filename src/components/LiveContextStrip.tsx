import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { PHASE_LABELS } from "../types";

export default function LiveContextStrip() {
  const { activeCommittee, liveMode } = useApp();
  if (!activeCommittee) return null;
  const ctx = activeCommittee.contextPack;
  if (!ctx.committee) return null;

  const stats = useMemo(() => {
    const entries = activeCommittee.blocEntries;
    const allies = entries.filter((e) => e.stance === "ally").length;
    const opp = entries.filter((e) => e.stance === "opponent").length;
    const swing = entries.filter((e) => e.stance === "swing").length;
    const threat = opp >= 5 ? "High" : opp >= 2 ? "Moderate" : "Controlled";
    return { allies, opp, swing, threat };
  }, [activeCommittee.blocEntries]);

  const threatClass = stats.threat === "High" ? "text-red-300" : stats.threat === "Moderate" ? "text-amber-300" : "text-emerald-300";

  return (
    <div className="h-12 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-xl flex-shrink-0">
      <div className="h-full flex items-center gap-3 px-4 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          {liveMode && <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />}
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Committee</span>
          <span className="text-sm font-semibold text-white">{ctx.committee}</span>
        </div>
        <Sep />
        <Item label="Country" value={ctx.country} tone="text-blue-200" />
        <Sep />
        <Item label="Agenda" value={ctx.agenda} tone="text-white" max="max-w-[220px]" />
        <Sep />
        <Item label="Phase" value={PHASE_LABELS[ctx.current_phase]} tone="text-violet-300" />
        <Sep />
        <Item label="Objective" value={ctx.active_goal || "—"} tone="text-emerald-300" max="max-w-[220px]" />
        <Sep />
        <Item label="Allies" value={String(stats.allies)} tone="text-emerald-300" mono />
        <Sep />
        <Item label="Opposition" value={String(stats.opp)} tone="text-red-300" mono />
        <Sep />
        <Item label="Swing" value={String(stats.swing)} tone="text-amber-300" mono />
        <Sep />
        <Item label="Threat" value={stats.threat} tone={threatClass} />
        <Sep />
        <Item label="Status" value={liveMode ? "Live Committee" : "Strategy Prep"} tone={liveMode ? "text-red-300" : "text-gray-300"} />
      </div>
    </div>
  );
}

function Item({ label, value, tone, mono = false, max = "max-w-[120px]" }: { label: string; value: string; tone: string; mono?: boolean; max?: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-[8px] text-gray-600 uppercase tracking-[0.22em] font-semibold">{label}</span>
      <span className={`text-[11px] ${mono ? "font-mono" : "font-medium"} ${tone} ${max} truncate`} title={value}>{value}</span>
    </div>
  );
}

function Sep() {
  return <span className="text-white/8 text-[10px] flex-shrink-0">│</span>;
}
