import type { AgentName, AgentRequest, AgentResponse, ContextPack } from "../types";
import { aiOrchestrator } from "../lib/ai/orchestration/aiOrchestrator";
import { getAgentSystemPrompt } from "../lib/agentSystemPrompts";
import { buildProcedureModel } from "../lib/procedureRules";
import {
  CHAIR_STYLE_EXPECTATIONS,
  COMMITTEE_DEBATE_FORMATS,
  COMMITTEE_MOTIONS,
  COMMITTEE_RULE_HIERARCHY,
  POINTS_PRECEDENCE,
  YIELD_OPTIONS,
} from "../lib/committee/committeeContext";

function makeResponse(answer: string, confidence: AgentResponse["confidence"], reasons: string[], followUps: string[]): AgentResponse {
  return { answer, confidence, reasons, follow_up_actions: followUps };
}

function formatContext(ctx: ContextPack): string {
  return `Committee: ${ctx.committee} | Agenda: ${ctx.agenda} | Country: ${ctx.country} | Phase: ${ctx.current_phase} | Bloc: ${ctx.bloc}`;
}

// SessionLead — the manager
function sessionLead(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;
  const phaseGuidance: Record<string, string> = {
    roll_call: "Roll call is in progress. Confirm presence and prepare for agenda setting.",
    agenda_setting: "Agenda setting phase. Prepare to lobby for your preferred topic.",
    opening_speeches: "Opening speeches phase. Deliver a strong position statement.",
    moderated_caucus: "Moderated caucus in session. Prepare focused interventions.",
    unmoderated_caucus: "Unmoderated caucus — time to build coalitions and negotiate.",
    drafting: "Drafting phase — work on operative clauses with your bloc.",
    amendment: "Amendment phase — review proposed changes strategically.",
    voting: "Voting procedure — assess each clause and vote strategically.",
  };

  const guidance = phaseGuidance[ctx.current_phase] || "Proceed with standard committee procedure.";
  const alliesStr = ctx.allies.length > 0 ? ctx.allies.join(", ") : "None identified";
  const opponentsStr = ctx.opponents.length > 0 ? ctx.opponents.join(", ") : "None identified";

  const answer = [
    `📋 **SessionLead Analysis**`,
    ``,
    `**Current Situation:** ${formatContext(ctx)}`,
    ``,
    `**Phase Guidance:** ${guidance}`,
    ``,
    `**Strategic Position:**`,
    `- Allies: ${alliesStr}`,
    `- Opponents: ${opponentsStr}`,
    `- Active Goal: ${ctx.active_goal || "Not set"}`,
    `- Next Action: ${ctx.next_action_needed || "Not specified"}`,
    ``,
    `**Regarding your task:** "${task}"`,
    ``,
    ctx.latest_updates.length > 0
      ? `**Latest Intelligence:** ${ctx.latest_updates.join("; ")}`
      : `**Note:** No recent updates logged. Consider gathering fresh intelligence.`,
    ``,
    `**Recommendation:** Based on the current phase and your goal, focus on building consensus with your bloc while maintaining diplomatic pressure on opposing positions.`,
  ].join("\n");

  return makeResponse(answer, "high",
    [`Phase analysis: ${ctx.current_phase}`, `Bloc position assessed`, `Goal alignment checked`],
    ["Prepare next intervention", "Update bloc positions", "Draft working paper"]
  );
}

