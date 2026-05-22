import { useState } from "react";
import { useApp } from "../context/AppContext";

interface termOption {
  original: string;
  softAlternative: string;
  hardAlternative: string;
  reason: string;
}

const TERM_MATRIX: termOption[] = [
  {
    original: "monitoring mechanism",
    softAlternative: "voluntary review framework",
    hardAlternative: "mandatory compliance oversight commission",
    reason: "Sovereignty-sensitive developing countries (G77) react aggressively to direct 'monitoring'. EU/WEOG seek high transparency.",
  },
  {
    original: "enforcement",
    softAlternative: "cooperative capacity support",
    hardAlternative: "sanctions-tethered regulatory framework",
    reason: "Reduces intervention friction for non-aligned blocks. Use 'capacity support' to bypass P5 veto threats.",
  },
  {
    original: "sanctions",
    softAlternative: "targeted compliance incentives",
    hardAlternative: "strict multilateral embargo",
    reason: "Mitigates unilateral action pushback. Frame around constructive incentives to entice swing states.",
  },
  {
    original: "sovereign interference",
    softAlternative: "multilateral consultative action",
    hardAlternative: "legitimized humanitarian stabilization",
    reason: "Sovereignty shields are bypassed by framing interventions as mutually requested consultation. Crucial for DISEC drafts.",
  },
  {
    original: "mandatory reporting",
    softAlternative: "national progress assessments",
    hardAlternative: "externally audited annual transparency mandates",
    reason: "Excludes the threat of international sovereignty breaches. Allows states to save face while delivering baseline data.",
  },
];

export default function LanguageCompatibilityEngine() {
  const { activeCommittee } = useApp();
  const [selectedTerm, setSelectedTerm] = useState<termOption | null>(null);

  if (!activeCommittee) return null;

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider font-mono">Language Compatibility Engine</span>
      </div>
      <p className="text-[10px] text-gray-500 leading-normal">
        Select contentious terminology to see safe diplomatic alternatives versus hardline framing designed to maintain sovereign or institutional weight.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {TERM_MATRIX.map((term) => (
          <button
            key={term.original}
            onClick={() => setSelectedTerm(selectedTerm?.original === term.original ? null : term)}
            className={`text-left p-2 rounded-xl border text-[10px] transition-all truncate ${
              selectedTerm?.original === term.original
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : "bg-white/[0.02] border-white/6 text-gray-400 hover:border-white/10 hover:text-white"
            }`}
          >
            {term.original}
          </button>
        ))}
      </div>

      {selectedTerm && (
        <div className="mt-2 p-2.5 bg-black/40 border border-white/6 rounded-xl space-y-2 text-[10px] panel-enter">
          <div className="text-gray-400 italic">"{selectedTerm.reason}"</div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="p-2 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-md">
              <div className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Soft / Compromise Framing</div>
              <div className="text-white mt-1">"{selectedTerm.softAlternative}"</div>
            </div>
            <div className="p-2 bg-rose-500/[0.03] border border-rose-500/15 rounded-md">
              <div className="text-[8px] text-rose-400 font-bold uppercase tracking-wider">Hardline / Institutional Framing</div>
              <div className="text-white mt-1">"{selectedTerm.hardAlternative}"</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
