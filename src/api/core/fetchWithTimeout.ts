import { normalizeApiError } from "./apiErrors";
import { safeJsonParse } from "./safeJson";
import type { NormalizedApiError } from "../models/api";

export interface FetchSuccess<T> {
  ok: true;
  data: T;
  responseText?: string;
}

export interface FetchFailure {
  ok: false;
  error: NormalizedApiError;
}

export type FetchOutcome<T> = FetchSuccess<T> | FetchFailure;

export interface FetchOptions {
  timeoutMs?: number;
  asText?: boolean; // for non-JSON endpoints
  init?: RequestInit;
}

export async function fetchWithTimeout<T>(
  endpoint: string,
  options: FetchOptions | number = {}
): Promise<FetchOutcome<T>> {
  const opts: FetchOptions = typeof options === "number" ? { timeoutMs: options } : options;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      ...opts.init,
      signal: controller.signal,
      headers: {
        Accept: opts.asText ? "*/*" : "application/json",
        ...(opts.init?.headers ?? {}),
      },
    });
    window.clearTimeout(timeout);

    if (!response.ok) {
      return {
        ok: false,
        error: normalizeApiError({
          error: new Error(`HTTP ${response.status}`),
          endpoint,
          status: response.status,
        }),
      };
    }

    if (opts.asText) {
      const text = await response.text();
      return { ok: true, data: text as unknown as T, responseText: text };
    }

    // Some public APIs (notably GDELT) sometimes return HTML on error
    // even with a 200 status. Detect that gracefully.
    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.includes("json") && !contentType.includes("text/plain")) {
      return {
        ok: false,
        error: normalizeApiError({
          error: new Error(`Non-JSON response (${contentType})`),
          endpoint,
          source: "fetchWithTimeout",
        }),
      };
    }

    const parsed = await safeJsonParse<T>(response, endpoint);
    return parsed;
  } catch (error) {
    window.clearTimeout(timeout);
    return {
      ok: false,
      error: normalizeApiError({ error, endpoint }),
    };
  }
}
