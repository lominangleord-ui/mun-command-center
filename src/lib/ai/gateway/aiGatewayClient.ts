import type { AIMessage, AIProviderId, ProviderError } from "../models/types";

export interface GatewayAIRequest {
  providerId: AIProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface GatewayAIResponse {
  content: string;
  requestId?: string;
  rateLimitRemaining?: string;
  rateLimitReset?: string;
}

export interface GatewayHealthResponse {
  ok: boolean;
  service?: string;
  uptimeMs?: number;
  port?: number;
  time?: string;
  error?: string;
}

export function sanitizeProviderError(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value || "AI gateway request failed");
  return text
    .replace(/sk-[a-zA-Z0-9_\-]{8,}/g, "sk-...")
    .replace(/sk-ant-[a-zA-Z0-9_\-]{8,}/g, "sk-ant-...")
    .replace(/sk-or-[a-zA-Z0-9_\-]{8,}/g, "sk-or-...")
    .replace(/AIza[a-zA-Z0-9_\-]{8,}/g, "AIza...");
}

export async function sendGatewayRequest(
  gatewayUrl: string,
  input: GatewayAIRequest,
  abortSignal?: AbortSignal,
): Promise<{ data: GatewayAIResponse; latencyMs: number }> {
  if (!gatewayUrl.trim()) {
    throw {
      providerId: input.providerId,
      code: "GATEWAY_NOT_CONFIGURED",
      message: "No AI gateway URL is configured.",
      retryable: false,
    } satisfies ProviderError;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  const relayAbort = () => controller.abort();
  abortSignal?.addEventListener("abort", relayAbort, { once: true });
  const start = performance.now();

  try {
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(input),
    });
    const text = await res.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
    if (!res.ok || json.ok === false) {
      throw {
        providerId: input.providerId,
        status: res.status,
        code: json.code || `GATEWAY_${res.status}`,
        message: sanitizeProviderError(json.error || json.message || `Gateway HTTP ${res.status}`),
        retryable: res.status === 408 || res.status === 409 || res.status === 429 || res.status >= 500,
      } satisfies ProviderError;
    }
    return { data: json, latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    if ((error as ProviderError).code) throw error;
    throw {
      providerId: input.providerId,
      code: "GATEWAY_REQUEST_FAILED",
      message: sanitizeProviderError(error),
      retryable: true,
    } satisfies ProviderError;
  } finally {
    window.clearTimeout(timeout);
    abortSignal?.removeEventListener("abort", relayAbort);
  }
}

function toHealthUrl(gatewayUrl: string): string {
  try {
    const parsed = new URL(gatewayUrl, window.location.origin);
    if (parsed.pathname.endsWith("/api/ai/generate")) {
      parsed.pathname = parsed.pathname.replace(/\/api\/ai\/generate$/, "/api/ai/health");
      return parsed.toString();
    }
    return `${parsed.toString().replace(/\/$/, "")}/api/ai/health`;
  } catch {
    return "";
  }
}

export async function checkGatewayHealth(gatewayUrl: string): Promise<GatewayHealthResponse> {
  const url = toHealthUrl(gatewayUrl);
  if (!url) return { ok: false, error: "Invalid gateway URL." };
  try {
    const response = await fetch(url, { method: "GET" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false) {
      return { ok: false, error: sanitizeProviderError(json?.error || `Gateway HTTP ${response.status}`) };
    }
    return {
      ok: true,
      service: json?.service,
      uptimeMs: json?.uptimeMs,
      port: json?.port,
      time: json?.time,
    };
  } catch (error) {
    return { ok: false, error: sanitizeProviderError(error) };
  }
}
