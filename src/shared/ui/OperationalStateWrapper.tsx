import type { ReactNode } from "react";
import type { FreshnessInfo } from "../../types";

interface Props {
  freshness?: FreshnessInfo;
  isError?: boolean;
  children: ReactNode;
}

export function OperationalStateWrapper({ freshness, isError, children }: Props) {
  const isStale = freshness?.cacheStatus === "stale" || freshness?.cacheStatus === "unavailable" || isError;

  return (
    <div className={`relative rounded-xl border transition-all ${
      isStale ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.02)_10px,rgba(245,158,11,0.02)_20px)] border-amber-500/30" : "bg-white/[0.02] border-white/10"
    }`}>
      {isStale && (
        <div className="absolute top-0 right-0 -mt-2 -mr-2 flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-amber-500/40 rounded shadow-lg z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-400">
            {isError ? "Degraded Mode" : "Offline Context"}
          </span>
          <span className="text-[8px] text-gray-500 ml-1">
            {freshness ? describeFreshness(freshness) : "No live connection"}
          </span>
        </div>
      )}
      <div className={isStale ? "opacity-90 grayscale-[0.2]" : ""}>
        {children}
      </div>
    </div>
  );
}

function describeFreshness(freshness: FreshnessInfo): string {
  if (!freshness.ageMs) return freshness.cacheStatus;
  const minutes = Math.floor(freshness.ageMs / 60000);
  if (minutes < 5) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
