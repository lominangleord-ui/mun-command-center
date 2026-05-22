import type {
  AIProvider,
  AIProviderId,
  AIRequest,
  AIResponse,
  ProviderHealth,
  ProviderRuntimeConfig,
} from "../models/types";
import { getProviderDefinition } from "../models/providers";
import { sendGatewayRequest, sanitizeProviderError } from "../gateway/aiGatewayClient";

function confidenceFromContent(content: string): AIResponse["confidence"] {
  if (!content.trim()) return "low";
  if (/uncertain|insufficient|low confidence/i.test(content)) return "low";
  if (/inference|projection|mixed confidence/i.test(content)) return "medium";
  return "high";
}

abstract class GatewayProvider implements AIProvider {
  id: AIProviderId;
  name: string;
  supportsStreaming: boolean;
  supportsSystemPrompts: boolean;
  metadata: AIProvider["metadata"];
  protected config: ProviderRuntimeConfig;

  constructor(id: AIProviderId, config: ProviderRuntimeConfig) {
    const def = getProviderDefinition(id);
    this.id = id;
    this.name = def.name;
    this.supportsStreaming = def.supportsStreaming;
    this.supportsSystemPrompts = def.supportsSystemPrompts;
    this.config = config;
    this.metadata = {
      providerId: id,
      model: config.model || config.credential.model,
      gatewayUrl: config.gatewayUrl,
    };
  }

  async generate(input: AIRequest): Promise<AIResponse> {
    const model = input.model || this.config.model || this.config.credential.model;
    const { data, latencyMs } = await sendGatewayRequest(this.config.gatewayUrl, {
      providerId: this.id,
      apiKey: this.config.apiKey,
      model,
      baseUrl: this.config.credential.baseUrl,
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens || 1200,
    }, input.abortSignal);

    return {
      content: data.content || "",
      provider: this.id,
      model,
      cached: false,
      fallbackUsed: false,
      sourceBasis: "ai",
      confidence: confidenceFromContent(data.content || ""),
      metadata: {
        providerId: this.id,
        model,
        gatewayUrl: this.config.gatewayUrl,
        latencyMs,
        requestId: data.requestId,
        rateLimitRemaining: data.rateLimitRemaining,
        rateLimitReset: data.rateLimitReset,
      },
    };
  }

  async testConnection(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    const start = performance.now();
    try {
      await this.generate({
        task: "general",
        messages: [
          { role: "system", content: "Reply with OK only." },
          { role: "user", content: "Connection test." },
        ],
        maxTokens: 16,
        temperature: 0,
        cacheTtlMs: 0,
      });
      return {
        ok: true,
        providerId: this.id,
        model: this.config.model || this.config.credential.model,
        message: "Gateway connection OK",
        latencyMs: Math.round(performance.now() - start),
        checkedAt,
      };
    } catch (error) {
      return {
        ok: false,
        providerId: this.id,
        model: this.config.model || this.config.credential.model,
        message: "Gateway connection failed",
        latencyMs: Math.round(performance.now() - start),
        checkedAt,
        sanitizedError: sanitizeProviderError(error),
      };
    }
  }
}

export class AnthropicProvider extends GatewayProvider {
  constructor(config: ProviderRuntimeConfig) { super("anthropic", config); }
}

export class OpenAIProvider extends GatewayProvider {
  constructor(config: ProviderRuntimeConfig, id: AIProviderId = "openai") { super(id, config); }
}

export class GeminiProvider extends GatewayProvider {
  constructor(config: ProviderRuntimeConfig) { super("gemini", config); }
}

export function createProvider(config: ProviderRuntimeConfig): AIProvider {
  switch (config.credential.providerId) {
    case "anthropic": return new AnthropicProvider(config);
    case "gemini": return new GeminiProvider(config);
    case "openrouter": return new OpenAIProvider(config, "openrouter");
    case "openai-compatible": return new OpenAIProvider(config, "openai-compatible");
    case "openai":
    default: return new OpenAIProvider(config, "openai");
  }
}
