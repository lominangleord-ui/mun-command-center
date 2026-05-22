import type { StoredCommittee } from "../../types";
import type { MemorySignal } from "./types";

export function extractMemorySignals(committee: StoredCommittee): MemorySignal[] {
  const timelineSignals = committee.timeline.slice(0, 14).map((event, index) => ({
    label: event.title,
    detail: event.description,
    weight: Math.max(35, 90 - index * 4),
    freshness: "recent" as const,
  }));
  const updateSignals = committee.contextPack.latest_updates.slice(-8).map((detail, index) => ({
    label: "Live update",
    detail,
    weight: 65 + index,
    freshness: "session" as const,
  }));
  const pinned = committee.memories.slice(0, 6).map((detail) => ({
    label: "Pinned memory",
    detail: detail.slice(0, 320),
    weight: 72,
    freshness: "session" as const,
  }));
  return [...timelineSignals, ...updateSignals, ...pinned]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 22);
}

export function compressSignals(signals: MemorySignal[]): string {
  if (!signals.length) return "No live committee memory recorded yet.";
  return signals
    .slice(0, 12)
    .map((signal) => `[${signal.freshness}; w=${signal.weight}] ${signal.label}: ${signal.detail}`)
    .join("\n");
}
