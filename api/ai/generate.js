import { handleAIGatewayRequest } from "../../server/ai-gateway-core.mjs";

const STARTED_AT = Date.now();

export default async function handler(req, res) {
  return handleAIGatewayRequest(req, res, { startedAt: STARTED_AT, port: null });
}
