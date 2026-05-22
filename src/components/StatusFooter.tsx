import { useApp } from "../context/AppContext";
import { useEffect, useState } from "react";

export default function StatusFooter() {
  const { lastSavedAt, activeCommittee } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!activeCommittee) return null;

  const ago = lastSavedAt ? Math.floor((now - lastSavedAt) / 1000) : null;
  const agoText = ago === null ? "—" : ago < 5 ? "just now" : ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;

  return (
    <div className="flex items-center gap-3 px-3 py-1 border-t border-gray-800/60 bg-gray-950/60 text-[9px] text-gray-500 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${ago !== null && ago < 10 ? "bg-emerald-500" : "bg-gray-600"} animate-pulse`} />
        <span>Local-first · Autosaved {agoText}</span>
      </div>
      <div className="text-gray-600">·</div>
      <div>{activeCommittee.timeline.length} log entries</div>
      <div className="text-gray-600">·</div>
      <div>{activeCommittee.snapshots.length} snapshots</div>
      <div className="text-gray-600">·</div>
      <div>{activeCommittee.memories.length} memories</div>
      <div className="ml-auto text-gray-600">{new Date().toLocaleTimeString()}</div>
    </div>
  );
}
