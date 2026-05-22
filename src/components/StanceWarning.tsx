import type { StanceWarning as Warning } from "../lib/stance";

interface Props {
  warnings: Warning[];
  compact?: boolean;
}

export default function StanceWarning({ warnings, compact = false }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-1">
      {warnings.map((w, i) => {
        const sev = w.severity === "high" ? { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-300", icon: "⚠" } :
                    w.severity === "medium" ? { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", icon: "⚠" } :
                    { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", icon: "ℹ" };
        return (
          <div key={i} className={`flex items-start gap-1.5 px-2 py-1.5 rounded-md border ${sev.bg} ${sev.border}`}>
            <span className={`text-[10px] ${sev.text} flex-shrink-0`}>{sev.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] font-medium ${sev.text}`}>
                {w.country !== "Bloc" && `${w.country}: `}{w.reason}
              </div>
              {!compact && <div className="text-[8px] text-gray-500 uppercase tracking-wider mt-0.5">Stance check · {w.severity}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
