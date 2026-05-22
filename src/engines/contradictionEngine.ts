import type { ContextPack } from "../types";

// ─── Contradiction Exposure Engine ───
// Detects when a delegate's positions, clauses, or speeches contradict
// their own stated policy, known alliances, or the agenda reality.

export interface Contradiction {
  id: string;
  severity: "critical" | "warning" | "info";
  type: "policy_inconsistency" | "alliance_conflict" | "sovereignty_violation" | "enforcement_gap" | "credibility_risk" | "bloc_fracture";
  title: string;
  description: string;
  detail: string;
  affectedParties: string[];
  diplomaticCost: string;
  mitigation: string;
  mitigationText: string;
}

// Known contradiction patterns
const CONTRADICTION_PATTERNS: Array<{
  type: Contradiction["type"];
  check: (ctx: ContextPack) => boolean;
  generate: (ctx: ContextPack) => Contradiction;
}> = [
  {
    type: "policy_inconsistency",
    check: (ctx) => {
      const isDeveloping = ["G77", "NAM", "African Union", "Arab League"].includes(ctx.bloc);
      const agenda = ctx.agenda.toLowerCase();
      const usesEnforcement = /enforce|mandate|compel|binding.*obligation|sanction/i.test(agenda);
      return isDeveloping && usesEnforcement;
    },
    generate: (ctx) => ({
      id: `contra-policy-${Date.now()}`,
      severity: "warning",
      type: "policy_inconsistency",
      title: "Policy-Bloc Misalignment Detected",
      description: `Your delegation's bloc (${ctx.bloc}) typically opposes enforcement-heavy language, but the current agenda framing uses coercive terminology.`,
      detail: `G77/NAM members may view enforcement language as neo-colonial. This could cost you 15-25% support from developing nations.`,
      affectedParties: ["G77 members", "NAM members", "African Union"],
      diplomaticCost: "Loss of developing-nation support; perceived as aligned with Western enforcement agenda",
      mitigation: "Replace enforcement language with capacity-building and voluntary compliance framing",
      mitigationText: "Replace 'mandates enforcement' with 'encourages capacity-building and voluntary compliance mechanisms, with support from willing member states'",
    }),
  },
  {
    type: "sovereignty_violation",
    check: (ctx) => {
      const agenda = ctx.agenda.toLowerCase();
      const supportsIntervention = /interven|military.*action|use.*force|regime.*change/i.test(agenda);
      const claimsSovereignty = /sovereign|sovereignty|non-interference|territorial.*integrity/i.test(agenda);
      return supportsIntervention && claimsSovereignty;
    },
    generate: () => ({
      id: `contra-sov-${Date.now()}`,
      severity: "critical",
      type: "sovereignty_violation",
      title: "Sovereignty-Intervention Contradiction",
      description: "Your position simultaneously supports military intervention and invokes sovereignty/non-interference principles.",
      detail: `This contradiction will be exploited by Russia, China, and many NAM members. They will frame your delegation as hypocritical.`,
      affectedParties: ["Russia", "China", "NAM", "G77"],
      diplomaticCost: "Severe credibility loss; bloc fracture risk; amendment targeting",
      mitigation: "Choose one framing: either sovereignty-respecting with diplomatic tools, OR intervention-supporting with clear R2P justification",
      mitigationText: "If intervention: 'In accordance with the Responsibility to Protect (R2P) doctrine, when a state is manifestly failing to protect its population from mass atrocities, the international community may consider collective action under Chapter VII'",
    }),
  },
  {
    type: "alliance_conflict",
    check: (ctx) => {
      const hasEnemies = ctx.opponents.length > 0;
      const agenda = ctx.agenda.toLowerCase();
      const contradictsAllies = /sanction|isolate|condemn|embargo/i.test(agenda);
      const allyStates = ["China", "Russia", "Iran", "Venezuela", "Syria"];
      const conflictingAllies = ctx.allies.filter((ally) => allyStates.includes(ally));
      return hasEnemies && contradictsAllies && conflictingAllies.length > 0;
    },
    generate: (ctx) => ({
      id: `contra-alliance-${Date.now()}`,
      severity: "warning",
      type: "alliance_conflict",
      title: "Alliance-Position Contradiction",
      description: "Your stated allies include states that would be directly targeted by the sanction/condemnation language in your position.",
      detail: `Sanctioning or condemning states that are in your alliance list creates an immediate credibility crisis. Those allies will either distance themselves or oppose you directly.`,
      affectedParties: ctx.allies.filter((ally) => ["China", "Russia", "Iran", "Venezuela", "Syria"].includes(ally)),
      diplomaticCost: "Ally alienation; loss of coalition support; public contradiction",
      mitigation: "Remove direct sanction language against allied states; use universal/impersonal framing instead",
      mitigationText: "Replace 'sanctions against [ally state]' with 'targeted measures against entities and individuals responsible for violations, regardless of state affiliation, applied through an impartial UN mechanism'",
    }),
  },
  {
    type: "enforcement_gap",
    check: (ctx) => {
      const agenda = ctx.agenda.toLowerCase();
      const promisesEnforcement = /enforce|ensure.*compliance|monitor.*compliance|verify|binding/i.test(agenda);
      const noMechanism = !/mechanism|committee|panel|body|framework|process/i.test(agenda);
      return promisesEnforcement && noMechanism;
    },
    generate: () => ({
      id: `contra-enforce-${Date.now()}`,
      severity: "warning",
      type: "enforcement_gap",
      title: "Enforcement Promise Without Mechanism",
      description: "Your position calls for enforcement/compliance but provides no mechanism to achieve it.",
      detail: `States will attack this as empty rhetoric. The P5 will dismiss it as unimplementable. Developing states will call it Western overreach without substance.`,
      affectedParties: ["P5 members", "Implementation-focused states"],
      diplomaticCost: "Dismissed as unrealistic; loss of credibility; amendment to add mechanism (which you may not control)",
      mitigation: "Add a concrete implementation mechanism: monitoring body, reporting requirements, or phased compliance timeline",
      mitigationText: "Add: 'Establishes a UN-mandated Monitoring and Reporting Mechanism (MRM) with quarterly compliance reviews, supported by a technical assistance fund for states requiring capacity building'",
    }),
  },
  {
    type: "credibility_risk",
    check: (ctx) => {
      const hasPriorContradictions = ctx.latest_updates.some((u) =>
        /contradiction|inconsistent|revers|flip-flop|changed.*position/i.test(u)
      );
      const agenda = ctx.agenda.toLowerCase();
      const radicalShift = /abandon|reverse|withdraw|fundamentally.*change|new.*approach/i.test(agenda);
      return hasPriorContradictions && radicalShift;
    },
    generate: () => ({
      id: `contra-cred-${Date.now()}`,
      severity: "info",
      type: "credibility_risk",
      title: "Repeated Position Shifts Detected",
      description: "Committee memory shows prior contradictions. Another major shift will compound credibility concerns.",
      detail: `Delegates track consistency. If you've shifted positions before, a further shift will be framed as unreliability rather than flexibility.`,
      affectedParties: ["All committee members", "Media observers"],
      diplomaticCost: "Perceived as unreliable negotiating partner; reduced influence in future sessions",
      mitigation: "Frame the shift as an evolution with clear rationale, not a reversal. Acknowledge prior position and explain what changed.",
      mitigationText: "Add preamble: 'Building upon the delegation's previous position on [topic], and in light of new developments including [specific development], the delegation now proposes an evolved approach that...'",
    }),
  },
];

