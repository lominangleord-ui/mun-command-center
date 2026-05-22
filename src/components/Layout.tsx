import { type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { PHASE_LABELS } from "../types";
import LiveContextStrip from "./LiveContextStrip";
import StatusFooter from "./StatusFooter";
import CommandPalette from "./CommandPalette";
import IntelligenceRail from "./IntelligenceRail";
import TimelineDock from "./TimelineDock";
import { getFlag } from "../lib/countries";

const NAV = [
  { section: "Overview", color: "text-blue-300", items: [
    { path: "/", label: "Dashboard", icon: "◇" },
    { path: "/live", label: "Live Mode", icon: "●", live: true },
  ] },
  { section: "Context", color: "text-violet-300", items: [
    { path: "/vault", label: "Context Vault", icon: "◈" },
    { path: "/ai-settings", label: "AI Providers", icon: "AI" },
    { path: "/memory", label: "Memory & Logs", icon: "◌" },
    { path: "/snapshots", label: "Snapshots", icon: "◉" },
  ] },
  { section: "Strategy", color: "text-emerald-300", items: [
    { path: "/bloc-tracker", label: "Relationship Map", icon: "◊" },
    { path: "/country-intelligence", label: "Country Intel", icon: "◆" },
    { path: "/research-center", label: "Research Center", icon: "◌" },
    { path: "/negotiation-workspace", label: "Negotiations", icon: "◇" },
  ] },
  { section: "Drafting", color: "text-amber-300", items: [
    { path: "/speech-builder", label: "Speeches", icon: "◐" },
    { path: "/clause-builder", label: "Clauses", icon: "◑" },
    { path: "/clause-impact", label: "Impact Sim.", icon: "◓" },
  ] },
  { section: "Voting", color: "text-cyan-300", items: [
    { path: "/voting-room", label: "Voting Room", icon: "◉" },
  ] },
  { section: "Bridge", color: "text-pink-300", items: [
    { path: "/export-center", label: "Export Center", icon: "◇" },
  ] },
];

const floorPrimaryRoutes = ["/live", "/speech-builder", "/bloc-tracker"];
const drafterPrimaryRoutes = ["/clause-builder", "/negotiation-workspace", "/voting-room", "/clause-impact"];

export default function Layout({ children }: { children: ReactNode }) {
  const { activeCommittee, sidebarOpen, toggleSidebar, committees, selectCommittee, createNewCommittee, liveMode, viewMode } = useApp();
  const location = useLocation();
  const ctx = activeCommittee?.contextPack;

  const contentWidthClass = viewMode === "presentation"
    ? "max-w-[1400px]"
    : viewMode === "compact"
    ? "max-w-[1100px]"
    : "max-w-[1600px]";

  return (
    <div className="flex h-screen bg-[#070B14] text-gray-100 overflow-hidden relative">
      {/* Ambient cinematic layers */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(76,112,255,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(125,86,255,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(15,178,180,0.10),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.01))]" />

      {/* Navigation rail */}
      <aside className={`${sidebarOpen ? "w-[228px]" : "w-0 overflow-hidden"} relative z-10 flex-shrink-0 transition-all duration-300 border-r border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.88),rgba(12,18,30,0.95))] backdrop-blur-2xl flex flex-col`}>
        <div className="px-4 pt-4 pb-3 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-xl bg-[linear-gradient(135deg,#3654FF,#7B5CFF)] flex items-center justify-center text-[11px] font-bold text-white shadow-[0_0_35px_rgba(75,108,255,0.28)]">
              M
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-white tracking-[0.02em]">MUN Command</h1>
              <p className="text-[8px] text-gray-500 tracking-[0.24em] uppercase">Diplomatic OS</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-white/6">
          <select value={activeCommittee?.id || ""} onChange={(e) => selectCommittee(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2 text-[10px] text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400/40">
            <option value="">Select committee…</option>
            {committees.map((c) => <option key={c.id} value={c.id}>{c.contextPack.committee || "Untitled"} — {c.contextPack.country || "?"}</option>)}
          </select>
          <button onClick={createNewCommittee} className="w-full mt-2 bg-[linear-gradient(135deg,#3654FF,#4B6CFF)] hover:brightness-110 text-white text-[10px] font-medium py-2 rounded-xl transition-all shadow-[0_8px_24px_rgba(54,84,255,0.22)]">
            + New Committee
          </button>
        </div>

        {ctx?.committee && (
          <div className="px-3 pt-3 pb-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 shadow-tactical">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg leading-none">{getFlag(ctx.country)}</span>
                <div className="min-w-0">
                  <div className="text-[11px] text-white font-medium truncate">{ctx.country}</div>
                  <div className="text-[9px] text-gray-500 truncate">{ctx.committee}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[8px] uppercase tracking-[0.18em] text-violet-300 font-semibold">
                {PHASE_LABELS[ctx.current_phase]}
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1">
          {NAV.map((s) => (
            <div key={s.section} className="mb-1.5">
              <div className={`text-[8px] uppercase tracking-[0.22em] font-semibold ${s.color} px-3 py-1 opacity-85`}>{s.section}</div>
              {s.items.map((item) => {
                const isPrimary = ctx?.delegateRole === "floor"
                  ? floorPrimaryRoutes.includes(item.path)
                  : ctx?.delegateRole === "drafter"
                  ? drafterPrimaryRoutes.includes(item.path)
                  : true;
                return (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) => `group flex items-center gap-2.5 px-3 py-2 text-[11px] rounded-xl transition-all border ${
                      isActive
                        ? "bg-white/[0.08] border-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : isPrimary
                        ? "border-transparent text-gray-300 hover:bg-white/[0.04] hover:border-white/6 hover:text-gray-100"
                        : "border-transparent text-gray-600 hover:bg-white/[0.03] hover:text-gray-400"
                    }`}>
                    <span className={`text-[9px] ${item.live ? "text-red-400" : isPrimary ? "text-blue-300/80" : "text-gray-600 group-hover:text-gray-400"}`}>{item.icon}</span>
                    <span>{item.label}</span>
                    {isPrimary && ctx?.delegateRole !== "unassigned" && <span className="ml-auto text-[7px] uppercase tracking-[0.16em] text-blue-300/70">Primary</span>}
                    {item.live && liveMode && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/6">
          <div className="text-[8px] text-gray-600 text-center tracking-[0.22em] uppercase">Operational Mode</div>
        </div>
      </aside>

      {/* Main shell */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-10 flex items-center justify-between px-4 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] backdrop-blur-xl flex-shrink-0">
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-gray-200 transition-colors" title="Toggle sidebar">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-[10px] text-gray-500 font-medium flex items-center gap-2 uppercase tracking-[0.18em]">
            {liveMode && <span className="flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" /> Live</span>}
            <span>{NAV.flatMap((s) => s.items).find((i) => i.path === location.pathname)?.label || "MUN Command Center"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CommandPalette />
            {ctx?.country && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/8">{getFlag(ctx.country)} {ctx.country}</span>}
          </div>
        </header>

        <LiveContextStrip />

        {/* Workspace */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className={`mx-auto ${contentWidthClass} p-4 md:p-5`}>{children}</div>
          </main>

          {/* Right rail hidden in compact/presentation small screens */}
          {viewMode !== "compact" && (
            <div className="hidden xl:flex h-full">
              <IntelligenceRail />
            </div>
          )}
        </div>

        <TimelineDock />
        <StatusFooter />
      </div>
    </div>
  );
}
