import type { NormalizedApiError } from "../models/api";

export function normalizeApiError(input: { error: unknown; endpoint?: string; status?: number; source?: string }): NormalizedApiError {
  const { error, endpoint, status, source } = input;

  if (status === 429) return { code: "RATE_LIMITED", message: "Rate limited by public API", status, endpoint, source, retryable: true };
  if (typeof status === "number" && status >= 400) return { code: "HTTP_ERROR", message: `HTTP ${status}`, status, endpoint, source, retryable: status >= 500 };
  if (error instanceof SyntaxError) return { code: "INVALID_JSON", message: "Invalid JSON response", endpoint, source, retryable: false };
  if (error instanceof DOMException && error.name === "AbortError") return { code: "TIMEOUT", message: "Request timed out", endpoint, source, retryable: true };
  if (error instanceof Error) return { code: "NETWORK_ERROR", message: error.message, endpoint, source, retryable: true };

  return { code: "UNKNOWN_ERROR", message: "Unknown API error", endpoint, source, retryable: true };
}