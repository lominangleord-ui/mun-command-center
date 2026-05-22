import type { NormalizedApiError } from "../models/api";

export async function retry<T>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: NormalizedApiError }>, attempts = 2): Promise<{ ok: true; data: T } | { ok: false; error: NormalizedApiError }> {
  let last: NormalizedApiError | null = null;
  for (let i = 0; i < attempts; i++) {
    const result = await fn();
    if (result.ok) return result;
    last = result.error;
    if (!result.error.retryable) break;
    await new Promise((resolve) => setTimeout(resolve, 350 * (i + 1)));
  }
  return { ok: false, error: last || { code: "UNKNOWN_ERROR", message: "Request failed", retryable: false } };
}