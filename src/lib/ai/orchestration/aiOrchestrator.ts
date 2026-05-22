import { getProviderDefinition } from "../models/providers";
import type { AIRequest, AIResponse, ProviderCredential, ProviderError } from "../models/types";
import { getCachedAIResponse, hashAIRequest, setCachedAIResponse } from "../cache/aiCache";
import { createProvider } from "../providers/base";
import {
  getVaultState,
  markCredentialUsed,
  readCredentialKey,
  updateCredentialHealth,
} from "../vault/apiVault";
import { strategicSystemPrompt } from "../prompts/strategicIntelligence.prompt";
import { withVerificationDiscipline } from "./verificationLayer";
import type { StrategicContextSnapshot } from "../../strategic-context";
import { buildSourceBackedCountryIntel, toSourceIntelBrief } from "../../intelligence/sourceIntelligenceEngine";

const SOURCE_INTEL_COUNTRY_LIMIT = 3;

function routeCredential(task: AIRequest["task"]): ProviderCredential | undefined {
  const state = getVaultState();
  const routed = state.taskRouting.find((route) => route.task === task && route.credentialId);
  return state.credentials.find((cred) => cred.id === routed?.credentialId)
    || state.credentials.find((cred) => cred.id === state.activeCredentialId)
    || state.credentials[0];
}

function fallbackCredential(primary?: ProviderCredential): ProviderCredential | undefined {
  const state = getVaultState();
  const fallback = state.credentials.find((cred) => cred.id === state.fallbackCredentialId);
  if (fallback && fallback.id !== primary?.id) return fallback;
  return state.credentials.find((cred) => cred.id !== primary?.id);
}

function modelFor(request: AIRequest, credential: ProviderCredential): string {
  const route = getVaultState().taskRouting.find((item) => item.task === request.task);
  return request.model || route?.model || credential.model || getProviderDefinition(credential.providerId).defaultModel;
}

function localFallbackResponse(error: ProviderError): AIResponse {
  const noProvider = error.code === "NO_PROVIDER";
  const reason = noProvider
    ? "No AI provider is configured."
    : `Live AI unavailable (${error.code}).`;
  return {
    content: [
      `UNCERTAIN: ${reason}`,
      "STRATEGIC RECOMMENDATION: Continue using local relationship, procedure, and dossier engines; use Strategic Intel local fallback while gateway/provider recovers.",
    ].join("\n"),
    provider: error.providerId || "openai-compatible",
    model: "local-fallback",
    cached: false,
    fallbackUsed: true,
    confidence: "low",
    sourceBasis: "fallback",
    metadata: { providerId: error.providerId || "openai-compatible", model: "local-fallback", fallbackUsed: true },
    error,
  };
}

function strategicContextMessage(snapshot?: StrategicContextSnapshot): string | null {
  if (!snapshot) return null;
  return [
    "STRATEGIC CONTEXT PACK",
    `simulationYear=${snapshot.simulationYear}`,
    `timelineLockActive=${snapshot.timelineLockActive}`,
    `timelineLockSource=${snapshot.timelineLockSource}`,
    `timelinePolicy=${snapshot.timelinePolicy}`,
    `delegate=${snapshot.selectedCountry}`,
    `committee=${snapshot.committee}`,
    `agenda=${snapshot.agenda}`,
    `phase=${snapshot.phase}`,
    `mode=${snapshot.mode}`,
    `objective=${snapshot.tacticalObjective}`,
    `nextBestMove=${snapshot.nextBestMove}`,
    "",
    "Procedural momentum:",
    JSON.stringify(snapshot.proceduralMomentum),
    "",
    "Chair profile:",
    JSON.stringify(snapshot.chairProfile),
    "",
    "Resolution evolution:",
    JSON.stringify(snapshot.resolutionEvolution),
    "",
    "Negotiation memory:",
    JSON.stringify(snapshot.negotiationMemory),
    "",
    "Relationship graph:",
    JSON.stringify(snapshot.relationshipGraph.slice(0, 18)),
    "",
    "Country doctrine memory:",
    snapshot.countryDoctrineMemory.slice(0, 18).join("\n"),
    "",
    "Compressed committee memory:",
    snapshot.compressedMemory,
    "",
    snapshot.sourceAndConfidencePolicy,
  ].join("\n");
}