// RuleForge — procedure expert
function ruleForge(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;
  const procedure = buildProcedureModel(ctx);
  const canonicalAnswer = [
    "RuleForge Analysis",
    "",
    `Query: "${task}"`,
    `Phase: ${ctx.current_phase.replace(/_/g, " ")}`,
    `Timeline lock: ${ctx.simulationYearSource === "chair_override" ? `chair override (${ctx.simulationYear})` : "default 2013"}`,
    "",
    "Decision hierarchy:",
    ...COMMITTEE_RULE_HIERARCHY.map((rule) => `- ${rule}`),
    "",
    "Chair style expectations:",
    ...CHAIR_STYLE_EXPECTATIONS.map((rule) => `- ${rule}`),
    "",
    "Motions and voting:",
    `- Simple majority threshold: ${procedure.simpleMajorityNeeded}`,
    `- Formal paperwork threshold: ${procedure.formalPaperworkVotesNeeded}`,
    `- Recommended debate lane now: ${procedure.recommendedFormat.label}`,
    `- Motion template: ${procedure.recommendedFormat.motionTemplate}`,
    ...procedure.recommendedFormat.constraints.map((constraint) => `- ${constraint}`),
    "",
    "Points precedence:",
    ...POINTS_PRECEDENCE.map((point) => `- ${point}`),
    "",
    "Yield options:",
    ...YIELD_OPTIONS.map((yieldOption) => `- ${yieldOption}`),
    "",
    "Debate formats:",
    ...Object.values(COMMITTEE_DEBATE_FORMATS).map((format) => `- ${format.label} (${format.type}): ${format.rules.join(" ")}`),
    "",
    "Canonical motion verbatims:",
    ...Object.values(COMMITTEE_MOTIONS).map((motion) => `- ${motion}`),
    "",
    "Immediate warnings:",
    ...(procedure.immediateWarnings.length ? procedure.immediateWarnings.map((warning) => `- ${warning}`) : ["- No immediate procedural warning."]),
  ].join("\n");

  return makeResponse(
    canonicalAnswer,
    "high",
    ["Canonical committee context applied", "Procedure model thresholds computed from committee state"],
    ["Raise only in-order motions", "Protect voting options before declaring present and voting"],
  );

}

// BlocMap — alliance strategist
function blocMap(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;
  const alliesStr = ctx.allies.length > 0 ? ctx.allies.map((a) => `🟢 **${a}** — Core ally`).join("\n") : "🔴 No allies identified yet";
  const opponentsStr = ctx.opponents.length > 0 ? ctx.opponents.map((o) => `🔴 **${o}** — Opposing position`).join("\n") : "⚪ No opponents identified yet";

  const answer = [
    `🗺️ **BlocMap Analysis**`,
    ``,
    `**Your Bloc:** ${ctx.bloc || "Not defined"}`,
    ``,
    `**Known Allies:**`,
    alliesStr,
    ``,
    `**Known Opponents:**`,
    opponentsStr,
    ``,
    `**Strategic Assessment:**`,
    `- Focus on strengthening existing alliances through shared language in draft resolutions.`,
    `- Identify swing states that could be persuaded with compromise language.`,
    `- Monitor opponent bloc for internal divisions to exploit diplomatically.`,
    ``,
    `**Recommended Actions:**`,
    `1. Schedule bilateral meetings with uncommitted delegations.`,
    `2. Prepare compromise language for contested clauses.`,
    `3. Use unmoderated caucus to solidify bloc positions.`,
    `4. Track voting intentions on key operative clauses.`,
    ``,
    `**Regarding:** "${task}"`,
    `Based on your bloc position as ${ctx.country}, prioritize maintaining unity while reaching across the aisle on non-core issues.`,
  ].join("\n");

  return makeResponse(answer, "medium",
    ["Bloc alignment analyzed", "Opposition positions mapped"],
    ["Update country stances", "Identify swing states", "Plan negotiation strategy"]
  );
}

