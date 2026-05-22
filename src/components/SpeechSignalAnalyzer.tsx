import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { EvidenceBasis } from "../api/models/dossier";

interface SignalItem {
  basis: EvidenceBasis;
  type: string;
  claim: string;
  action: string;
}

export default function SpeechSignalAnalyzer() {
  const { activeCommittee, addTimelineEvent, addAlert } = useApp();
  const [speechText, setSpeechText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [signals, setSignals] = useState<SignalItem[]>([]);

  if (!activeCommittee) return null;

  const handleAnalyze = async () => {
    if (!speechText.trim()) return;
    setAnalyzing(true);

    // Local-first deterministic linguistic heuristics
    const text = speechText.toLowerCase();
    const computed: SignalItem[] = [];

    if (text.includes("sovereignty") || text.includes("territorial") || text.includes("domestic")) {
      computed.push({
        basis: "CONTRADICTION",
        type: "Sovereignty Anchor",
        claim: "Delegation repeated sovereignty or non-interference vocabulary.",
        action: "Expect heavy resistance to mandatory external monitoring. Shift compromise language toward voluntary reporting.",
      });
    }

    if (text.includes("enforce") || text.includes("compliance") || text.includes("must")) {
      computed.push({
        basis: "INFERENCE",
        type: "Enforcement Push",
        claim: "Delegation is signaling a hardline compliance stance.",
        action: "Check if they are G77. If so, exploit the gap by tethers to development aid or direct financing.",
      });
    }

    if (text.includes("cooperate") || text.includes("compromise") || text.includes("willing")) {
      computed.push({
        basis: "RECOMMENDATION",
        type: "Compromise Signal",
        claim: "Explicit concession vocabulary detected.",
        action: "Approach them immediately in the next unmoderated caucus with a specific, pre-drafted compromise clause.",
      });
    }

    if (text.includes("sponsor") || text.includes("author") || text.includes("submit")) {
      computed.push({
        basis: "RECOMMENDATION",
        type: "Sponsor Fishing",
        claim: "Delegation is actively fishing for resolution co-authors.",
        action: "If they align on at least two of your strategic interests, offer co-sponsorship in exchange for clause control.",
      });
    }

    if (computed.length === 0) {
      computed.push({
        basis: "UNCERTAIN",
        type: "Low-Signal Speech",
        claim: "Speech uses general diplomatic or standard committee filler with no clear strategic markers.",
        action: "Observe their prior behavior, check regional voting alignment, and run a GDELT news search to establish a baseline.",
      });
    }

    setSignals(computed);
    setAnalyzing(false);

    await addTimelineEvent({
      type: "intelligence",
      title: "Speech signals analyzed",
      description: `Detected ${computed.filter(c => c.basis !== "UNCERTAIN").length} strategic cues.`,
      icon: "🎤",
    });
    if (computed.some(c => c.basis === "CONTRADICTION" || c.basis === "RECOMMENDATION")) {
      await addAlert({
        severity: "info",
        title: "Speech Strategy Cue",
        description: "New actionable strategy indicators extracted from live speech.",
      });
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider font-mono">Speech Signal Analysis Engine</span>
      </div>
      <p className="text-[10px] text-gray-500 leading-normal">
        Paste transcripts of live speeches to extract tone shifts, co-sponsor fishing, and procedural indicators.
      </p>
      <textarea
        value={speechText}
        onChange={(e) => setSpeechText(e.target.value)}
        placeholder="Paste speech transcript here..."
        rows={3}
        className="w-full bg-black/30 border border-gray-700/50 rounded-md p-2.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none font-mono"
      />
      <button
        onClick={handleAnalyze}
        disabled={analyzing || !speechText.trim()}
        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-[11px] font-medium rounded-md transition-colors"
      >
        {analyzing ? "Analyzing Cues..." : "🔍 Analyze Speech Cues"}
      </button>

      {signals.length > 0 && (
        <div className="space-y-2 mt-2 pt-2 border-t border-gray-800/40">
          {signals.map((item, idx) => {
            const badgeClass =
              item.basis === "CONTRADICTION" ? "bg-rose-500/15 text-rose-300 border-rose-500/25" :
              item.basis === "RECOMMENDATION" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" :
              item.basis === "INFERENCE" ? "bg-amber-500/15 text-amber-300 border-amber-500/25" :
              "bg-gray-500/15 text-gray-400 border-gray-500/25";
            return (
              <div key={idx} className="bg-gray-950/40 border border-gray-800/40 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[7px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${badgeClass}`}>{item.basis}</span>
                  <span className="text-[9px] font-semibold text-white uppercase tracking-wider">{item.type}</span>
                </div>
                <p className="text-[10px] text-gray-300">{item.claim}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed"><span className="text-amber-400 font-medium">▸ Tactical Rec:</span> {item.action}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
