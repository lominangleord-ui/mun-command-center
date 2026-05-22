import { useMemo, useState } from "react";
import { PROVIDER_DEFINITIONS, DEFAULT_TASK_ROUTING, getProviderDefinition, taskLabel } from "../../lib/ai/models/providers";
import type { AIProviderId, AIVaultState, TaskRoutingConfig } from "../../lib/ai/models/types";
import {
  clearVault,
  getVaultState,
  maskSecret,
  removeCredential,
  saveCredential,
  saveVaultState,
  setActiveCredential,
  setFallbackCredential,
  setVaultOptions,
} from "../../lib/ai/vault/apiVault";
import { aiOrchestrator } from "../../lib/ai/orchestration/aiOrchestrator";
import { checkGatewayHealth } from "../../lib/ai/gateway/aiGatewayClient";

const inputClass = "w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40";

export default function AiSettings() {
  const [vault, setVault] = useState<AIVaultState>(() => getVaultState());
  const [providerId, setProviderId] = useState<AIProviderId>("anthropic");
  const provider = getProviderDefinition(providerId);
  const [label, setLabel] = useState(provider.name);
  const [model, setModel] = useState(provider.defaultModel);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [gatewayTesting, setGatewayTesting] = useState(false);
  const [notice, setNotice] = useState<string>("");

  const active = useMemo(() => vault.credentials.find((cred) => cred.id === vault.activeCredentialId), [vault]);
  const fallback = useMemo(() => vault.credentials.find((cred) => cred.id === vault.fallbackCredentialId), [vault]);

  const reload = () => setVault(getVaultState());

  const handleProviderChange = (next: AIProviderId) => {
    const def = getProviderDefinition(next);
    setProviderId(next);
    setLabel(def.name);
    setModel(def.defaultModel);
    setBaseUrl(def.baseUrl || "");
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setNotice("Paste a provider key before saving.");
      return;
    }
    if (providerId === "openai-compatible" && !baseUrl.trim()) {
      setNotice("OpenAI-compatible providers need a base URL.");
      return;
    }
    await saveCredential({ providerId, label, apiKey, model, baseUrl });
    setApiKey("");
    setNotice("Provider saved. The raw key is no longer displayed.");
    reload();
  };

  const testCredential = async (id: string) => {
    const credential = vault.credentials.find((cred) => cred.id === id);
    if (!credential) return;
    setBusyId(id);
    const health = await aiOrchestrator.testCredential(credential);
    setNotice(`${credential.label}: ${health.ok ? "connection OK" : health.sanitizedError || health.message}`);
    setBusyId(null);
    reload();
  };

  const testGateway = async () => {
    setGatewayTesting(true);
    const health = await checkGatewayHealth(vault.gatewayUrl);
    setNotice(health.ok
      ? `Gateway OK: ${health.service || "mun-ai-gateway"} (uptime ${Math.round((health.uptimeMs || 0) / 1000)}s)`
      : `Gateway check failed: ${health.error || "unknown error"}`);
    setGatewayTesting(false);
  };

  const updateRouting = (task: TaskRoutingConfig["task"], updates: Partial<TaskRoutingConfig>) => {
    const nextRouting = (vault.taskRouting.length ? vault.taskRouting : DEFAULT_TASK_ROUTING).map((route) =>
      route.task === task ? { ...route, ...updates } : route
    );
    setVaultOptions({ taskRouting: nextRouting });
    reload();
  };

  const clearAll = () => {
    clearVault();
    saveVaultState({ ...getVaultState(), credentials: [] });
    setNotice("AI vault cleared from this browser.");
    reload();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">AI Providers</h1>
          <p className="text-[11px] text-gray-500">Provider-agnostic intelligence routing, local encrypted key vault, model routing, gateway transport, and failover.</p>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-500">
          <span className="px-2 py-1 rounded-lg border border-white/8 bg-white/[0.03]">Active: {active?.label || "none"}</span>
          <span className="px-2 py-1 rounded-lg border border-white/8 bg-white/[0.03]">Fallback: {fallback?.label || "none"}</span>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[10px] text-blue-200">{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4">
        <section className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.62),rgba(15,23,42,0.62))] p-4 shadow-tactical space-y-3">
          <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Add Provider</h2>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <label className="block text-[9px] text-cyan-300 uppercase tracking-[0.22em] font-semibold mb-1">AI Gateway URL</label>
            <input
              value={vault.gatewayUrl}
              onChange={(e) => { setVaultOptions({ gatewayUrl: e.target.value }); reload(); }}
              placeholder="/api/ai/generate"
              className={inputClass}
            />
            <p className="mt-1 text-[9px] text-gray-500">The browser calls this gateway only. Use `/api/ai/generate` on Vercel deployments, or `http://127.0.0.1:8787/api/ai/generate` for local gateway dev.</p>
            <div className="mt-2">
              <button onClick={testGateway} disabled={gatewayTesting} className="px-2 py-1 rounded-lg text-[9px] border border-white/8 bg-white/[0.03] text-gray-400 hover:text-gray-200">
                {gatewayTesting ? "Testing gateway" : "Test gateway"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">Provider</label>
              <select value={providerId} onChange={(e) => handleProviderChange(e.target.value as AIProviderId)} className={inputClass}>
                {PROVIDER_DEFINITIONS.map((def) => <option key={def.id} value={def.id}>{def.name}</option>)}
              </select>
            </div>
            <TextField label="Label" value={label} onChange={setLabel} placeholder="Reasoning provider" />
            <TextField label="Model" value={model} onChange={setModel} placeholder={provider.defaultModel} />
            {(providerId === "openai-compatible" || providerId === "openrouter") && (
              <TextField label="Base URL" value={baseUrl} onChange={setBaseUrl} placeholder={provider.baseUrl || "https://provider.example/v1"} />
            )}
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={provider.placeholder} className={inputClass} />
            <p className="mt-1 text-[9px] text-gray-600">Keys are encrypted before local persistence and never rendered after save.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSave} className="px-3 py-1.5 rounded-xl text-[10px] font-medium bg-blue-600 hover:bg-blue-500 text-white">Save Provider</button>
            <button onClick={() => { setApiKey(""); setNotice(""); }} className="px-3 py-1.5 rounded-xl text-[10px] font-medium bg-white/[0.04] border border-white/8 text-gray-400 hover:text-gray-200">Clear Input</button>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/15 p-3">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-2">Model Hints</div>
            <div className="flex flex-wrap gap-1.5">
              {provider.modelHints.map((hint) => (
                <button key={hint} onClick={() => setModel(hint)} className="px-2 py-1 rounded-lg border border-white/8 bg-white/[0.03] text-[9px] text-gray-400 hover:text-gray-200">{hint}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.62),rgba(15,23,42,0.62))] p-4 shadow-tactical space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Saved Providers</h2>
            <button onClick={clearAll} className="text-[9px] text-gray-600 hover:text-red-300">Clear Vault</button>
          </div>
          <div className="space-y-2">
            {vault.credentials.length === 0 && <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-[11px] text-gray-500">No providers saved. Local heuristics remain active.</div>}
            {vault.credentials.map((credential) => (
              <div key={credential.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-white font-medium">{credential.label}</div>
                    <div className="text-[10px] text-gray-500">{getProviderDefinition(credential.providerId).name} · {credential.model} · {maskSecret("saved-key")}</div>
                    <div className={`mt-1 text-[9px] ${credential.health === "ok" ? "text-emerald-300" : credential.health === "error" ? "text-red-300" : "text-gray-500"}`}>
                      {credential.health || "untested"}{credential.healthMessage ? `: ${credential.healthMessage}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button onClick={() => { setActiveCredential(credential.id); reload(); }} className={`px-2 py-1 rounded-lg text-[9px] border ${vault.activeCredentialId === credential.id ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/[0.03] border-white/8 text-gray-400"}`}>Active</button>
                    <button onClick={() => { setFallbackCredential(credential.id); reload(); }} className={`px-2 py-1 rounded-lg text-[9px] border ${vault.fallbackCredentialId === credential.id ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-white/[0.03] border-white/8 text-gray-400"}`}>Fallback</button>
                    <button onClick={() => testCredential(credential.id)} disabled={busyId === credential.id} className="px-2 py-1 rounded-lg text-[9px] border border-white/8 bg-white/[0.03] text-gray-400 hover:text-gray-200">{busyId === credential.id ? "Testing" : "Test"}</button>
                    <button onClick={() => { removeCredential(credential.id); reload(); }} className="px-2 py-1 rounded-lg text-[9px] border border-white/8 bg-white/[0.03] text-gray-500 hover:text-red-300">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,29,51,0.62),rgba(15,23,42,0.62))] p-4 shadow-tactical space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Task Routing</h2>
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={vault.internetAugmentation} onChange={(e) => { setVaultOptions({ internetAugmentation: e.target.checked }); reload(); }} /> Internet augmentation</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={vault.streamingEnabled} onChange={(e) => { setVaultOptions({ streamingEnabled: e.target.checked }); reload(); }} /> Streaming when available</label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {(vault.taskRouting.length ? vault.taskRouting : DEFAULT_TASK_ROUTING).map((route) => (
            <div key={route.task} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2">
              <div className="text-[11px] text-white capitalize">{taskLabel(route.task)}</div>
              <select value={route.credentialId || ""} onChange={(e) => updateRouting(route.task, { credentialId: e.target.value || undefined })} className={inputClass}>
                <option value="">Use active provider</option>
                {vault.credentials.map((cred) => <option key={cred.id} value={cred.id}>{cred.label}</option>)}
              </select>
              <input value={route.model || ""} onChange={(e) => updateRouting(route.task, { model: e.target.value || undefined })} placeholder="Model override" className={inputClass} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </div>
  );
}
