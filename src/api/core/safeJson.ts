import { normalizeApiError } from "./apiErrors";
import type { NormalizedApiError } from "../models/api";

export async function safeJsonParse<T>(response: Response, endpoint: string, source?: string): Promise<{ ok: true; data: T } | { ok: false; error: NormalizedApiError }> {
  try {
    const data = await response.json();
    return { ok: true, data: data as T };
  } catch (error) {
    return { ok: false, error: normalizeApiError({ error, endpoint, source }) };
  }
}