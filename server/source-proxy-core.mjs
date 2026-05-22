const SOURCE_ALLOWLIST = {
  worldbank: {
    baseUrl: "https://api.worldbank.org",
    pathPattern: /^v2\/country\/[A-Za-z0-9._-]+\/indicator\/[A-Za-z0-9._-]+$/,
  },
  restcountries: {
    baseUrl: "https://restcountries.com",
    pathPattern: /^v3\.1\/(name|alpha)\/[^/]+$/,
  },
  gdelt: {
    baseUrl: "https://api.gdeltproject.org",
    pathPattern: /^api\/v2\/doc\/doc$/,
  },
  "open-meteo": {
    baseUrl: "https://api.open-meteo.com",
    pathPattern: /^v1\/forecast$/,
  },
  openalex: {
    baseUrl: "https://api.openalex.org",
    pathPattern: /^works$/,
  },
};

const MAX_QUERY_KEYS = 32;
const MAX_QUERY_VALUE_LEN = 400;
const MAX_QUERY_ARRAY_ITEMS = 12;
const UPSTREAM_TIMEOUT_MS = 12000;

function sanitizeError(value) {
  return String(value || "Source proxy error").slice(0, 400);
}

function sendJson(res, status, payload, origin = "*") {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function normalizePathParts(pathQueryValue) {
  if (Array.isArray(pathQueryValue)) return pathQueryValue.filter(Boolean);
  if (typeof pathQueryValue === "string" && pathQueryValue) return [pathQueryValue];
  return [];
}

function normalizeQueryMap(req) {
  if (req.query && typeof req.query === "object") return req.query;
  const url = new URL(req.url || "/", "http://local");
  const map = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (map[key] === undefined) map[key] = value;
    else if (Array.isArray(map[key])) map[key].push(value);
    else map[key] = [map[key], value];
  }
  return map;
}

function appendSearchParams(url, query) {
  const keys = Object.keys(query);
  if (keys.length > MAX_QUERY_KEYS) {
    throw new Error(`Too many query keys (>${MAX_QUERY_KEYS})`);
  }
  for (const [key, value] of Object.entries(query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      if (value.length > MAX_QUERY_ARRAY_ITEMS) {
        throw new Error(`Too many values for query key "${key}"`);
      }
      for (const item of value) {
        if (typeof item === "string" && item.length <= MAX_QUERY_VALUE_LEN) {
          url.searchParams.append(key, item);
        }
      }
      continue;
    }
    if (typeof value === "string") {
      if (value.length > MAX_QUERY_VALUE_LEN) {
        throw new Error(`Query value too long for key "${key}"`);
      }
      url.searchParams.set(key, value);
    }
  }
}

export async function handleSourceProxyRequest(req, res, options = {}) {
  const query = normalizeQueryMap(req);
  const parts = normalizePathParts(query.path);
  const origin = options.allowedOrigin || process.env.MUN_AI_GATEWAY_ORIGIN || req.headers.origin || "*";

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {}, origin);
    return;
  }
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED", error: "Only GET is supported" }, origin);
    return;
  }

  const sourceKey = parts[0];
  const sourceConfig = SOURCE_ALLOWLIST[sourceKey];
  if (!sourceConfig) {
    sendJson(res, 400, { ok: false, code: "SOURCE_NOT_ALLOWED", error: "Unknown or blocked source" }, origin);
    return;
  }

  const upstreamPath = parts.slice(1).join("/");
  if (!sourceConfig.pathPattern.test(upstreamPath)) {
    sendJson(res, 400, { ok: false, code: "PATH_NOT_ALLOWED", error: "Path rejected by source allowlist" }, origin);
    return;
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(`${sourceConfig.baseUrl}/${upstreamPath}`);
    appendSearchParams(upstreamUrl, query);
  } catch (error) {
    sendJson(res, 400, { ok: false, code: "BAD_QUERY", error: sanitizeError(error?.message || error) }, origin);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!response.ok) {
      sendJson(res, response.status, {
        ok: false,
        code: `UPSTREAM_${response.status}`,
        error: sanitizeError(text || response.statusText),
      }, origin);
      return;
    }

    if (!contentType.includes("json")) {
      sendJson(res, 502, {
        ok: false,
        code: "UPSTREAM_NON_JSON",
        error: `Unexpected upstream content-type: ${contentType || "unknown"}`,
      }, origin);
      return;
    }

    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      sendJson(res, 502, { ok: false, code: "UPSTREAM_PARSE_ERROR", error: "Failed to parse upstream JSON" }, origin);
      return;
    }

    sendJson(res, 200, json, origin);
  } catch (error) {
    sendJson(res, 502, { ok: false, code: "UPSTREAM_FETCH_FAILED", error: sanitizeError(error?.message || error) }, origin);
  } finally {
    clearTimeout(timeout);
  }
}