// SpeechForge — speech writer
function speechForge(req: AgentRequest): AgentResponse {
  const { context: ctx, task, extra } = req;
  const tone = extra || "formal and diplomatic";
  const duration = task.match(/(\d+)\s*sec/i)?.[1] || "60";
  const wordCount = Math.floor(parseInt(duration) * 2.5);

  const speechType = task.toLowerCase().includes("opening") ? "opening" :
    task.toLowerCase().includes("closing") ? "closing" :
    task.toLowerCase().includes("rebuttal") ? "rebuttal" : "moderated caucus";

  const templates: Record<string, string> = {
    opening: `Honorable Chair, Distinguished Delegates,

The delegation of ${ctx.country} wishes to address this committee on the critical matter of ${ctx.agenda}.

As a nation that has [direct experience/strong commitment] to this issue, ${ctx.country} believes that [core position]. We recognize that [acknowledge complexity], but firmly maintain that [key argument].

${ctx.active_goal ? `In line with our objectives, we call upon this committee to ${ctx.active_goal.toLowerCase()}.` : "We stand ready to work constructively with all delegations."}

${ctx.allies.length > 0 ? `We are encouraged by the support of our partners — ${ctx.allies.join(", ")} — and invite other delegations to join this effort.` : "We seek to build broad coalitions on this matter."}

The delegation of ${ctx.country} urges this committee to adopt a resolution that is both ambitious and achievable. We yield our remaining time to the Chair.

Thank you.`,

    moderated: `Honorable Chair,

On the matter of ${ctx.agenda}, ${ctx.country} wishes to make the following points.

First, [key argument relevant to caucus topic]. This is not merely a theoretical concern — it has real implications for [affected stakeholders].

Second, we propose [specific solution or framework]. This approach balances [competing interests] while ensuring [key principle].

${ctx.active_goal ? `We must ensure that any resolution ${ctx.active_goal.toLowerCase()}.` : ""}

We call upon all delegations to consider this perspective seriously. Thank you.`,

    rebuttal: `Honorable Chair,

The delegation of ${ctx.country} wishes to respond to the points raised by [opposing delegation].

While we respect the concerns expressed, we must clarify that [counter-argument with evidence]. The data clearly shows that [supporting fact].

Furthermore, the proposed approach by [opponent] would [negative consequence]. In contrast, our position offers [positive alternative].

${ctx.country} remains committed to finding common ground, but not at the expense of [core principle]. Thank you.`,

    closing: `Honorable Chair, Distinguished Delegates,

As we conclude our deliberations on ${ctx.agenda}, the delegation of ${ctx.country} wishes to express its [satisfaction/concern] with the progress made.

We have worked tirelessly to [key achievement/effort]. The resolution before us [assessment — strengths and weaknesses].

${ctx.active_goal ? `We have consistently advocated for ${ctx.active_goal.toLowerCase()}, and we believe this has been reflected in the final text.` : ""}

We call upon all member states to [support/oppose/amend] this resolution in the spirit of [diplomatic principle]. The delegation of ${ctx.country} thanks this committee and yields to the Chair.

Thank you.`,
  };

  const speech = templates[speechType] || templates.moderated;

  const answer = [
    `🎤 **SpeechForge Output**`,
    ``,
    `**Type:** ${speechType.charAt(0).toUpperCase() + speechType.slice(1)} Speech`,
    `**Duration:** ~${duration} seconds (~${wordCount} words)`,
    `**Tone:** ${tone}`,
    ``,
    `---`,
    ``,
    speech,
    ``,
    `---`,
    ``,
    `💡 **Tips:** Replace bracketed sections with specific facts and policy positions. Practice timing before delivery.`,
  ].join("\n");

  return makeResponse(answer, "high",
    [`Template: ${speechType}`, `Target: ${duration}s`, `Tone: ${tone}`],
    ["Create shorter version", "Create stronger version", "Adjust tone"]
  );
}

