import http from "node:http";
import { handleAIGatewayRequest } from "./ai-gateway-core.mjs";
import { handleSourceProxyRequest } from "./source-proxy-core.mjs";

const PORT = Number(process.env.MUN_AI_GATEWAY_PORT || 8787);
const STARTED_AT = Date.now();

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/sources/")) {
    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname.replace(/^\/api\/sources\//, "");
    req.query = {
      ...Object.fromEntries(url.searchParams.entries()),
      path: path.split("/").filter(Boolean),
    };
    return handleSourceProxyRequest(req, res, {
      allowedOrigin: process.env.MUN_AI_GATEWAY_ORIGIN || "*",
    });
  }
  return handleAIGatewayRequest(req, res, {
    startedAt: STARTED_AT,
    port: PORT,
    allowedOrigin: process.env.MUN_AI_GATEWAY_ORIGIN || "*",
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MUN AI gateway listening at http://127.0.0.1:${PORT}/api/ai/generate`);
});
