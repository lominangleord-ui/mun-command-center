import type { AIMessage, AIRequest } from "../models/types";

const CLAIM_TRIGGERS = /\b(always|never|officially|voted|supports|opposes|requires|bans|recognizes|sanctions|treaty|resolution)\b/i;

export function requestNeedsVerification(text: string): boolean {
  return CLAIM_TRIGGERS.test(text);
}

export function withVerificationDiscipline(request: AIRequest): AIRequest {
  const userText = request.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  if (!requestNeedsVerification(userText)) return request;
  const system: AIMessage = {
    role: "system",
    content: [
      "Verify factual, policy, and procedural claims against supplied context before relying on them.",
      "Label each major point as FACT, INFERENCE, PROJECTION, CONTRADICTION, STRATEGIC RECOMMENDATION, or UNCERTAIN.",
      "If source context is missing, say what is missing and lower confidence.",
    ].join(" "),
  };
  return { ...request, messages: [system, ...request.messages], task: request.task === "general" ? "verification" : request.task };
}