// ClauseSmith — clause drafter
function clauseSmith(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;
  const t = task.toLowerCase();

  const preambExamples = [
    "Recognizing the urgent need for international cooperation on this matter,",
    "Deeply concerned by the ongoing challenges faced by affected nations,",
    "Recalling General Assembly Resolution A/RES/70/1 and its commitment to sustainable development,",
    "Acknowledging the disproportionate impact on developing nations,",
    "Guided by the principles enshrined in the UN Charter,",
    "Noting with appreciation the work of relevant UN bodies and agencies,",
    "Reaffirming the sovereignty of all member states in implementing agreed frameworks,",
    "Bearing in mind the principle of common but differentiated responsibilities,",
  ];

  const operativeExamples = [
    "Calls upon all member states to develop national action plans aligned with the framework established herein;",
    "Encourages the establishment of a multilateral fund, administered by the UN Development Programme, to support capacity-building in developing nations;",
    "Requests the Secretary-General to convene an annual review conference to assess implementation progress;",
    "Urges developed nations to provide technical assistance and technology transfer to countries in need;",
    "Decides to establish a monitoring mechanism under the auspices of the relevant UN body;",
    "Recommends the creation of regional cooperation frameworks to facilitate knowledge sharing;",
    "Endorses the principle of periodic reporting by member states on their implementation efforts;",
    "Further recommends that civil society organizations be consulted in the development of national strategies;",
  ];

  let clauseType = "operative";
  if (t.includes("preambul")) clauseType = "preambulatory";

  const isAmendment = t.includes("amend");
  const isCompromise = t.includes("compromise") || t.includes("soften");

  let guidance = "";
  if (isAmendment) {
    guidance = `\n**Amendment Guidance:**
• Strike-through deleted text and underline new text
• Friendly amendments require all sponsors' agreement
• Unfriendly amendments require a vote
• Focus on changing specific operative language
• Maintain the overall structure of the resolution`;
  } else if (isCompromise) {
    guidance = `\n**Compromise Language Tips:**
• Replace "shall" with "encourages" or "recommends"
• Add "as appropriate" or "in accordance with national capacities"
• Use "invites" instead of "calls upon"
• Add flexibility clauses: "taking into account national circumstances"
• Consider phased implementation timelines`;
  }

  const answer = [
    `📝 **ClauseSmith Output**`,
    ``,
    `**Type:** ${clauseType.charAt(0).toUpperCase() + clauseType.slice(1)} Clauses`,
    `**Context:** ${ctx.committee} — ${ctx.agenda}`,
    `**Country Position:** ${ctx.country} (${ctx.bloc || "unspecified bloc"})`,
    guidance,
    ``,
    clauseType === "preambulatory" ? `**Sample Preambulatory Clauses:**` : `**Sample Operative Clauses:**`,
    ``,
    ...(clauseType === "preambulatory"
      ? preambExamples.map((c) => `• *${c}*`)
      : operativeExamples.map((c) => `• ${c}`)),
    ``,
    `---`,
    ``,
    `**Drafting Framework for ${ctx.country}:**`,
    ``,
    `Given your position as ${ctx.country}${ctx.active_goal ? ` with the goal to ${ctx.active_goal}` : ""}:`,
    ``,
    `1. **Priority Clause:** [Your most important operative clause here]`,
    `2. **Coalition Clause:** [Language that appeals to your bloc: ${ctx.bloc || "your allies"}]`,
    `3. **Compromise Clause:** [Language that could win over swing states]`,
    `4. **Red Line Clause:** [Language you will NOT accept]`,
    ``,
    `💡 **Tips:** Keep clauses specific, measurable, and actionable. Avoid vague language. Reference existing frameworks where possible.`,
  ].join("\n");

  return makeResponse(answer, "high",
    [`Clause type: ${clauseType}`, "Diplomatic language applied", "Country position aligned"],
    ["Draft specific clause text", "Review for consistency", "Prepare amendment strategy"]
  );
}

