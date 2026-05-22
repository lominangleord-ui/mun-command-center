import type { AgentName } from "../types";

export function routeTask(task: string): AgentName {
  const t = task.toLowerCase();

  if (t.includes("rule") || t.includes("motion") || t.includes("procedure") || t.includes("point of order") || t.includes("voting rule") || t.includes("speaking time")) {
    return "RuleForge";
  }
  if (t.includes("speech") || t.includes("statement") || t.includes("rebuttal") || t.includes("address") || t.includes("opening")) {
    return "SpeechForge";
  }
  if (t.includes("clause") || t.includes("amendment") || t.includes("resolution") || t.includes("preambul") || t.includes("operative")) {
    return "ClauseSmith";
  }
  if (t.includes("vote") || t.includes("pass") || t.includes("majority") || t.includes("predict") || t.includes("support")) {
    return "VoteCalc";
  }
  if (t.includes("ally") || t.includes("allies") || t.includes("bloc") || t.includes("coalition") || t.includes("opponent") || t.includes("swing")) {
    return "BlocMap";
  }
  if (t.includes("note") || t.includes("summary") || t.includes("compress") || t.includes("bullet") || t.includes("action item")) {
    return "NoteScribe";
  }
  if (t.includes("research") || t.includes("fact") || t.includes("intel") || t.includes("background") || t.includes("analyze")) {
    return "IntelLens";
  }
  if (t.includes("remember") || t.includes("memory") || t.includes("store") || t.includes("update state")) {
    return "MemoryCore";
  }
  return "SessionLead";
}

export function getRouteDescription(agent: AgentName): string {
  const descriptions: Record<AgentName, string> = {
    SessionLead: "Routing to SessionLead — the manager agent will coordinate.",
    RuleForge: "Routing to RuleForge — procedure and rules specialist.",
    BlocMap: "Routing to BlocMap — alliance and bloc strategist.",
    SpeechForge: "Routing to SpeechForge — speech writing specialist.",
    ClauseSmith: "Routing to ClauseSmith — clause drafting expert.",
    VoteCalc: "Routing to VoteCalc — vote prediction analyst.",
    NoteScribe: "Routing to NoteScribe — note compression specialist.",
    IntelLens: "Routing to IntelLens — research and intelligence analyst.",
    MemoryCore: "Routing to MemoryCore — memory and state manager.",
  };
  return descriptions[agent];
}
