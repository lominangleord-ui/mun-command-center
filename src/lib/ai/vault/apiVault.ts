import { DEFAULT_TASK_ROUTING } from "../models/providers";
import type { AIVaultState, AIProviderId, ProviderCredential, SaveCredentialInput } from "../models/types";

const VAULT_KEY = "mun-ai-provider-vault";
const DEVICE_SECRET_KEY = "mun-ai-provider-device-secret";
const DEFAULT_GATEWAY_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_AI_GATEWAY_URL
  || "/api/ai/generate"
).trim();

const DEFAULT_VAULT: AIVaultState = {
  version: 1,
  credentials: [],
  streamingEnabled: false,
  internetAugmentation: true,
  gatewayUrl: DEFAULT_GATEWAY_URL,
  taskRouting: DEFAULT_TASK_ROUTING,
};

function now(): string {
  return new Date().toISOString();
}

function id(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreateDeviceSecret(): string {
  const existing = localStorage.getItem(DEVICE_SECRET_KEY);
  if (existing) return existing;
  const bytes = new Uint8Array(32);
  if (crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 255);
  const secret = btoa(String.fromCharCode(...bytes));
  localStorage.setItem(DEVICE_SECRET_KEY, secret);
  return secret;
}

async function getCryptoKey(): Promise<CryptoKey | null> {
  if (!crypto?.subtle) return null;
  const secret = getOrCreateDeviceSecret();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function encryptText(value: string): Promise<{ encryptedKey: string; iv: string }> {
  const cryptoKey = await getCryptoKey();
  const iv = new Uint8Array(12);
  if (crypto?.getRandomValues) crypto.getRandomValues(iv);
  if (!cryptoKey) {
    return { encryptedKey: btoa(unescape(encodeURIComponent(value))), iv: bytesToBase64(iv) };
  }
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, new TextEncoder().encode(value));
  return { encryptedKey: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

async function decryptText(encryptedKey: string, iv: string): Promise<string> {
  const cryptoKey = await getCryptoKey();
  if (!cryptoKey) return decodeURIComponent(escape(atob(encryptedKey)));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesToArrayBuffer(base64ToBytes(iv)) },
    cryptoKey,
    bytesToArrayBuffer(base64ToBytes(encryptedKey)),
  );
  return new TextDecoder().decode(decrypted);
}

export function maskSecret(value?: string): string {
  if (!value) return "not saved";
  if (value.length <= 8) return "saved key";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function getVaultState(): AIVaultState {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return { ...DEFAULT_VAULT, taskRouting: [...DEFAULT_TASK_ROUTING] };
    const parsed = JSON.parse(raw) as AIVaultState;
    return {
      ...DEFAULT_VAULT,
      ...parsed,
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
      taskRouting: Array.isArray(parsed.taskRouting) && parsed.taskRouting.length ? parsed.taskRouting : DEFAULT_TASK_ROUTING,
    };
  } catch {
    return { ...DEFAULT_VAULT, taskRouting: [...DEFAULT_TASK_ROUTING] };
  }
}

export function saveVaultState(state: AIVaultState): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(state));
}

export async function saveCredential(input: SaveCredentialInput): Promise<ProviderCredential> {
  const state = getVaultState();
  const encrypted = await encryptText(input.apiKey.trim());
  const existing = state.credentials.find((cred) =>
    cred.providerId === input.providerId && cred.label.toLowerCase() === input.label.toLowerCase()
  );
  const credential: ProviderCredential = {
    id: existing?.id || id(),
    providerId: input.providerId,
    label: input.label.trim() || input.providerId,
    model: input.model.trim(),
    baseUrl: input.baseUrl?.trim() || undefined,
    encryptedKey: encrypted.encryptedKey,
    iv: encrypted.iv,
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
    health: "untested",
  };
  const credentials = existing
    ? state.credentials.map((cred) => cred.id === existing.id ? credential : cred)
    : [credential, ...state.credentials];
  saveVaultState({
    ...state,
    credentials,
    activeCredentialId: state.activeCredentialId || credential.id,
    fallbackCredentialId: state.fallbackCredentialId,
  });
  return credential;
}

export async function readCredentialKey(credentialId: string): Promise<string | null> {
  const cred = getVaultState().credentials.find((item) => item.id === credentialId);
  if (!cred) return null;
  try {
    return await decryptText(cred.encryptedKey, cred.iv);
  } catch {
    return null;
  }
}

export function removeCredential(credentialId: string): void {
  const state = getVaultState();
  const credentials = state.credentials.filter((cred) => cred.id !== credentialId);
  saveVaultState({
    ...state,
    credentials,
    activeCredentialId: state.activeCredentialId === credentialId ? credentials[0]?.id : state.activeCredentialId,
    fallbackCredentialId: state.fallbackCredentialId === credentialId ? undefined : state.fallbackCredentialId,
  });
}

export function setActiveCredential(credentialId?: string): void {
  const state = getVaultState();
  saveVaultState({ ...state, activeCredentialId: credentialId });
}

export function setFallbackCredential(credentialId?: string): void {
  const state = getVaultState();
  saveVaultState({ ...state, fallbackCredentialId: credentialId });
}

export function setVaultOptions(options: Partial<Pick<AIVaultState, "streamingEnabled" | "internetAugmentation" | "gatewayUrl" | "taskRouting">>): void {
  saveVaultState({ ...getVaultState(), ...options });
}

export function updateCredentialHealth(credentialId: string, health: ProviderCredential["health"], message: string): void {
  const state = getVaultState();
  saveVaultState({
    ...state,
    credentials: state.credentials.map((cred) => cred.id === credentialId
      ? { ...cred, health, healthMessage: message, lastTestedAt: now(), updatedAt: now() }
      : cred),
  });
}

export function markCredentialUsed(credentialId: string): void {
  const state = getVaultState();
  saveVaultState({
    ...state,
    credentials: state.credentials.map((cred) => cred.id === credentialId ? { ...cred, lastUsedAt: now() } : cred),
  });
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_KEY);
}

export function credentialForProvider(providerId: AIProviderId): ProviderCredential | undefined {
  return getVaultState().credentials.find((cred) => cred.providerId === providerId);
}
