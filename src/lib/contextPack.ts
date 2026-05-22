import type { ContextPack } from "../types";
import { createDefaultContext } from "./storage";

export function buildContextPack(input: Partial<ContextPack> & Pick<ContextPack, "committee" | "agenda" | "country">): ContextPack {
  const def = createDefaultContext();
  return {
    ...def,
    committee: input.committee,
    agenda: input.agenda,
    country: input.country,
    role: input.role || def.role,
    current_phase: input.current_phase || def.current_phase,
    bloc: input.bloc || def.bloc,
    allies: input.allies || def.allies,
    opponents: input.opponents || def.opponents,
    active_goal: input.active_goal || def.active_goal,
    important_rules: input.important_rules || def.important_rules,
    latest_updates: input.latest_updates || def.latest_updates,
    next_action_needed: input.next_action_needed || def.next_action_needed,
    simulationYear: input.simulationYear ?? def.simulationYear,
    simulationYearSource: input.simulationYearSource || def.simulationYearSource,
    committeeSize: input.committeeSize ?? def.committeeSize,
    committeeType: input.committeeType || def.committeeType,
    delegateMode: input.delegateMode || def.delegateMode,
    delegateRole: input.delegateRole || def.delegateRole,
    partnerName: input.partnerName || def.partnerName,
  };
}

export function contextToExportBlock(ctx: ContextPack, task?: string): string {
  const lines = [
    "[CONTEXT PACK]",
    `Committee: ${ctx.committee}`,
    `Agenda: ${ctx.agenda}`,
    `Country: ${ctx.country}`,
    `Role: ${ctx.role}`,
    `Phase: ${ctx.current_phase}`,
    `Bloc: ${ctx.bloc}`,
    `Allies: ${ctx.allies.join(", ") || "None"}`,
    `Opponents: ${ctx.opponents.join(", ") || "None"}`,
    `Goal: ${ctx.active_goal}`,
    `Rules: ${ctx.important_rules.join("; ") || "Standard"}`,
    `Latest updates: ${ctx.latest_updates.join("; ") || "None"}`,
    `Need next: ${ctx.next_action_needed}`,
    `Simulation Year: ${ctx.simulationYear}`,
    `Simulation Year Source: ${ctx.simulationYearSource}`,
    `Committee Size: ${ctx.committeeSize}`,
    `Delegate Mode: ${ctx.delegateMode}`,
    `Delegate Role: ${ctx.delegateRole}`,
  ];

  if (task) {
    lines.push("", "[TASK]", task);
    lines.push("", "[STYLE]", "Formal, diplomatic, sharp, concise.");
  }

  return lines.join("\n");
}

export function parseImportBlock(block: string): { context?: Partial<ContextPack>; task?: string; response?: string } {
  const result: { context?: Partial<ContextPack>; task?: string; response?: string } = {};
  const sections = block.split(/\[([A-Z_ ]+)\]/);

  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i].trim();
    const content = (sections[i + 1] || "").trim();

    if (sectionName === "CONTEXT PACK") {
      const ctx: Record<string, string> = {};
      content.split("\n").forEach((line) => {
        const [key, ...rest] = line.split(":");
        if (key && rest.length) ctx[key.trim()] = rest.join(":").trim();
      });
      result.context = {
        committee: ctx["Committee"] || "",
        agenda: ctx["Agenda"] || "",
        country: ctx["Country"] || "",
        role: ctx["Role"] || "Delegate",
        bloc: ctx["Bloc"] || "",
        active_goal: ctx["Goal"] || "",
        allies: ctx["Allies"] ? ctx["Allies"].split(",").map((s) => s.trim()).filter(Boolean) : [],
        opponents: ctx["Opponents"] ? ctx["Opponents"].split(",").map((s) => s.trim()).filter(Boolean) : [],
        important_rules: ctx["Rules"] ? ctx["Rules"].split(";").map((s) => s.trim()).filter(Boolean) : [],
        latest_updates: ctx["Latest updates"] ? ctx["Latest updates"].split(";").map((s) => s.trim()).filter(Boolean) : [],
        next_action_needed: ctx["Need next"] || "",
        simulationYear: Number(ctx["Simulation Year"] || 0) || undefined,
        simulationYearSource: ctx["Simulation Year Source"] === "chair_override" ? "chair_override" : undefined,
      };
    } else if (sectionName === "TASK") {
      result.task = content;
    } else if (sectionName === "RESPONSE") {
      result.response = content;
    }
  }

  return result;
}

export function contextToJSON(ctx: ContextPack): string {
  return JSON.stringify(ctx, null, 2);
}
