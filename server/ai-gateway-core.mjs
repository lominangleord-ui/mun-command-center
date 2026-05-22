export const ALLOWED_PROVIDER_IDS = new Set(["anthropic", "openai", "gemini", "openrouter", "openai-compatible"]);

export function sanitizeBaseUrl(baseUrl, providerId) {
  if (!baseUrl) return undefined;
  if (providerId !== "openrouter" && providerId !== "openai-compatible") return undefined;
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function sanitizeGatewayError(value) {
  return String(value || "Provider error")
    .replace(/sk-[a-zA-Z0-9_\-]{8,}/g, "sk-...")
    .replace(/sk-ant-[a-zA-Z0-9_\-]{8,}/g, "sk-ant-...")
    .replace(/sk-or-[a-zA-Z0-9_\-]{8,}/g, "sk-or-...")
    .replace(/AIza[a-zA-Z0-9_\-]{8,}/g, "AIza...");
}

function send(res, status, data, origin) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request too large");
  }
  return JSON.parse(body || "{}");
}

function splitSystem(messages = []) {
  return {
    system: messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n"),
    chat: messages.filter((m) => m.role !== "system"),
  };
}

async function providerFetch(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: `HTTP_${res.status}`,
        error: sanitizeGatewayError(json?.error?.message || json?.message || text || `HTTP ${res.status}`),
      };
    }
    return {
      ok: true,
      json,
      requestId: res.headers.get("x-request-id") || res.headers.get("cf-ray") || undefined,
      rateLimitRemaining: res.headers.get("x-ratelimit-remaining") || res.headers.get("anthropic-ratelimit-requests-remaining") || undefined,
      rateLimitReset: res.headers.get("x-ratelimit-reset") || res.headers.get("anthropic-ratelimit-requests-reset") || undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(body) {
  const { system, chat } = splitSystem(body.messages);
  const result = await providerFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": body.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: body.maxTokens || 1200,
      temperature: body.temperature ?? 0.2,
      system: system || undefined,
      messages: chat.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    }),
  });
  if (!result.ok) return result;
  return {
    ...result,
    content: result.json.content?.map((part) => part.text).filter(Boolean).join("\n") || "",
  };
}

async function callOpenAI(body, providerId, runtimeOrigin) {
  const safeBaseUrl = sanitizeBaseUrl(body.baseUrl, providerId);
  const baseUrl = safeBaseUrl || (providerId === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");
  const referer = process.env.MUN_OPENROUTER_REFERER || runtimeOrigin || "http://localhost";
  const result = await providerFetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${body.apiKey}`,
      ...(providerId === "openrouter" ? { "HTTP-Referer": referer, "X-Title": "MUN Command Center" } : {}),
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      max_tokens: body.maxTokens || 1200,
      temperature: body.temperature ?? 0.2,
    }),
  });
  if (!result.ok) return result;
  return { ...result, content: result.json.choices?.[0]?.message?.content || "" };
}

async function callGemini(body) {
  const { system, chat } = splitSystem(body.messages);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(body.model)}:generateContent?key=${encodeURIComponent(body.apiKey)}`;
  const result = await providerFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: chat.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: body.maxTokens || 1200, temperature: body.temperature ?? 0.2 },
    }),
  });
  if (!result.ok) return result;
  return { ...result, content: result.json.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") || "" };
}

export function gatewayHealthPayload(startedAt, port) {
  return {
    ok: true,
    service: "mun-ai-gateway",
    uptimeMs: Date.now() - startedAt,
    port,
    time: new Date().toISOString(),
  };
}

export async function handleAIGatewayRequest(req, res, options = {}) {
  const {
    startedAt = Date.now(),
    port = null,
    allowedOrigin = process.env.MUN_AI_GATEWAY_ORIGIN || req.headers.origin || "*",
  } = options;

  if (req.method === "OPTIONS") return send(res, 204, {}, allowedOrigin);
  if (req.method === "GET" && req.url?.startsWith("/api/ai/health")) {
    return send(res, 200, gatewayHealthPayload(startedAt, port), allowedOrigin);
  }
  if (req.method !== "POST" || !req.url?.startsWith("/api/ai/generate")) {
    return send(res, 404, { ok: false, code: "NOT_FOUND", error: "Unknown AI gateway route" }, allowedOrigin);
  }

  try {
    const body = await readBody(req);
    if (!body.providerId || !body.apiKey || !body.model || !Array.isArray(body.messages)) {
      return send(res, 400, { ok: false, code: "BAD_REQUEST", error: "providerId, apiKey, model, and messages are required" }, allowedOrigin);
    }
    if (!ALLOWED_PROVIDER_IDS.has(body.providerId)) {
      return send(res, 400, { ok: false, code: "BAD_PROVIDER", error: "Unsupported providerId" }, allowedOrigin);
    }
    if (body.messages.length > 80) {
      return send(res, 400, { ok: false, code: "MESSAGE_LIMIT", error: "Too many messages in one request" }, allowedOrigin);
    }

    let result;
    if (body.providerId === "anthropic") result = await callAnthropic(body);
    else if (body.providerId === "gemini") result = await callGemini(body);
    else result = await callOpenAI(body, body.providerId, req.headers.origin || "");

    if (!result.ok) return send(res, result.status || 502, result, allowedOrigin);
    return send(res, 200, {
      ok: true,
      content: result.content,
      requestId: result.requestId,
      rateLimitRemaining: result.rateLimitRemaining,
      rateLimitReset: result.rateLimitReset,
    }, allowedOrigin);
  } catch (error) {
    return send(res, 500, { ok: false, code: "GATEWAY_ERROR", error: sanitizeGatewayError(error?.message || error) }, allowedOrigin);
  }
}