// VoteCalc — vote predictor
function voteCalc(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;
  const allyCount = ctx.allies.length;
  const opponentCount = ctx.opponents.length;

  const estimatedSupport = allyCount > 0
    ? Math.min(95, 40 + allyCount * 12)
    : 35;

  const riskLevel = opponentCount > 2 ? "HIGH" : opponentCount > 0 ? "MEDIUM" : "LOW";

  const answer = [
    `📊 **VoteCalc Analysis**`,
    ``,
    `**Query:** "${task}"`,
    ``,
    `**Estimated Support:** ${estimatedSupport}% (based on known positions)`,
    `**Risk Level:** ${riskLevel}`,
    ``,
    `**Support Breakdown:**`,
    `• 🟢 Likely Yes: ${allyCount} confirmed allies + estimated swing votes`,
    `• 🔴 Likely No: ${opponentCount} identified opponents`,
    `• ⚪ Undecided: Remaining delegations`,
    ``,
    `**Risk Factors:**`,
    opponentCount > 0
      ? `• Active opposition from: ${ctx.opponents.join(", ")}`
      : `• No active opposition identified`,
    allyCount > 0
      ? `• Strong support base from: ${ctx.allies.join(", ")}`
      : `• ⚠️ No confirmed allies — prioritize coalition building`,
    ``,
    `**Wording Sensitivity:**`,
    `• "Calls upon" → Moderate resistance expected`,
    `• "Encourages" → Higher passage probability`,
    `• "Demands" → High resistance, may fail`,
    `• "Recommends" → Best chance of consensus`,
    ``,
    `**Strategic Recommendations:**`,
    `1. ${estimatedSupport > 60 ? "Current language likely to pass. Consider strengthening." : "Need more support. Soften language or build alliances."}`,
    `2. ${riskLevel === "HIGH" ? "Address opponent concerns with compromise amendments." : "Maintain current trajectory."}`,
    `3. Target undecided delegations during unmoderated caucus.`,
    `4. Consider splitting contentious clauses for separate votes.`,
  ].join("\n");

  return makeResponse(answer, "medium",
    ["Based on known ally/opponent data", "Estimates may shift with negotiations"],
    ["Update bloc positions for accuracy", "Test alternative wording", "Identify swing delegations"]
  );
}

// NoteScribe — note compressor
function noteScribe(req: AgentRequest): AgentResponse {
  const { task } = req;
  const rawNotes = task;

  const sentences = rawNotes.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 3);
  const bullets = sentences.map((s) => `• ${s.charAt(0).toUpperCase() + s.slice(1)}`);

  const actionItems = sentences
    .filter((s) => /\b(need|must|should|will|action|todo|task|follow up|prepare|draft|contact)\b/i.test(s))
    .map((s) => `☐ ${s}`);

  const decisions = sentences
    .filter((s) => /\b(decided|agreed|resolved|confirmed|approved|rejected)\b/i.test(s))
    .map((s) => `✓ ${s}`);

  const answer = [
    `📋 **NoteScribe Output**`,
    ``,
    `**Cleaned Notes:**`,
    ...bullets,
    ``,
    actionItems.length > 0 ? `**Action Items:**\n${actionItems.join("\n")}` : "**Action Items:** None identified",
    ``,
    decisions.length > 0 ? `**Decisions:**\n${decisions.join("\n")}` : "**Decisions:** None identified",
    ``,
    `**Summary:** ${sentences.length} points extracted from raw notes.`,
  ].join("\n");

  return makeResponse(answer, "high",
    ["Notes parsed and structured", "Action items extracted"],
    ["Add to context vault", "Share with bloc partners", "Set reminders"]
  );
}

// IntelLens — research analyst
function intelLens(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;

  const answer = [
    `🔍 **IntelLens Analysis**`,
    ``,
    `**Research Query:** "${task}"`,
    `**Committee Context:** ${ctx.committee} — ${ctx.agenda}`,
    ``,
    `**Key Areas to Research:**`,
    `1. **Country Position:** ${ctx.country}'s official stance, voting history, and policy papers on ${ctx.agenda}`,
    `2. **Bloc Dynamics:** Current positions of ${ctx.bloc || "relevant"} member states`,
    `3. **Precedent Resolutions:** Previous GA/SC resolutions on related topics`,
    `4. **Expert Reports:** UN reports, academic papers, and NGO assessments`,
    `5. **Opposition Analysis:** Key arguments from opposing blocs`,
    ``,
    `**Research Checklist:**`,
    `☐ Review ${ctx.country}'s recent UNGA statements on this topic`,
    `☐ Check voting records on related resolutions`,
    `☐ Identify key statistics and data points for speeches`,
    `☐ Map stakeholder interests and red lines`,
    `☐ Review relevant SDGs and international frameworks`,
    `☐ Analyze media coverage and public opinion trends`,
    ``,
    `**Intelligence from Current Context:**`,
    ctx.latest_updates.length > 0
      ? ctx.latest_updates.map((u) => `• ${u}`).join("\n")
      : `• No intelligence logged yet. Start gathering information.`,
    ``,
    `💡 **Tip:** Use the Export Center to copy your context pack and paste it into an external AI for deeper research assistance.`,
  ].join("\n");

  return makeResponse(answer, "medium",
    ["Research framework generated", "Based on available context"],
    ["Conduct deeper research", "Update context with findings", "Share intelligence with bloc"]
  );
}

