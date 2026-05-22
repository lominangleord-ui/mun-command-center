import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { copyToClipboard } from "../lib/exportImport";
import { applyShareCode, generateShareCode, mergeSharedCommittee } from "../lib/syncCode";
import type { StoredCommittee } from "../types";

type SyncStatus = "offline" | "pairing" | "connected" | "syncing" | "error";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const DELEGATE_SIGNALS = [
  { label: "Ask for the floor", icon: "🙋", severity: "info" as const },
  { label: "Yield time to partner", icon: "↩️", severity: "info" as const },
  { label: "Bloc breaking — check NOW", icon: "🚨", severity: "critical" as const },
  { label: "Friendly amendment incoming", icon: "✏️", severity: "warning" as const },
  { label: "Hostile amendment — defend", icon: "🛡️", severity: "critical" as const },
  { label: "Vote count looks bad — pivot", icon: "📉", severity: "warning" as const },
  { label: "Switch to drafting mode", icon: "📝", severity: "info" as const },
] as const;

export default function PartnerSyncPanel() {
  const { activeCommittee, updateCommittee, addTimelineEvent, addAlert } = useApp();
  const [status, setStatus] = useState<SyncStatus>("offline");
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [message, setMessage] = useState("Waiting for partner link");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const lastSentRef = useRef<number>(0);
  const applyingRemoteRef = useRef(false);

  const cleanup = () => {
    channelRef.current?.close();
    pcRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    setStatus("offline");
    setMessage("Disconnected");
  };

  const setupChannel = (ch: RTCDataChannel) => {
    channelRef.current = ch;
    ch.onopen = () => {
      setStatus("connected");
      setMessage("Synced with partner");
      if (activeCommittee) sendState(activeCommittee);
    };
    ch.onclose = () => { setStatus("offline"); setMessage("Partner connection closed"); };
    ch.onerror = () => { setStatus("error"); setMessage("Sync channel error"); };
    ch.onmessage = async (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        
        // Handle instantaneous silent partner signals
        if (payload.type === "delegate-signal") {
          await addAlert({
            severity: payload.severity,
            title: `Partner Signal: ${payload.label}`,
            description: `Sent silently from partner's active console. Action requested.`,
          });
          setMessage(`Received partner signal: ${payload.icon} ${payload.label}`);
          return;
        }

        if (payload.type !== "committee-state") return;
        const remote = payload.committee as StoredCommittee;
        if (!activeCommittee || remote.id !== activeCommittee.id) return;
        applyingRemoteRef.current = true;
        await updateCommittee((current) => mergeSharedCommittee(current, remote));
        applyingRemoteRef.current = false;
        setStatus("connected");
        setMessage(`Received partner update ${new Date().toLocaleTimeString()}`);
      } catch {
        setStatus("error");
        setMessage("Could not read partner sync payload");
      }
    };
  };

  const waitIce = (pc: RTCPeerConnection) => new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") resolve();
    const done = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", done);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", done);
    setTimeout(() => resolve(), 2500);
  });

  const createOffer = async () => {
    if (!activeCommittee) return;
    cleanup();
    setStatus("pairing");
    setMessage("Creating secure peer invitation");
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    setupChannel(pc.createDataChannel("mun-sync"));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIce(pc);
    const code = btoa(encodeURIComponent(JSON.stringify(pc.localDescription)));
    setOfferText(code);
    await copyToClipboard(code);
    setMessage("Invitation copied. Send it to your partner once.");
  };

  const acceptOffer = async () => {
    if (!pasteText.trim()) return;
    cleanup();
    setStatus("pairing");
    setMessage("Accepting partner invitation");
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    pc.ondatachannel = (event) => setupChannel(event.channel);
    const offer = JSON.parse(decodeURIComponent(atob(pasteText.trim())));
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitIce(pc);
    const code = btoa(encodeURIComponent(JSON.stringify(pc.localDescription)));
    setAnswerText(code);
    await copyToClipboard(code);
    setMessage("Response copied. Send it back to your partner.");
  };

  const finishPairing = async () => {
    if (!pasteText.trim() || !pcRef.current) return;
    setStatus("pairing");
    const answer = JSON.parse(decodeURIComponent(atob(pasteText.trim())));
    await pcRef.current.setRemoteDescription(answer);
    setMessage("Pairing complete. Waiting for sync channel.");
  };

  const sendState = (committee: StoredCommittee) => {
    const ch = channelRef.current;
    if (!ch || ch.readyState !== "open") return;
    setStatus("syncing");
    ch.send(JSON.stringify({ type: "committee-state", committee, sentAt: Date.now() }));
    lastSentRef.current = committee.updatedAt;
    setTimeout(() => setStatus("connected"), 500);
  };

  const sendSignal = (label: string, icon: string, severity: "info" | "warning" | "critical") => {
    const ch = channelRef.current;
    if (!ch || ch.readyState !== "open") {
      addAlert({
        severity: "warning",
        title: "Signal failed to send",
        description: "Partner session is offline. Re-establish sync to enable signaling.",
      });
      return;
    }
    ch.send(JSON.stringify({ type: "delegate-signal", label, icon, severity }));
    addTimelineEvent({
      type: "action",
      title: `Sent signal: ${label}`,
      description: "Silent operational signal pushed to partner device.",
      icon,
    });
  };

  // Automatically push local updates over the peer channel.
  useEffect(() => {
    if (!activeCommittee || applyingRemoteRef.current) return;
    if (activeCommittee.updatedAt === lastSentRef.current) return;
    const t = setTimeout(() => sendState(activeCommittee), 350);
    return () => clearTimeout(t);
  }, [activeCommittee?.updatedAt]);

  const createShareCode = async () => {
    if (!activeCommittee) return;
    const code = generateShareCode(activeCommittee);
    setShareCode(code);
    await copyToClipboard(code);
    await addTimelineEvent({ type: "export", title: "Partner sync code generated", description: "Compact state sync code copied", icon: "🔄" });
  };

  const applyCode = async () => {
    if (!activeCommittee || !pasteText.trim()) return;
    try {
      const working = structuredClone(activeCommittee) as StoredCommittee;
      const result = applyShareCode(pasteText.trim(), working);
      await updateCommittee(() => working);
      await addAlert({ severity: "info", title: "Partner sync applied", description: `${result.newBlocEntries} new countries, ${result.newClauses} clauses, ${result.newAlerts} alerts.` });
      setMessage(`Merged partner code: ${result.newBlocEntries} new countries, ${result.newClauses} clauses`);
      setPasteText("");
    } catch {
      setStatus("error");
      setMessage("Invalid partner sync code");
    }
  };

  if (!activeCommittee) return null;

  const statusClass = {
    offline: "text-gray-400 bg-gray-500/10 border-gray-500/20",
    pairing: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    connected: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    syncing: "text-blue-300 bg-blue-500/10 border-blue-500/20",
    error: "text-red-300 bg-red-500/10 border-red-500/20",
  }[status];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] shadow-tactical p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Two-Device Sync</div>
          <div className="text-[11px] text-gray-400 mt-1">{message}</div>
        </div>
        <div className={`px-2 py-1 rounded-xl border text-[9px] uppercase tracking-[0.16em] ${statusClass}`}>{status}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={createOffer} className="px-3 py-2 rounded-xl border border-blue-500/25 bg-blue-500/10 text-[10px] text-blue-200 font-medium hover:bg-blue-500/15">Create Session</button>
        <button onClick={acceptOffer} className="px-3 py-2 rounded-xl border border-violet-500/25 bg-violet-500/10 text-[10px] text-violet-200 font-medium hover:bg-violet-500/15">Join Session</button>
      </div>

      {status === "connected" && (
        <div className="space-y-1.5 pt-1.5 border-t border-gray-800/40">
          <div className="text-[9px] text-violet-400 uppercase tracking-[0.18em] font-semibold">Delegate Signal Panel</div>
          <div className="grid grid-cols-2 gap-1.5">
            {DELEGATE_SIGNALS.map((sig) => (
              <button
                key={sig.label}
                onClick={() => sendSignal(sig.label, sig.icon, sig.severity)}
                className="px-2 py-1.5 rounded-xl border border-white/6 bg-white/[0.02] text-[10px] text-left text-gray-300 hover:bg-white/[0.06] flex items-center gap-1.5 truncate"
                title={sig.label}
              >
                <span>{sig.icon}</span>
                <span className="truncate">{sig.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={3}
        placeholder="Paste partner invite / response / sync code…"
        className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2 text-[10px] text-gray-200 placeholder-gray-600 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />

      <div className="flex gap-2">
        <button onClick={finishPairing} className="flex-1 px-2 py-1.5 rounded-xl border border-white/8 bg-white/[0.04] text-[10px] text-gray-300 hover:bg-white/[0.07]">Finish Pairing</button>
        <button onClick={createShareCode} className="flex-1 px-2 py-1.5 rounded-xl border border-white/8 bg-white/[0.04] text-[10px] text-gray-300 hover:bg-white/[0.07]">Generate Code</button>
        <button onClick={applyCode} className="flex-1 px-2 py-1.5 rounded-xl border border-white/8 bg-white/[0.04] text-[10px] text-gray-300 hover:bg-white/[0.07]">Apply Code</button>
      </div>

      {(offerText || answerText || shareCode) && (
        <div className="space-y-1">
          {offerText && <CodeBox label="Invite Code" code={offerText} />}
          {answerText && <CodeBox label="Response Code" code={answerText} />}
          {shareCode && <CodeBox label="Compact Sync Code" code={shareCode} />}
        </div>
      )}
    </div>
  );
}

function CodeBox({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-gray-500 uppercase tracking-[0.18em]">{label}</span>
        <button onClick={() => copyToClipboard(code)} className="ml-auto text-[8px] text-blue-300 hover:text-blue-200">Copy</button>
      </div>
      <div className="mt-1 text-[9px] text-gray-500 font-mono truncate">{code}</div>
    </div>
  );
}
