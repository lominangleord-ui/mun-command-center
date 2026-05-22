import type { ContextPack } from "../../../types";
import type { StrategicContextSnapshot, StrategicMode } from "../../strategic-context/types";

export type AIProviderId = "anthropic" | "openai" | "gemini" | "openrouter" | "openai-compatible";

export type AITaskType =
  | "country-intelligence"
  | "coalition-analysis"
  | "clause-strategy"
  | "resolution-strategy"
  | "bloc-prediction"
  | "negotiation-guidance"
  | "debate-move"
  | "chair-risk"
  | "sponsor-prediction"
  | "verification"
  | "general";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderMetadata {
  providerId: AIProviderId;
  model: string;
  gatewayUrl?: string;
  requestId?: string;
  rateLimitRemaining?: string;
  rateLimitReset?: string;
  latencyMs?: number;
  cached?: boolean;
  fallbackUsed?: boolean;
}

export interface ProviderHealth {
  ok: boolean;
  providerId: AIProviderId;
  model?: string;
  message: string;
  latencyMs?: number;
  checkedAt: string;
  sanitizedError?: string;
}

export interface ProviderError {
  providerId: AIProviderId;
  status?: number;
  code: string;
  message: string;
  retryable: boolean;
}

export interface AIRequest {
  task: AITaskType;
  messages: AIMessage[];
  context?: ContextPack;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cacheTtlMs?: number;
  strategicMode?: boolean;
  operatingMode?: StrategicMode;
  strategicContext?: StrategicContextSnapshot;
  sourceIntelBrief?: string[];
  abortSignal?: AbortSignal;
}

export interface AIResponse {
  content: string;
  provider: AIProviderId;
  model: string;
  cached: boolean;
  fallbackUsed: boolean;
  metadata: ProviderMetadata;
  confidence: "high" | "medium" | "low";
  sourceBasis: "ai" | "cache" | "fallback";
  error?: ProviderError;
}

export interface AIProvider {
  id: AIProviderId;
  name: string;
  supportsStreaming: boolean;
  supportsSystemPrompts: boolean;
  metadata: ProviderMetadata;
  testConnection(): Promise<ProviderHealth>;
  generate(input: AIRequest): Promise<AIResponse>;
}

export interface ProviderCredential {
  id: string;
  providerId: AIProviderId;
  label: string;
  model: string;
  baseUrl?: string;
  encryptedKey: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastTestedAt?: string;
  health?: "untested" | "ok" | "error";
  healthMessage?: string;
}

export interface TaskRoutingConfig {
  task: AITaskType;
  credentialId?: string;
  model?: string;
  reasoningProfile: "fast" | "balanced" | "deep";
}

export interface AIVaultState {
  version: 1;
  credentials: ProviderCredential[];
  activeCredentialId?: string;
  fallbackCredentialId?: string;
  streamingEnabled: boolean;
  internetAugmentation: boolean;
  gatewayUrl: string;
  taskRouting: TaskRoutingConfig[];
}

export interface SaveCredentialInput {
  providerId: AIProviderId;
  label: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ProviderRuntimeConfig {
  credential: ProviderCredential;
  apiKey: string;
  model?: string;
  gatewayUrl: string;
}