// MemoryCore — state manager
function memoryCore(req: AgentRequest): AgentResponse {
  const { context: ctx, task } = req;

  const answer = [
    `🧠 **MemoryCore Update**`,
    ``,
    `**Current State Snapshot:**`,
    `• Committee: ${ctx.committee}`,
    `• Agenda: ${ctx.agenda}`,
    `• Country: ${ctx.country} (${ctx.role})`,
    `• Phase: ${ctx.current_phase.replace(/_/g, " ")}`,
    `• Bloc: ${ctx.bloc || "Unaffiliated"}`,
    ``,
    `**Active Goal:** ${ctx.active_goal || "None set"}`,
    ``,
    `**Alliance State:** ${ctx.allies.length} allies, ${ctx.opponents.length} opponents`,
    ``,
    `**Recent Updates:** ${ctx.latest_updates.length > 0 ? ctx.latest_updates.slice(-3).join(" | ") : "None"}`,
    ``,
    `**Pending Action:** ${ctx.next_action_needed || "None"}`,
    ``,
    `**Memory Compression:**`,
    `${ctx.country} in ${ctx.committee} on "${ctx.agenda}". Phase: ${ctx.current_phase}. Goal: ${ctx.active_goal || "TBD"}. Allies: ${ctx.allies.join(", ") || "none"}. Next: ${ctx.next_action_needed || "TBD"}.`,
    ``,
    `**Regarding:** "${task}"`,
    `State has been reviewed and is current.`,
  ].join("\n");

  return makeResponse(answer, "high",
    ["State snapshot taken", "Memory compressed"],
    ["Update context pack", "Log new intelligence", "Set next action"]
  );
}

// Main agent dispatcher
export function executeAgent(agentName: AgentName, request: AgentRequest): AgentResponse {
  switch (agentName) {
    case "SessionLead": return sessionLead(request);
    case "RuleForge": return ruleForge(request);
    case "BlocMap": return blocMap(request);
    case "SpeechForge": return speechForge(request);
    case "ClauseSmith": return clauseSmith(request);
    case "VoteCalc": return voteCalc(request);
    case "NoteScribe": return noteScribe(request);
    case "IntelLens": return intelLens(request);
    case "MemoryCore": return memoryCore(request);
    default: return sessionLead(request);
  }
}

export async function executeAgentAsync(agentName: AgentName, request: AgentRequest): Promise<AgentResponse> {
  try {
    const systemPrompt = getAgentSystemPrompt(agentName, request.context);
    const response = await aiOrchestrator.generate({
      task: agentName === "ClauseSmith" ? "clause-strategy"
        : agentName === "BlocMap" ? "coalition-analysis"
        : agentName === "VoteCalc" ? "sponsor-prediction"
        : agentName === "RuleForge" ? "chair-risk"
        : agentName === "IntelLens" ? "country-intelligence"
        : "general",
      context: request.context,
      strategicMode: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.task },
      ],
      maxTokens: 1200,
      temperature: 0.2,
    });
    if (response.error?.code === "NO_PROVIDER") return executeAgent(agentName, request);
    return {
      answer: response.content,
      confidence: response.confidence,
      reasons: [
        `${response.provider} ${response.model}`,
        response.cached ? "AI cache hit" : response.fallbackUsed ? "Fallback provider used" : "Live AI response",
      ],
      follow_up_actions: [],
    };
  } catch (e) {
    if ((e as Error).message === "NO_KEY") {
      return executeAgent(agentName, request);
    }
    return {
      ...executeAgent(agentName, request),
      confidence: "medium",
      reasons: ["AI provider unavailable; fell back to local deterministic logic"],
    };
  }
}
