import { gatewayHealthPayload } from "../../server/ai-gateway-core.mjs";

const STARTED_AT = Date.now();

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", process.env.MUN_AI_GATEWAY_ORIGIN || req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Only GET is allowed for health checks" });
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", process.env.MUN_AI_GATEWAY_ORIGIN || req.headers.origin || "*");
  res.status(200).json(gatewayHealthPayload(STARTED_AT, null));
}
