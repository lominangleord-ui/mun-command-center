import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { PHASE_LABELS, AGENT_META, type AgentName, type ViewMode } from "../../types";
import { routeTask, getRouteDescription } from "../../lib/agentRouter";
import { executeAgentAsync } from "../../agents";
import type { AgentResponse } from "../../types";
import { getFlag } from "../../lib/countries";
import TimelineLog from "../../components/TimelineLog";
import QuickActionBar from "../../components/QuickActionBar";
import StrategicAlerts from "../../components/StrategicAlerts";
import BlocStability from "../../components/BlocStability";
import ExternalAIBridge from "../../components/ExternalAIBridge";
import PartnerSyncPanel from "../../components/PartnerSyncPanel";
import ApiCountryBrief from "../../features/country-intelligence/components/ApiCountryBrief";

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: "tactical", label: "Tactical", icon: "⊞" },
  { key: "drafting", label: "Drafting", icon: "📝" },
  { key: "diplomacy", label: "Diplomacy", icon: "🤝" },
  { key: "voting", label: "Voting", icon: "🗳" },
  { key: "compact", label: "Compact", icon: "▭" },
  { key: "presentation", label: "Present", icon: "🖥" },
];

export default function Dashboard() {
  const { activeCommittee, createNewCommittee, deleteCommittee, viewMode, setViewMode, addAlert } = useApp();
  const navigate = useNavigate();
  const [taskInput, setTaskInput] = useState("");
  const [agentOutput, setAgentOutput] = useState<AgentResponse | null>(null);
  const [currentAgent, setCurrentAgent] = useState<AgentName | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);

  const ctx = activeCommittee?.contextPack;
  const hasSetup = !!(ctx?.committee && ctx?.country && ctx?.agenda);

  const intel = useMemo(() => {
    if (!activeCommittee) return null;
    const entries = activeCommittee.blocEntries;
    const allies = entries.filter((e) => e.stance === "ally");
    const opponents = entries.filter((e) => e.stance === "opponent");
    const swings = entries.filter((e) => e.stance === "swing");
    const strongAllies = allies.filter((e) => e.supportLevel >= 70);
    const riskyAllies = allies.filter((e) => e.riskLevel > 60);
    return { entries, allies, opponents, swings, strongAllies, riskyAllies };
  }, [activeCommittee]);

  if (!activeCommittee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white mb-4 shadow-lg shadow-blue-500/20">M</div>
        <h2 className="text-lg font-bold text-white mb-1.5">MUN AI Command Center</h2>
        <p className="text-gray-500 text-xs mb-5 max-w-xs leading-relaxed">AI-powered MUN preparation and in-committee support. Local-first, offline-ready, free-first.</p>
        <button onClick={createNewCommittee} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">+ Create Your First Committee</button>
        <div className="mt-4 text-[9px] text-gray-600">Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/40 font-mono">⌘K</kbd> for command palette</div>
      </div>
    );
  }

  const handleSubmitTask = async () => {
    if (!taskInput.trim() || !ctx) return;
    const agent = routeTask(taskInput);
    setCurrentAgent(agent);
    setAgentBusy(true);
    setAgentOutput(await executeAgentAsync(agent, { task: taskInput, context: ctx }));
    setAgentBusy(false);
  };

  const phaseActions: Record<string, string> = {
    roll_call: "Confirm presence and review agenda",
    agenda_setting: "Lobby for your preferred topic with allies",
    opening_speeches: "Deliver your opening speech",
    moderated_caucus: "Prepare focused interventions on caucus topic",
    unmoderated_caucus: "Build coalitions and negotiate draft language",
    drafting: "Work with bloc on operative clauses",
    amendment: "Review and strategize on proposed amendments",
    voting: "Assess each clause and vote strategically",
  };

  return (
    <div className={`mx-auto space-y-3 ${viewMode === "presentation" ? "max-w-4xl text-base" : "max-w-6xl"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {hasSetup && <span className="text-2xl">{getFlag(ctx!.country)}</span>}
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">{hasSetup ? ctx!.committee : "Dashboard"}</h1>
            {hasSetup && <p className="text-[11px] text-gray-500">{ctx!.country} · {ctx!.agenda} · {ctx!.role}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-gray-900/60 rounded-md p-0.5 border border-gray-800/40">
            {VIEW_MODES.map((m) => (
              <button key={m.key} onClick={() => setViewMode(m.key)} title={m.label}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${viewMode === m.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {m.icon}
              </button>
            ))}
          </div>
          <button onClick={() => navigate("/vault")} className="text-[10px] px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50 transition-colors">Edit Context →</button>
        </div>
      </div>

      {!hasSetup ? (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-center">
          <p className="text-amber-300/80 text-xs">⚠️ Set up your <button onClick={() => navigate("/vault")} className="underline hover:text-amber-200">Context Vault</button> to unlock all features.</p>
        </div>
      ) : (
        <>
          {/* Situation Report */}
          <div className="bg-gray-900 border border-gray-800/80 rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Situation Report</span>
              </div>
              <span className="text-[10px] text-gray-600">{PHASE_LABELS[ctx!.current_phase]}</span>
            </div>
            <div className="p-3.5 space-y-2.5">
              <div className="grid grid-cols-3 gap-3">
                <div><div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Phase</div><div className="text-sm font-semibold text-violet-300">{PHASE_LABELS[ctx!.current_phase]}</div></div>
                <div><div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Goal</div><div className="text-sm font-medium text-emerald-300 truncate" title={ctx!.active_goal}>{ctx!.active_goal || "—"}</div></div>
                <div><div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Bloc</div><div className="text-sm font-medium text-blue-300 truncate">{ctx!.bloc || "—"}</div></div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-gray-500">Allies</span><span className="text-emerald-300 font-medium">{ctx!.allies.length > 0 ? ctx!.allies.join(", ") : "None"}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-gray-500">Opponents</span><span className="text-red-300 font-medium">{ctx!.opponents.length > 0 ? ctx!.opponents.join(", ") : "None"}</span></div>
              </div>
              <div className="bg-blue-500/[0.06] border border-blue-500/15 rounded-md px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5"><span className="text-blue-400 text-[10px]">⚡</span><span className="text-[9px] text-blue-400 uppercase tracking-wider font-semibold">What To Do Right Now</span></div>
                <p className="text-xs text-blue-200/90 font-medium">{ctx!.next_action_needed || phaseActions[ctx!.current_phase] || "Review your context and set your next action."}</p>
              </div>
              {intel && intel.entries.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] pt-0.5 border-t border-gray-800/40">
                  <span className="text-gray-500"><span className="text-emerald-400 font-semibold">{intel.strongAllies.length}</span> strong allies</span>
                  {intel.riskyAllies.length > 0 && <span className="text-gray-500"><span className="text-amber-400 font-semibold">{intel.riskyAllies.length}</span> at-risk</span>}
                  <span className="text-gray-500"><span className="text-amber-400 font-semibold">{intel.swings.length}</span> swing</span>
                  <span className="text-gray-500"><span className="text-red-400 font-semibold">{intel.opponents.length}</span> opponents</span>
                  <span className="text-gray-600 ml-auto">{intel.allies.length > intel.opponents.length ? "↑ Favorable" : intel.opponents.length > intel.allies.length ? "↓ Unfavorable" : "→ Balanced"}</span>
                </div>
              )}
              {ctx!.latest_updates.length > 0 && (
                <div className="pt-0.5 border-t border-gray-800/40 space-y-0.5">
                  {ctx!.latest_updates.slice(-3).map((u, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-gray-400"><span className="text-gray-600 mt-0.5 flex-shrink-0">•</span><span>{u}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Speeches", count: activeCommittee.speeches.length, path: "/speech-builder", color: "text-blue-400" },
              { label: "Clauses", count: activeCommittee.clauses.length, path: "/clause-builder", color: "text-amber-400" },
              { label: "Countries", count: intel?.entries.length || 0, path: "/bloc-tracker", color: "text-emerald-400" },
              { label: "Negotiations", count: activeCommittee.negotiations.length, path: "/negotiation-workspace", color: "text-violet-400" },
            ].map((s) => (
              <button key={s.label} onClick={() => navigate(s.path)} className="bg-gray-900/60 border border-gray-800/40 rounded-lg py-2 text-center hover:bg-gray-800/60 hover:border-gray-700/60 transition-all group">
                <div className={`text-base font-bold ${s.color}`}>{s.count}</div>
                <div className="text-[9px] text-gray-500 group-hover:text-gray-400">{s.label}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-3">
              {/* Quick action bar */}
              <QuickActionBar />

              {hasSetup && <ApiCountryBrief country={ctx!.country} agenda={ctx!.agenda} compact />}

              <PartnerSyncPanel />

              {/* Agent Console */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-800/40 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Agent Console</span>
                  <span className="text-[10px] text-gray-600 ml-auto">Auto-routes to specialist</span>
                </div>
                <div className="p-3">
                  <div className="flex gap-2">
                    <input type="text" value={taskInput} onChange={(e) => setTaskInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmitTask()}
                      placeholder='"Write a 60s speech" · "What motions?" · "Predict vote"'
                      className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                    <button onClick={handleSubmitTask} disabled={!taskInput.trim() || agentBusy} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded-lg transition-colors">{agentBusy ? "..." : "Run"}</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {["Write a 60-second opening speech", "What motions can I use?", "Draft an operative clause", "Predict vote outcome", "Analyze my bloc"].map((q) => (
                      <button key={q} onClick={() => setTaskInput(q)} className="text-[10px] px-2 py-0.5 rounded bg-gray-800/40 text-gray-500 hover:text-gray-300 border border-gray-800/30 transition-colors">{q}</button>
                    ))}
                  </div>
                </div>
                {agentOutput && currentAgent && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{AGENT_META[currentAgent].icon}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gradient-to-r ${AGENT_META[currentAgent].color} text-white`}>{currentAgent}</span>
                      <span className="text-[10px] text-gray-600">{getRouteDescription(currentAgent)}</span>
                      <span className="ml-auto text-[10px] text-gray-600">Confidence: <span className={agentOutput.confidence === "high" ? "text-green-400" : agentOutput.confidence === "medium" ? "text-yellow-400" : "text-red-400"}>{agentOutput.confidence}</span></span>
                    </div>
                    <div className="bg-gray-800/30 border border-gray-800/40 rounded-lg p-3 max-h-72 overflow-y-auto">
                      <pre className="text-[12px] text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{agentOutput.answer}</pre>
                    </div>
                    {agentOutput.follow_up_actions.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {agentOutput.follow_up_actions.map((a, i) => (
                          <button key={i} onClick={() => setTaskInput(a)} className="text-[10px] px-2 py-0.5 rounded bg-gray-800/40 text-gray-500 hover:text-gray-300 border border-gray-800/30">{a}</button>
                        ))}
                      </div>
                    )}
                    <ExternalAIBridge prompt={taskInput} context={ctx!} compact />
                  </div>
                )}
              </div>

              <TimelineLog />
            </div>

            <div className="space-y-3">
              <BlocStability />
              <StrategicAlerts />
            </div>
          </div>

          {/* Demo: trigger sample alerts for testing */}
          {activeCommittee.alerts.length === 0 && intel && intel.entries.length > 2 && (
            <div className="text-center">
              <button onClick={() => addAlert({ severity: "info", title: "Welcome to the Command Center", description: "All systems are tracking. Press ⌘K for the command palette." })}
                className="text-[9px] text-gray-600 hover:text-gray-400 underline">
                Generate sample alert
              </button>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 text-[10px] text-gray-600">
            <div>Created {new Date(activeCommittee.createdAt).toLocaleDateString()} · Updated {new Date(activeCommittee.updatedAt).toLocaleString()}</div>
            <button onClick={() => { if (confirm("Delete this committee permanently?")) deleteCommittee(activeCommittee.id); }} className="hover:text-red-400 underline">Delete committee</button>
          </div>
        </>
      )}
    </div>
  );
}
