import { aiOrchestrator } from "./ai/orchestration/aiOrchestrator";
import { credentialForProvider, readCredentialKey, saveCredential } from "./ai/vault/apiVault";

export async function getApiKey(): Promise<string | null> {
  const credential = credentialForProvider("anthropic");
  return credential ? readCredentialKey(credential.id) : null;
}

export async function setApiKey(key: string): Promise<void> {
  if (!key.trim()) return;
  await saveCredential({
    providerId: "anthropic",
    label: "Anthropic",
    apiKey: key,
    model: "claude-3-5-sonnet-latest",
  });
}

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await aiOrchestrator.generate({
    task: "general",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    maxTokens: 1200,
    temperature: 0.2,
  });
  if (response.error?.code === "NO_PROVIDER") throw new Error("NO_KEY");
  if (response.error && response.sourceBasis === "fallback") throw new Error(response.error.code);
  return response.content;
}

export async function testClaudeConnection(): Promise<boolean> {
  const credential = credentialForProvider("anthropic");
  if (!credential) return false;
  const health = await aiOrchestrator.testCredential(credential);
  return health.ok;
}