// ─── Run the contradiction engine ───

export function runContradictionEngine(ctx: ContextPack): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const pattern of CONTRADICTION_PATTERNS) {
    if (pattern.check(ctx)) {
      contradictions.push(pattern.generate(ctx));
    }
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  contradictions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return contradictions;
}

// ─── Quick check: is a given speech text contradictory? ───

export function checkSpeechForContradictions(speechText: string, ctx: ContextPack): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const lower = speechText.toLowerCase();

  if (/sovereign|sovereignty|non-interference/i.test(lower) &&
      /interven|military.*force|use.*force|regime.*change/i.test(lower)) {
    contradictions.push({
      id: `speech-contra-${Date.now()}`,
      severity: "critical",
      type: "sovereignty_violation",
      title: "Speech Contradiction: Sovereignty + Intervention",
      description: "Your speech simultaneously invokes sovereignty and military intervention.",
      detail: "This will be immediately flagged by Russia, China, and NAM. Remove one framing.",
      affectedParties: ["Russia", "China", "NAM", "G77"],
      diplomaticCost: "speech credibility destroyed; may become viral clip in committee",
      mitigation: "Pick sovereignty OR intervention. If intervention, ground it in R2P with clear criteria.",
      mitigationText: "Remove sovereignty references. Instead: 'When states fail their people, the international community bears responsibility...'",
    });
  }

  if (/sanction|embargo|isolate|condemn/i.test(lower)) {
    const sanctionedStates = ["china", "russia", "iran", "venezuela", "syria", "north korea", "cuba"];
    const conflictingAllies = ctx.allies.filter((a) =>
      sanctionedStates.includes(a.toLowerCase())
    );
    if (conflictingAllies.length > 0) {
      contradictions.push({
        id: `speech-contra-allies-${Date.now()}`,
        severity: "warning",
        type: "alliance_conflict",
        title: "Speech Contradiction: Sanctioning Allies",
        description: `Your speech calls for sanctions against ${conflictingAllies.join(", ")}, who are in your alliance list.`,
        detail: "This is a direct contradiction. Your allies will be publicly embarrassed and may retaliate.",
        affectedParties: conflictingAllies,
        diplomaticCost: "Immediate ally alienation; public embarrassment",
        mitigation: "Remove specific state references. Use impersonal language about 'entities responsible' or 'actors engaged in violations'.",
        mitigationText: "Replace 'sanctions against [state]' with 'targeted measures against those responsible for violations, applied through established UN procedures'",
      });
    }
  }

  return contradictions;
}
