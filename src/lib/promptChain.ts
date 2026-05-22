// Advanced AI prompt chaining — local-first, no API calls
// Generates context-rich prompts users copy into Claude / ChatGPT / Gemini

import type { ContextPack } from "../types";

export type PromptModel = "Claude" | "ChatGPT" | "Gemini";

export interface ChainStep {
  model: PromptModel;
  task: string;
  reason: string;
}

export interface ChainTemplate {
  name: string;
  description: string;
  steps: ChainStep[];
}

export const CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    name: "Polish Speech",
    description: "Refine a speech into committee-ready, polished form.",
    steps: [
      { model: "Claude", task: "Polish this speech: improve flow, formality, and persuasive structure. Keep length similar.", reason: "Claude is best for long-form, formal drafting" },
      { model: "ChatGPT", task: "Tighten this speech for live committee delivery: cut filler, sharpen impact lines, mark pauses.", reason: "ChatGPT excels at iterative tactical refinement" },
    ],
  },
  {
    name: "Refine Clause",
    description: "Take a draft clause through legal cleanup and tactical review.",
    steps: [
      { model: "Claude", task: "Refine this operative clause for diplomatic precision and legal cleanliness. Keep it actionable.", reason: "Claude excels at formal wording" },
      { model: "ChatGPT", task: "Predict objections to this clause and suggest 2-3 amendment-resistant rewrites.", reason: "ChatGPT for tactical iteration" },
    ],
  },
  {
    name: "Bloc Analysis",
    description: "Generate full bloc strategy with cross-checking.",
    steps: [
      { model: "Gemini", task: "Synthesize a broad analysis of the current bloc landscape and cross-reference recent UN voting patterns.", reason: "Gemini for broad context and research synthesis" },
      { model: "ChatGPT", task: "Convert the analysis into 5 actionable lobbying moves I can take in the next caucus.", reason: "ChatGPT for tactical conversion" },
    ],
  },
  {
    name: "Negotiation Plan",
    description: "Build a per-country negotiation strategy.",
    steps: [
      { model: "Gemini", task: "Summarize the diplomatic context, including likely red lines and historical posture.", reason: "Gemini for synthesis" },
      { model: "ChatGPT", task: "Build a structured negotiation plan with demands, concessions, and red lines.", reason: "ChatGPT for structured tactical output" },
      { model: "Claude", task: "Write the opening talking points in formal diplomatic register.", reason: "Claude for polished delivery" },
    ],
  },
];

export const MODEL_URLS: Record<PromptModel, string> = {
  Claude: "https://claude.ai/new",
  ChatGPT: "https://chat.openai.com",
  Gemini: "https://gemini.google.com/app",
};

export const MODEL_GUIDANCE: Record<PromptModel, string> = {
  Claude: "Best for long-form drafting, polished speeches, and clause refinement",
  ChatGPT: "Best for tactical iteration, structured editing, and negotiation strategy",
  Gemini: "Best for broad context synthesis, summarization, and research",
};

export function buildPrompt(ctx: ContextPack, task: string, extraContext = ""): string {
  return `[COMMITTEE CONTEXT]
Committee: ${ctx.committee || "—"}
Agenda: ${ctx.agenda || "—"}
Country: ${ctx.country || "—"} (${ctx.role || "Delegate"})
Phase: ${ctx.current_phase.replace(/_/g, " ")}
Bloc: ${ctx.bloc || "—"}
Active Goal: ${ctx.active_goal || "—"}
Allies: ${ctx.allies.join(", ") || "none"}
Opponents: ${ctx.opponents.join(", ") || "none"}
Latest Updates: ${ctx.latest_updates.slice(-3).join(" | ") || "—"}
${extraContext ? `\n[ADDITIONAL CONTEXT]\n${extraContext}\n` : ""}
[TASK]
${task}

[STYLE]
Diplomatic, formal, concise, action-oriented. Match the register of a high-level UN debate. Output structured and ready to use.`;
}

export function suggestModelForTask(task: string): PromptModel {
  const t = task.toLowerCase();
  if (/(speech|polish|refine|formal|diplomatic|wording|rewrite)/.test(t)) return "Claude";
  if (/(summary|summarize|synthesize|research|background|context|history)/.test(t)) return "Gemini";
  return "ChatGPT"; // default for tactical
}
