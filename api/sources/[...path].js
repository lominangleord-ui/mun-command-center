import { handleSourceProxyRequest } from "../../server/source-proxy-core.mjs";

export default async function handler(req, res) {
  return handleSourceProxyRequest(req, res, {
    allowedOrigin: process.env.MUN_AI_GATEWAY_ORIGIN || req.headers.origin || "*",
  });
}
