export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "RATE_LIMITED"
  | "INVALID_JSON"
  | "INVALID_RESPONSE"
  | "EMPTY_RESULT"
  | "UNKNOWN_ERROR";

export type CacheStatus = "live" | "cached" | "stale" | "error" | "unavailable";

export interface NormalizedApiError {
  code: ApiErrorCode;
  message: string;
  status?: number;
  source?: string;
  endpoint?: string;
  retryable: boolean;
}

export interface SourceMetadata {
  name: string;
  endpoint: string;
  fetchedAt: string;
  license?: string;
}

export interface FreshnessInfo {
  fetchedAt: string;
  lastUpdated?: string;
  cacheStatus: CacheStatus;
  ttlMs?: number;
  ageMs?: number;
}

export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: NormalizedApiError;
  source: SourceMetadata;
  freshness: FreshnessInfo;
  staleData?: T;
};

export function apiOk<T>(data: T, source: SourceMetadata, freshness: FreshnessInfo): ApiResult<T> {
  return { success: true, data, source, freshness };
}

export function apiFail<T>(error: NormalizedApiError, source: SourceMetadata, freshness: FreshnessInfo, staleData?: T): ApiResult<T> {
  return { success: false, error, source, freshness, staleData };
}