function sourceIntelCountries(request: AIRequest): string[] {
  const selected = request.context?.country || request.strategicContext?.selectedCountry;
  const graph = request.strategicContext?.relationshipGraph || [];
  const ranked = [...graph]
    .sort((a, b) => (b.sponsorProbability + b.oppositionProbability + b.bluffRisk) - (a.sponsorProbability + a.oppositionProbability + a.bluffRisk))
    .map((item) => item.country);
  return Array.from(new Set([selected, ...ranked].filter(Boolean) as string[])).slice(0, SOURCE_INTEL_COUNTRY_LIMIT);
}

async function resolveSourceIntelBrief(request: AIRequest): Promise<string[]> {
  if (request.sourceIntelBrief?.length) return request.sourceIntelBrief;
  const agenda = request.context?.agenda || request.strategicContext?.agenda;
  if (!agenda) return [];
  const simulationYear = request.strategicContext?.simulationYear || 2013;
  const countries = sourceIntelCountries(request);
  if (!countries.length) return [];

  const parts = await Promise.allSettled(countries.map((country) =>
    buildSourceBackedCountryIntel(country, agenda, {
      simulationYear,
      maxEvents: 4,
      maxResearch: 4,
    })
  ));
  return parts.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    return toSourceIntelBrief(result.value, 2);
  }).slice(0, 24);
}

async function runCredential(request: AIRequest, credential: ProviderCredential, fallbackUsed: boolean): Promise<AIResponse> {
  const apiKey = await readCredentialKey(credential.id);
  if (!apiKey) {
    throw {
      providerId: credential.providerId,
      code: "KEY_UNREADABLE",
      message: "Saved key could not be decrypted in this browser.",
      retryable: false,
    } satisfies ProviderError;
  }
  const model = modelFor(request, credential);
  const gatewayUrl = getVaultState().gatewayUrl;
  const cacheKey = await hashAIRequest(credential.providerId, model, request);
  if ((request.cacheTtlMs ?? 1) > 0) {
    const cached = getCachedAIResponse(cacheKey);
    if (cached) return { ...cached, fallbackUsed, metadata: { ...cached.metadata, fallbackUsed } };
  }
  const provider = createProvider({ credential, apiKey, model, gatewayUrl });
  const response = await provider.generate({ ...request, model });
  const finalResponse: AIResponse = {
    ...response,
    fallbackUsed,
    metadata: { ...response.metadata, fallbackUsed },
  };
  markCredentialUsed(credential.id);
  if ((request.cacheTtlMs ?? 1) > 0) setCachedAIResponse(cacheKey, finalResponse, request.cacheTtlMs);
  return finalResponse;
}

export class AIOrchestrator {
  async generate(input: AIRequest): Promise<AIResponse> {
    const sourceIntelBrief = await resolveSourceIntelBrief(input);
    const request = withVerificationDiscipline({
      ...input,
      sourceIntelBrief,
      messages: [
        { role: "system", content: strategicSystemPrompt(input.context) },
        ...(strategicContextMessage(input.strategicContext) ? [{ role: "system" as const, content: strategicContextMessage(input.strategicContext) as string }] : []),
        ...(sourceIntelBrief.length ? [{ role: "system" as const, content: ["SOURCE VERIFICATION BRIEF", ...sourceIntelBrief].join("\n") }] : []),
        ...input.messages,
      ],
    });
    const primary = routeCredential(request.task);
    if (!primary) {
      return localFallbackResponse({
        providerId: "openai-compatible",
        code: "NO_PROVIDER",
        message: "No provider configured.",
        retryable: false,
      });
    }
    try {
      return await runCredential(request, primary, false);
    } catch (primaryError) {
      const fallback = fallbackCredential(primary);
      if (!fallback) {
        return localFallbackResponse({
          ...(primaryError as ProviderError),
          providerId: primary.providerId,
        });
      }
      try {
        return await runCredential(request, fallback, true);
      } catch (fallbackError) {
        return localFallbackResponse({
          ...(fallbackError as ProviderError),
          providerId: fallback.providerId,
        });
      }
    }
  }

  async testCredential(credential: ProviderCredential) {
    const apiKey = await readCredentialKey(credential.id);
    if (!apiKey) {
      updateCredentialHealth(credential.id, "error", "Saved key could not be decrypted.");
      return { ok: false, providerId: credential.providerId, message: "Saved key could not be decrypted.", checkedAt: new Date().toISOString() };
    }
    const provider = createProvider({ credential, apiKey, model: credential.model, gatewayUrl: getVaultState().gatewayUrl });
    const health = await provider.testConnection();
    updateCredentialHealth(credential.id, health.ok ? "ok" : "error", health.sanitizedError || health.message);
    return health;
  }
}

export const aiOrchestrator = new AIOrchestrator();
