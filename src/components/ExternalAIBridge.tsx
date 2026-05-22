import { useState } from "react";
import type { ContextPack } from "../types";
import { copyToClipboard } from "../lib/exportImport";
import { buildPrompt, suggestModelForTask, MODEL_URLS, MODEL_GUIDANCE, CHAIN_TEMPLATES, type PromptModel } from "../lib/promptChain";

interface ExternalAIBridgeProps {
  prompt: string;
  context: ContextPack;
  suggestedModel?: PromptModel;
  extraContext?: string;
  compact?: boolean;
}

export default function ExternalAIBridge({ prompt, context, suggestedModel, extraContext, compact = false }: ExternalAIBridgeProps) {
  const [open, setOpen] = useState(!compact);
  const [chain, setChain] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const auto = suggestedModel || suggestModelForTask(prompt);
  const fullPrompt = editedPrompt ?? buildPrompt(context, prompt, extraContext);

  const copy = async (text: string, label: string) => {
    if (await copyToClipboard(text)) {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  const openExternal = async (model: PromptModel) => {
    const success = await copyToClipboard(fullPrompt);
    if (!success) {
      setShowFallback(true);
      return;
    }
    window.open(MODEL_URLS[model], "_blank", "noopener");
    setCopied(model);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-purple-400" />
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">External AI Bridge</span>
          <span className="text-[8px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{auto} suggested</span>
        </div>
        <span className="text-gray-500 text-[10px]">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-800/40">
          {/* Quick model launch */}
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {(["Claude", "ChatGPT", "Gemini"] as PromptModel[]).map((m) => {
              const opRole = m === "Claude" ? "Primary Drafter" : m === "ChatGPT" ? "Tactical Editor" : "Research Synth";
              return (
                <button key={m} onClick={() => openExternal(m)}
                  title={MODEL_GUIDANCE[m]}
                  className={`group relative px-2 py-2 rounded-md text-[10px] font-medium border transition-all text-left ${
                    auto === m
                      ? "bg-purple-500/10 border-purple-500/40 text-purple-200"
                      : "bg-gray-800/40 border-gray-800/40 text-gray-400 hover:border-gray-700 hover:bg-gray-800"
                  } ${copied === m ? "ring-1 ring-emerald-500/40" : ""}`}>
                  <div className="font-semibold text-white text-[11px]">{opRole}</div>
                  <div className="text-[8px] text-gray-500 font-mono mt-0.5">Engine: {m}</div>
                  {auto === m && <div className="text-[7px] uppercase tracking-widest text-purple-400 mt-1">Suggested Role</div>}
                  {copied === m && <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/90 rounded-md text-white text-[10px] font-medium">✓ Hand-off</div>}
                </button>
              );
            })}
          </div>

          {/* Copy + edit prompt */}
          <div className="flex gap-1.5">
            <button onClick={() => copy(fullPrompt, "prompt")}
              className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium border transition-colors ${copied === "prompt" ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" : "bg-gray-800/40 text-gray-400 border-gray-800/40 hover:bg-gray-800"}`}>
              {copied === "prompt" ? "✓ Copied" : "📋 Copy Prompt"}
            </button>
            <button onClick={() => setEditedPrompt(editedPrompt === null ? fullPrompt : null)}
              className="px-2 py-1.5 rounded-md text-[10px] font-medium bg-gray-800/40 text-gray-400 border border-gray-800/40 hover:bg-gray-800 transition-colors">
              {editedPrompt === null ? "Edit" : "Reset"}
            </button>
          </div>

          {editedPrompt !== null && (
            <textarea value={editedPrompt} onChange={(e) => setEditedPrompt(e.target.value)} rows={6}
              className="w-full bg-gray-950 border border-gray-800/60 rounded-md p-2 text-[10px] text-gray-300 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/40" />
          )}

          {/* Clipboard fallback */}
          {showFallback && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2.5">
              <div className="text-[10px] text-amber-300 mb-1.5 font-medium">Clipboard access denied — copy manually:</div>
              <textarea readOnly value={fullPrompt} rows={5}
                className="w-full bg-gray-950/60 border border-gray-800/40 rounded-md p-2 text-[10px] text-gray-300 font-mono resize-none" />
              <button onClick={() => { setShowFallback(false); }} className="text-[9px] text-gray-500 hover:text-gray-300 mt-1">Dismiss</button>
            </div>
          )}

          {/* Chain templates */}
          <div className="border-t border-gray-800/40 pt-2">
            <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Prompt Chains</div>
            <div className="grid grid-cols-2 gap-1.5">
              {CHAIN_TEMPLATES.map((t) => (
                <button key={t.name} onClick={() => setChain(chain === t.name ? null : t.name)}
                  className={`text-left px-2 py-1.5 rounded-md text-[10px] border transition-colors ${chain === t.name ? "bg-purple-500/10 border-purple-500/40 text-purple-200" : "bg-gray-800/30 border-gray-800/40 text-gray-400 hover:border-gray-700"}`}>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[8px] text-gray-500 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
            {chain && (() => {
              const tpl = CHAIN_TEMPLATES.find((t) => t.name === chain);
              if (!tpl) return null;
              return (
                <div className="mt-2 space-y-1.5">
                  {tpl.steps.map((step, i) => {
                    const stepPrompt = buildPrompt(context, step.task, extraContext);
                    return (
                      <div key={i} className="bg-gray-950/50 border border-gray-800/40 rounded-md p-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">Step {i + 1}</span>
                          <span className="text-[10px] text-white font-medium">{step.model}</span>
                          <span className="text-[8px] text-gray-500 ml-auto">{step.reason}</span>
                        </div>
                        <div className="text-[10px] text-gray-400">{step.task}</div>
                        <div className="flex gap-1">
                          <button onClick={() => copy(stepPrompt, `step-${i}`)}
                            className={`text-[9px] px-1.5 py-0.5 rounded border ${copied === `step-${i}` ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" : "bg-gray-800 text-gray-400 border-gray-800/40 hover:bg-gray-700"}`}>
                            {copied === `step-${i}` ? "✓" : "Copy"}
                          </button>
                          <a href={MODEL_URLS[step.model]} target="_blank" rel="noopener"
                            onClick={() => copy(stepPrompt, `step-${i}`)}
                            className="text-[9px] px-1.5 py-0.5 rounded border bg-gray-800 text-gray-400 border-gray-800/40 hover:bg-gray-700">
                            Open {step.model} →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
