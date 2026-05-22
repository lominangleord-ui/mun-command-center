import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import type { ContextPack, BlocEntry } from "../types";
import { REL_META } from "../types";
import { runContradictionEngine, checkSpeechForContradictions } from "../engines/contradictionEngine";
import { computeLeverage } from "../engines/leverageEngine";
import { computeHeatDashboard } from "../engines/heatEngine";
import { matchesAgendaKeywords } from "../engines/agendaOntology";
import { normalizeAgenda } from "../lib/intelligence/agendaNormalization";
import { assessRelationship, buildCommitteeStrategy } from "../lib/intelligence/relationshipModel";
import { buildProcedureModel, estimateScrappingRisk } from "../lib/procedureRules";
import { aiOrchestrator } from "../lib/ai/orchestration/aiOrchestrator";
import { buildSessionContext } from "../lib/strategic-context";

interface CommandResult {
  type: string;
  title: string;
  content: string;
  severity?: "critical" | "warning" | "info";
}

export default function CommandPalette() {
  const { activeCommittee } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandResult[]>([]);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const executeCommand = useCallback(async (cmd: string) => {
    if (!activeCommittee) return;
    setExecuting(true);
    setResults([]);
    await new Promise((r) => setTimeout(r, 250));

    const ctx: ContextPack = { ...activeCommittee.contextPack };
    const normalizedAgenda = normalizeAgenda(ctx.agenda);
    const strategicContext = buildSessionContext(activeCommittee);
    const newResults: CommandResult[] = [];

    if (cmd.includes("contradiction") || cmd.includes("check") || cmd.includes("risk")) {
      const contradictions = runContradictionEngine(ctx);
      newResults.push(contradictions.length > 0 ? {
        type: "contradiction",
        title: `${contradictions.length} contradiction(s) detected`,
        content: contradictions.map((c) => `[${c.severity.toUpperCase()}] ${c.title}\n${c.description}\n-> ${c.mitigation}`).join("\n\n"),
        severity: contradictions[0].severity,
      } : {
        type: "contradiction",
        title: "No contradictions detected",
        content: "No internal contradiction matched the current command heuristics. Still verify draft text against country red lines before voting.",
        severity: "info",
      });
    }

    if (cmd.includes("leverage") || cmd.includes("power") || cmd.includes("strength")) {
      const leverage = computeLeverage(ctx);
      newResults.push({
        type: "leverage",
        title: `Leverage Score: ${leverage.overall}/100`,
        content: [
          `Overall: ${leverage.overall}/100`,
          `Alliance: ${leverage.components.allianceLeverage}`,
          `Bloc: ${leverage.components.blocLeverage}`,
          `Agenda Fit: ${leverage.components.agendaLeverage}`,
          `Swing Influence: ${leverage.components.swingLeverage}`,
          `Moral: ${leverage.components.moralLeverage}`,
          `Enforcement: ${leverage.components.enforcementLeverage}`,
          `Reconstruction: ${leverage.components.reconstructionLeverage}`,
          "",
          "Top Opportunities:",
          ...leverage.topOpportunities.map((o) => `- [${o.impact}] ${o.title}: ${o.action} (${o.targetStates.join(", ")})`),
          "",
          "Top Risks:",
          ...leverage.topRisks.map((r) => `- [${r.impact}] ${r.title}: ${r.mitigation}`),
        ].join("\n"),
      });
    }

    if (cmd.includes("heat") || cmd.includes("tension") || cmd.includes("pressure")) {
      const heat = computeHeatDashboard(ctx);
      newResults.push({
        type: "heat",
        title: `Overall Heat: ${heat.overallHeat}/100`,
        content: [
          `Committee Tension: ${heat.committeeTension.value}/100 [${heat.committeeTension.trend}]`,
          `Bloc Stability: ${heat.blocStability.value}/100`,
          `Amendment Risk: ${heat.amendmentVolatility.value}/100 [${heat.amendmentVolatility.trend}]`,
          `Diplomatic Pressure: ${heat.diplomaticPressure.value}/100 [${heat.diplomaticPressure.trend}]`,
          `Sponsor Stability: ${heat.sponsorFragility.value}/100 [${heat.sponsorFragility.trend}]`,
          "",
          heat.committeeTension.description,
          heat.diplomaticPressure.description,
        ].join("\n"),
      });
    }

    if (cmd.includes("relationship") || cmd.includes("ally") || cmd.includes("enemy")) {
      const syntheticEntries: BlocEntry[] = [
        ...ctx.allies.map((country) => ({ id: country, country, stance: "ally" as const, supportLevel: 70, riskLevel: 25, notes: "", contactStatus: "contacted" as const, updatedAt: Date.now() })),
        ...ctx.opponents.map((country) => ({ id: country, country, stance: "opponent" as const, supportLevel: 20, riskLevel: 70, notes: "", contactStatus: "none" as const, updatedAt: Date.now() })),
      ];
      const entries = activeCommittee.blocEntries.length ? activeCommittee.blocEntries : syntheticEntries;
      const strategy = buildCommitteeStrategy({
        entries,
        intelProfiles: activeCommittee.countryIntel,
        selectedCountry: ctx.country,
        selectedBloc: ctx.bloc,
        agenda: normalizedAgenda,
        negotiations: activeCommittee.negotiations,
      });
      newResults.push({
        type: "relationship",
        title: `Relationship Map (${entries.length} states)`,
        content: [
          "Allies to use:",
          ...(strategy.allies.length ? strategy.allies.map((item) => `- ${item.country}: ${item.reason}; ${item.nextMove}`) : ["- No reliable ally signal yet."]),
          "",
          "Swing states to convert:",
          ...(strategy.swingStates.length ? strategy.swingStates.map((item) => `- ${item.country}: ${item.reason}; ${item.nextMove}`) : ["- No swing signal yet."]),
          "",
          "Avoid / likely opposition:",
          ...(strategy.likelyOpponents.length ? strategy.likelyOpponents.map((item) => `- ${item.country}: ${item.reason}; ${item.nextMove}`) : ["- No hard opposition signal yet."]),
          "",
          "Per-country tactical read:",
          ...entries.map((entry) => {
            const intel = activeCommittee.countryIntel.find((i) => i.country.toLowerCase() === entry.country.toLowerCase());
            const rel = assessRelationship({
              targetCountry: entry.country,
              perspectiveCountry: ctx.country,
              perspectiveBloc: ctx.bloc,
              agenda: normalizedAgenda,
              entry,
              intel,
              negotiations: activeCommittee.negotiations,
            });
            return `${REL_META[rel.label].label} ${entry.country}: role=${rel.tacticalRole}, sponsor=${rel.sponsorProbability}%, oppose=${rel.oppositionProbability}%, bluff=${rel.bluffRisk}%. Say: ${rel.whatToSay} Avoid: ${rel.whatToAvoid}`;
          }),
        ].join("\n"),
      });
    }

    if (cmd.includes("agenda") || cmd.includes("topic")) {
      const compatible = matchesAgendaKeywords(ctx.agenda, ctx.agenda);
      newResults.push({
        type: "agenda",
        title: `Agenda Model: ${normalizedAgenda.confidence.toUpperCase()} confidence`,
        content: [
          `Current Agenda: "${ctx.agenda}"`,
          `Normalized ID: ${normalizedAgenda.normalizedAgendaId}`,
          `Detected Domains: ${normalizedAgenda.detectedDomains.join(", ")}`,
          `Keywords: ${normalizedAgenda.keywords.join(", ") || "none"}`,
          `Committee Phase: ${ctx.current_phase}`,
          `Your Bloc: ${ctx.bloc}`,
          `Keyword Match Weight: ${compatible.weight.toFixed(2)}`,
          "",
          "Agenda Modifiers:",
          ...Object.entries(normalizedAgenda.modifiers).map(([k, v]) => `${k}: ${v.toFixed(2)}`),
          "",
          normalizedAgenda.explanation,
        ].join("\n"),
      });
    }

    if (cmd.includes("procedure") || cmd.includes("motion") || cmd.includes("quorum") || cmd.includes("voting rule")) {
      const procedure = buildProcedureModel(ctx, activeCommittee.blocEntries, activeCommittee.clauses);
      const scrapping = estimateScrappingRisk(activeCommittee.clauses);
      newResults.push({
        type: "procedure",
        title: `Procedure: ${procedure.recommendedFormat.label}`,
        content: [
          `Quorum: ${procedure.knownDelegations}/${procedure.quorumNeeded} tracked (${procedure.quorumMet ? "met" : "not met / verify attendance"})`,
          `Motions need: ${procedure.simpleMajorityNeeded} votes`,
          `Formal paperwork needs: ${procedure.formalPaperworkVotesNeeded} yes votes`,
          `Paperwork scrapping risk: ${scrapping.risk.toUpperCase()} - ${scrapping.explanation}`,
          `Timeline rule: ${procedure.timelinePolicy}`,
          "",
          `Recommended lane: ${procedure.recommendedFormat.label}`,
          procedure.recommendedFormat.tacticalUse,
          `Motion text: ${procedure.recommendedFormat.motionTemplate}`,
          "",
          "Guardrails:",
          ...procedure.recommendedFormat.constraints.map((c) => `- ${c}`),
          ...procedure.immediateWarnings.map((w) => `- WARNING: ${w}`),
          "",
          "Voting options (formal paperwork):",
          ...procedure.votingOptions.map((option) => `- ${option}`),
          "",
          "Points precedence:",
          ...procedure.pointsPrecedence.map((point) => `- ${point}`),
          "",
          "Yield options:",
          ...procedure.yieldOptions.map((item) => `- ${item}`),
          "",
          "Paperwork guardrails:",
          ...procedure.paperworkRules.map((item) => `- ${item}`),
        ].join("\n"),
      });
    }

    if (cmd.includes("ai") || cmd.includes("strategic mode") || cmd.includes("next best move")) {
      const ai = await aiOrchestrator.generate({
        task: "debate-move",
        context: ctx,
        strategicContext,
        strategicMode: true,
        messages: [{
          role: "user",
          content: [
            "Use the supplied committee context and recommend the next best tactical move.",
            `Selected country: ${ctx.country}`,
            `Agenda: ${ctx.agenda}`,
            `Phase: ${ctx.current_phase}`,
            `Goal: ${ctx.active_goal || "unset"}`,
            `Known allies: ${ctx.allies.join(", ") || "none"}`,
            `Known opponents: ${ctx.opponents.join(", ") || "none"}`,
            `Current strategic mode: ${strategicContext.mode}`,
            `Local next-best move: ${strategicContext.nextBestMove}`,
            "Output tactical summary, key intelligence, recommended next move, warnings, and confidence.",
          ].join("\n"),
        }],
        maxTokens: 900,
        cacheTtlMs: 1000 * 60 * 5,
      });
      newResults.push({
        type: "ai",
        title: ai.sourceBasis === "fallback" ? "Strategic Intelligence Mode: Local fallback" : `Strategic Intelligence Mode (${ai.provider}/${ai.model})`,
        content: [
          `Local strategic context: ${strategicContext.nextBestMove}`,
          `Chair lens: ${strategicContext.chairProfile.recommendation}`,
          "",
          ai.content,
        ].join("\n"),
        severity: ai.sourceBasis === "fallback" ? "warning" : "info",
      });
    }

    if (cmd.includes("speech") || cmd.includes("talk")) {
      const speechText = "Sample speech text for contradiction analysis";
      const contradictions = checkSpeechForContradictions(speechText, ctx);
      newResults.push(contradictions.length > 0 ? {
        type: "speech",
        title: `Speech Analysis: ${contradictions.length} issue(s)`,
        content: contradictions.map((c) => `[${c.severity.toUpperCase()}] ${c.title}\n${c.description}\n-> ${c.mitigationText}`).join("\n\n"),
        severity: contradictions[0].severity,
      } : {
        type: "speech",
        title: "Speech passes contradiction check",
        content: "No contradiction matched the sample text. Paste real speech text into the speech tools for meaningful checking.",
      });
    }

    if (newResults.length === 0) {
      newResults.push({
        type: "help",
        title: "Available Commands",
        content: [
          "Type one of these to run tactical analysis:",
          "",
          "- contradiction / check / risk -> Detect policy contradictions",
          "- leverage / power / strength -> Calculate diplomatic leverage",
          "- heat / tension / pressure -> View tactical heat dashboard",
          "- relationship / ally / enemy -> Show agenda-aware relationship map",
          "- agenda / topic -> Analyze normalized agenda model",
          "- speech / talk -> Check speech contradictions",
          "- procedure / motion / quorum -> Handbook-aware rule advice",
          "- ai / strategic mode / next best move -> Provider-backed tactical synthesis",
        ].join("\n"),
      });
    }

    setResults(newResults);
    setExecuting(false);
  }, [activeCommittee]);

  useEffect(() => {
    if (query.length > 2 && open) executeCommand(query.toLowerCase());
  }, [query, open, executeCommand]);

  if (!activeCommittee) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-7 px-2 rounded-lg border border-white/10 bg-white/[0.025] text-[9px] text-gray-500 hover:bg-white/[0.06] hover:text-gray-200 transition-all font-mono"
        title="Command Palette (Ctrl+K)"
      >
        Ctrl K
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-12 right-4 w-[min(560px,calc(100vw-2rem))] max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-white/15 bg-gray-950/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 panel-enter">
            <div className="sticky top-0 bg-gray-950/95 backdrop-blur-xl p-3 border-b border-white/10 z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Tactical Command Center</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["contradiction", "leverage", "heat", "relationship", "agenda", "procedure", "speech", "ai"].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => { setQuery(cmd); executeCommand(cmd); }}
                    className="px-2 py-1 rounded-md bg-white/[0.04] text-[10px] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 border border-white/6 transition-all capitalize"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-b border-white/10">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or question..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 font-mono"
                autoFocus
              />
            </div>

            <div className="p-3 space-y-3">
              {executing && <div className="text-center py-4 text-[11px] text-gray-500">Analyzing...</div>}
              {results.map((r, i) => (
                <div key={i} className="bg-gray-900/50 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-gray-200">{r.title}</div>
                  <pre className="text-[10px] text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">{r.content}</pre>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
