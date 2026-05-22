import type { AIProviderId, AITaskType, TaskRoutingConfig } from "./types";

export interface ProviderDefinition {
  id: AIProviderId;
  name: string;
  defaultModel: string;
  placeholder: string;
  baseUrl?: string;
  supportsStreaming: boolean;
  supportsSystemPrompts: boolean;
  modelHints: string[];
}

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    defaultModel: "claude-3-5-sonnet-latest",
    placeholder: "sk-ant-...",
    supportsStreaming: true,
    supportsSystemPrompts: true,
    modelHints: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4.1",
    placeholder: "sk-...",
    supportsStreaming: true,
    supportsSystemPrompts: true,
    modelHints: ["gpt-4.1", "gpt-4o", "gpt-4.1-mini"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    defaultModel: "gemini-1.5-pro",
    placeholder: "AIza...",
    supportsStreaming: true,
    supportsSystemPrompts: true,
    modelHints: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    defaultModel: "anthropic/claude-3.5-sonnet",
    placeholder: "sk-or-...",
    baseUrl: "https://openrouter.ai/api/v1",
    supportsStreaming: true,
    supportsSystemPrompts: true,
    modelHints: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "deepseek/deepseek-chat", "mistralai/mistral-large"],
  },
  {
    id: "openai-compatible",
    name: "OpenAI-Compatible",
    defaultModel: "custom-model",
    placeholder: "provider key",
    supportsStreaming: true,
    supportsSystemPrompts: true,
    modelHints: ["mistral-large", "deepseek-chat", "llama-3.1-70b", "custom-model"],
  },
];

export const DEFAULT_TASK_ROUTING: TaskRoutingConfig[] = [
  { task: "debate-move", reasoningProfile: "fast" },
  { task: "chair-risk", reasoningProfile: "fast" },
  { task: "country-intelligence", reasoningProfile: "deep" },
  { task: "coalition-analysis", reasoningProfile: "deep" },
  { task: "clause-strategy", reasoningProfile: "deep" },
  { task: "sponsor-prediction", reasoningProfile: "balanced" },
  { task: "negotiation-guidance", reasoningProfile: "balanced" },
  { task: "verification", reasoningProfile: "balanced" },
  { task: "general", reasoningProfile: "balanced" },
];

export function getProviderDefinition(id: AIProviderId): ProviderDefinition {
  return PROVIDER_DEFINITIONS.find((p) => p.id === id) || PROVIDER_DEFINITIONS[0];
}

export function taskLabel(task: AITaskType): string {
  return task.replace(/-/g, " ");
}
