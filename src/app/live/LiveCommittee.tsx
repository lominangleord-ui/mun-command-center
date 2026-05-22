import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { getFlag } from "../../lib/countries";
import { PHASE_LABELS, type CommitteePhase } from "../../types";
import StrategicAlerts from "../../components/StrategicAlerts";
import ApiCountryBrief from "../../features/country-intelligence/components/ApiCountryBrief";
import SpeechSignalAnalyzer from "../../components/SpeechSignalAnalyzer";
import { buildProcedureModel, estimateScrappingRisk } from "../../lib/procedureRules";

const PHASES: CommitteePhase[] = ["roll_call", "agenda_setting", "opening_speeches", "moderated_caucus", "unmoderated_caucus", "drafting", "amendment", "voting"];

export default function LiveCommittee() {
  const { activeCommittee, addNote, addTimelineEvent, addAlert, addSnapshot, updateContextPack, updateBlocEntry, addBlocEntry } = useApp();

  // Timer state — using refs for accurate ticking
  const [motionSeconds, setMotionSeconds] = useState(0);
  const [caucusSeconds, setCaucusSeconds] = useState(0);
  const [motionRunning, setMotionRunning] = useState(false);
  const [caucusRunning, setCaucusRunning] = useState(false);
  const motionRef = useRef<number | null>(null);
  const caucusRef = useRef<number | null>(null);

  // Speaking queue
  const [queue, setQueue] = useState<string[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>("");
  const [queueInput, setQueueInput] = useState("");

  // Quick note
  const [noteInput, setNoteInput] = useState("");
  const [quickCountry, setQuickCountry] = useState("");

  useEffect(() => {
    if (motionRunning) {
      motionRef.current = window.setInterval(() => setMotionSeconds((s) => s + 1), 1000);
    }
    return () => { if (motionRef.current) clearInterval(motionRef.current); };
  }, [motionRunning]);

  useEffect(() => {
    if (caucusRunning) {
      caucusRef.current = window.setInterval(() => setCaucusSeconds((s) => s + 1), 1000);
    }
    return () => { if (caucusRef.current) clearInterval(caucusRef.current); };
  }, [caucusRunning]);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first to enter Live Mode.</div>;

  const ctx = activeCommittee.contextPack;
  const procedure = buildProcedureModel(ctx, activeCommittee.blocEntries, activeCommittee.clauses);
  const scrappingRisk = estimateScrappingRisk(activeCommittee.clauses);

  const advanceSpeaker = async () => {
    if (queue.length === 0 && !currentSpeaker) {
      await addAlert({
        severity: "info",
        title: "Speaker queue is empty",
        description: "Add delegates to the queue before advancing.",
      });
      return;
    }
    if (!currentSpeaker) { setCurrentSpeaker(queue[0]); setQueue(queue.slice(1)); return; }
    const next = queue[0];
    setCurrentSpeaker(next);
    setQueue(queue.slice(1));
    addTimelineEvent({ type: "action", title: `Speaker change: ${next}`, description: `Now speaking: ${next}`, icon: "🎤" });
  };

  const addToQueue = () => {
    if (!queueInput.trim()) return;
    setQueue([...queue, queueInput.trim()]);
    setQueueInput("");
  };

  const logNote = async () => {
    if (!noteInput.trim()) return;
    await addNote({ id: Date.now().toString(), raw: noteInput, compressed: noteInput, actionItems: [], decisions: [], createdAt: Date.now() });
    await addTimelineEvent({ type: "action", title: "Quick diplomacy note", description: noteInput.slice(0, 100), icon: "📝" });
    setNoteInput("");
  };

  const emergencyNote = async () => {
    if (!noteInput.trim()) return;
    await addNote({ id: Date.now().toString(), raw: noteInput, compressed: noteInput, actionItems: [noteInput], decisions: [], createdAt: Date.now() });
    await addAlert({ severity: "critical", title: "🚨 Emergency note", description: noteInput });
    setNoteInput("");
  };

  const quickRel = async (stance: "ally" | "opponent" | "swing") => {
    if (!quickCountry.trim()) return;
    const existing = activeCommittee.blocEntries.find((e) => e.country.toLowerCase() === quickCountry.toLowerCase());
    if (existing) {
      const support = stance === "ally" ? 75 : stance === "opponent" ? 15 : 45;
      await updateBlocEntry(existing.id, { stance, supportLevel: support });
      await addAlert({ severity: stance === "opponent" ? "warning" : "info", title: `${quickCountry} now ${stance}`, description: `Relationship updated in live mode.` });
    } else {
      await addBlocEntry({
        id: Date.now().toString(), country: quickCountry.trim(), stance,
        supportLevel: stance === "ally" ? 75 : stance === "opponent" ? 15 : 45,
        riskLevel: stance === "opponent" ? 70 : stance === "swing" ? 50 : 25,
        notes: "", contactStatus: "contacted", updatedAt: Date.now(),
      });
      await addTimelineEvent({ type: "relationship", title: `${quickCountry} added as ${stance}`, description: `Quick-tagged in live mode`, icon: stance === "ally" ? "🤝" : stance === "opponent" ? "🛡" : "🔄" });
    }
    setQuickCountry("");
  };

  const setPhase = (p: CommitteePhase) => {
    updateContextPack({ ...ctx, current_phase: p });
    addTimelineEvent({ type: "system", title: `Phase: ${PHASE_LABELS[p]}`, description: `Committee moved to ${PHASE_LABELS[p]}`, icon: "📍" });
  };

  const phaseAdvice: Record<CommitteePhase, string> = {
    roll_call: "Confirm presence; quietly identify allies entering the room.",
    agenda_setting: "Lobby publicly for the agenda you can win on; trade with swings.",
    opening_speeches: "Anchor your position firmly; stake out negotiable vs non-negotiable.",
    moderated_caucus: "Tight, focused interventions. Score points, mark allies.",
    unmoderated_caucus: "🔴 Move physically. Lock alliances. Draft language now.",
    drafting: "Co-author with at least 2 strong allies; pre-circulate to swings.",
    amendment: "Defend operative core; concede preambles; identify killer amendments.",
    voting: "Vote bloc cohesion is everything. Confirm whip count one final time.",
  };

  return (
    <div className="space-y-3">
      {/* Top status strip */}
      <div className="bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-800/40 rounded-lg p-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">Live Committee</span>
        </div>
        <div className="w-px h-5 bg-gray-800" />
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getFlag(ctx.country)}</span>
          <div>
            <div className="text-sm font-bold text-white leading-tight">{ctx.country}</div>
            <div className="text-[9px] text-gray-500">{ctx.committee} · {ctx.role}</div>
          </div>
        </div>
        <div className="w-px h-5 bg-gray-800" />
        <div className="text-[11px]">
          <span className="text-gray-500">Phase: </span>
          <span className="text-violet-300 font-semibold">{PHASE_LABELS[ctx.current_phase]}</span>
        </div>
        <div className="ml-auto text-[10px] text-gray-400">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Timers */}
        <div className="col-span-12 md:col-span-4 bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-amber-400" /> Timers
          </div>
          <div className="space-y-3">
            <TimerBlock label="Motion" seconds={motionSeconds} running={motionRunning}
              onStart={() => setMotionRunning(true)}
              onStop={() => setMotionRunning(false)}
              onReset={() => { setMotionRunning(false); setMotionSeconds(0); }} />
            <TimerBlock label="Caucus" seconds={caucusSeconds} running={caucusRunning}
              onStart={() => setCaucusRunning(true)}
              onStop={() => setCaucusRunning(false)}
              onReset={() => { setCaucusRunning(false); setCaucusSeconds(0); }} />
          </div>
        </div>

        {/* Phase + Recommended Action */}
        <div className="col-span-12 md:col-span-8 bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-violet-400" /> Phase Control
          </div>
          <div className="grid grid-cols-4 gap-1 mb-3">
            {PHASES.map((p) => (
              <button key={p} onClick={() => setPhase(p)}
                className={`text-[10px] py-1.5 rounded-md border transition-all ${
                  ctx.current_phase === p
                    ? "bg-violet-500/15 border-violet-500/40 text-violet-200 font-medium"
                    : "bg-gray-800/30 border-gray-800/30 text-gray-500 hover:border-gray-700"
                }`}>
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="bg-blue-500/[0.06] border border-blue-500/20 rounded-md px-3 py-2">
            <div className="text-[9px] text-blue-400 uppercase tracking-wider font-semibold mb-1">⚡ Next Recommended Action</div>
            <div className="text-xs text-blue-200">{phaseAdvice[ctx.current_phase]}</div>
          </div>
        </div>

        {/* Procedure guardrails */}
        <div className="col-span-12 bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400" /> Procedure Guardrails
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <div className="bg-white/[0.03] border border-white/6 rounded-md p-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Quorum</div>
              <div className={`text-sm font-semibold mt-1 ${procedure.quorumMet ? "text-emerald-300" : "text-amber-300"}`}>
                {procedure.knownDelegations}/{procedure.quorumNeeded} tracked
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Double delegations count as one delegation.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/6 rounded-md p-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Best Motion Lane</div>
              <div className="text-sm font-semibold text-cyan-200 mt-1">{procedure.recommendedFormat.label}</div>
              <p className="text-[10px] text-gray-500 mt-1">{procedure.recommendedFormat.tacticalUse}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/6 rounded-md p-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Paperwork Risk</div>
              <div className={`text-sm font-semibold mt-1 ${scrappingRisk.risk === "high" ? "text-red-300" : scrappingRisk.risk === "medium" ? "text-amber-300" : "text-emerald-300"}`}>
                {scrappingRisk.risk.toUpperCase()}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{scrappingRisk.explanation}</p>
            </div>
          </div>
          <div className="mt-2 rounded-md border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-2">
            <div className="text-[9px] text-cyan-300 uppercase tracking-wider font-semibold mb-1">Procedural Advice</div>
            <p className="text-[11px] text-cyan-100/80">{procedure.phaseAdvice}</p>
            <p className="text-[10px] text-gray-500 mt-1 font-mono">{procedure.recommendedFormat.motionTemplate}</p>
          </div>
          {procedure.immediateWarnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {procedure.immediateWarnings.map((warning) => (
                <div key={warning} className="text-[10px] text-amber-200 bg-amber-500/[0.06] border border-amber-500/20 rounded-md px-2 py-1">
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Speaking queue */}
        <div className="col-span-12 md:col-span-7 bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-blue-400" /> Speaking Order
          </div>
          {currentSpeaker && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-md px-3 py-2 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-blue-200 font-semibold">Currently Speaking:</span>
              <span className="text-base">{getFlag(currentSpeaker)}</span>
              <span className="text-sm text-white font-medium">{currentSpeaker}</span>
              <button onClick={() => setCurrentSpeaker("")} className="ml-auto text-[10px] text-gray-400 hover:text-white">End</button>
            </div>
          )}
          <div className="flex gap-1.5 mb-2">
            <input type="text" value={queueInput} onChange={(e) => setQueueInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToQueue()}
              placeholder="Add country to queue…"
              className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            <button onClick={addToQueue} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium rounded-md">+ Queue</button>
            <button onClick={advanceSpeaker} disabled={queue.length === 0 && !currentSpeaker}
              className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                queue.length === 0 && !currentSpeaker
                  ? "bg-gray-800 text-gray-600 opacity-40 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}>Next →</button>
          </div>
          {queue.length === 0 ? (
            <div className="text-[10px] text-gray-600 text-center py-3">Queue is empty</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {queue.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 bg-gray-800/30 rounded-md text-xs">
                  <span className="text-[9px] text-gray-500 font-mono w-4">{i + 1}</span>
                  <span>{getFlag(c)}</span>
                  <span className="text-gray-300">{c}</span>
                  <button onClick={() => setQueue(queue.filter((_, idx) => idx !== i))} className="ml-auto text-[10px] text-gray-600 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick relationship */}
        <div className="col-span-12 md:col-span-5 bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-emerald-400" /> Quick Relationship
          </div>
          <input type="text" value={quickCountry} onChange={(e) => setQuickCountry(e.target.value)}
            placeholder="Country to tag…"
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 mb-2" />
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => quickRel("ally")} disabled={!quickCountry.trim()}
              className="py-1.5 rounded-md bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium disabled:opacity-30">
              🤝 Ally
            </button>
            <button onClick={() => quickRel("swing")} disabled={!quickCountry.trim()}
              className="py-1.5 rounded-md bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border border-amber-500/30 text-[10px] font-medium disabled:opacity-30">
              🔄 Swing
            </button>
            <button onClick={() => quickRel("opponent")} disabled={!quickCountry.trim()}
              className="py-1.5 rounded-md bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 text-[10px] font-medium disabled:opacity-30">
              🛡 Opp.
            </button>
          </div>
          <button onClick={() => addSnapshot(`Live snapshot ${new Date().toLocaleTimeString()}`)}
            className="w-full mt-2 py-1.5 rounded-md bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 text-[10px] font-medium">
            📸 Save Snapshot
          </button>
        </div>

        {/* Quick note */}
        <div className="col-span-12 bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400" /> Quick Diplomacy Note
          </div>
          <div className="flex gap-2">
            <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logNote()}
              placeholder="Type a quick observation, motion, or insight…"
              className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50" />
            <button onClick={logNote} disabled={!noteInput.trim()}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-md">
              📝 Log
            </button>
            <button onClick={emergencyNote} disabled={!noteInput.trim()}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-md" title="Logs as a critical alert">
              🚨 Emergency
            </button>
          </div>
        </div>

        {/* Live Speech Signal Analysis */}
        <div className="col-span-12 md:col-span-7">
          <SpeechSignalAnalyzer />
        </div>

        {/* Live Context/Indicators */}
        <div className="col-span-12 md:col-span-5">
          <ApiCountryBrief country={ctx.country} agenda={ctx.agenda} compact />
        </div>

        {/* Strategic alerts */}
        <div className="col-span-12">
          <StrategicAlerts />
        </div>
      </div>
    </div>
  );
}

function TimerBlock({ label, seconds, running, onStart, onStop, onReset }: {
  label: string; seconds: number; running: boolean;
  onStart: () => void; onStop: () => void; onReset: () => void;
}) {
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div className="bg-gray-800/40 rounded-md px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</span>
        <span className={`text-[8px] uppercase tracking-wider ${running ? "text-emerald-400" : "text-gray-600"}`}>
          {running ? "● Running" : "○ Stopped"}
        </span>
      </div>
      <div className={`text-2xl font-mono font-bold tabular-nums tracking-wider ${running ? "text-amber-300" : "text-gray-400"}`}>
        {fmt(seconds)}
      </div>
      <div className="flex gap-1 mt-1.5">
        {!running ? (
          <button onClick={onStart} className="flex-1 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-medium">▶ Start</button>
        ) : (
          <button onClick={onStop} className="flex-1 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-medium">⏸ Pause</button>
        )}
        <button onClick={onReset} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded text-[10px] font-medium">↺</button>
      </div>
    </div>
  );
}
