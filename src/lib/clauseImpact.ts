import type { ClauseImpact, ContextPack, BlocEntry } from "../types";

export function simulateClauseImpact(text: string, ctx: ContextPack, entries: BlocEntry[]): ClauseImpact {
  const lower = text.toLowerCase();
  const themes = {
    climate: /(climate|environment|emission|carbon|sustainability|green)/i.test(text),
    security: /(security|military|force|defense|intervention|peacekeeping|disarmament)/i.test(text),
    economic: /(economic|trade|sanction|finance|debt|tariff|investment)/i.test(text),
    humanitarian: /(humanitarian|refugee|aid|human rights|relief|protection)/i.test(text),
    sovereignty: /(sovereignty|non-interference|self-determination|domestic)/i.test(text),
    technology: /(technology|cyber|ai|digital|innovation)/i.test(text),
  };

  // Tone analysis
  const aggressive = /(condemn|demand|reject|destroy|crush)/i.test(text);
  const cooperative = /(cooperate|partnership|encourage|invite|recommend)/i.test(text);
  const binding = /(shall|must|mandatory|obligated|require)/i.test(text);

  const allies = entries.filter((e) => e.stance === "ally");
  const opponents = entries.filter((e) => e.stance === "opponent");
  const swings = entries.filter((e) => e.stance === "swing");

  // Heuristic scoring
  let countriesGained = 0;
  let countriesLost = 0;
  if (themes.humanitarian || themes.climate) countriesGained += Math.min(swings.length, 2);
  if (themes.sovereignty) countriesGained += 1;
  if (themes.security && aggressive) countriesLost += Math.min(opponents.length, 2);
  if (binding && themes.economic) countriesLost += 1;
  if (cooperative) countriesGained += 1;

  let amendmentRisk = 25;
  if (themes.security) amendmentRisk += 25;
  if (themes.economic) amendmentRisk += 15;
  if (binding) amendmentRisk += 15;
  if (aggressive) amendmentRisk += 15;
  if (cooperative) amendmentRisk -= 10;
  amendmentRisk = Math.max(5, Math.min(95, amendmentRisk));

  const sponsorProbability = Math.min(95, 30 + allies.length * 12 + (cooperative ? 15 : 0) - (aggressive ? 20 : 0));

  let blocReaction = "Mixed reactions expected";
  if (themes.security && aggressive) blocReaction = "Security bloc likely opposes; humanitarian bloc neutral";
  else if (themes.climate) blocReaction = "Environmental bloc supportive; oil-producers cautious";
  else if (themes.sovereignty) blocReaction = "G77 supportive; Western bloc may seek amendments";
  else if (themes.humanitarian) blocReaction = "Broad sympathy expected, but funding will be debated";
  else if (themes.economic) blocReaction = "Developing nations cautious about implementation cost";

  // Bug 1 fix: anchor calculations to committeeSize, not raw ally counts
  const size = ctx.committeeSize ?? 193;
  const allyRatio = allies.length / size;
  const oppRatio = opponents.length / size;
  const baseConfidence = 50 + allyRatio * 200 - oppRatio * 300; // scales properly for any committee size
  const voteConfidence = Math.max(10, Math.min(95, baseConfidence + (cooperative ? 10 : 0) - (aggressive ? 15 : 0) - (binding ? 10 : 0)));

  if (cooperative) countriesGained += 1;

  const likelyObjections: string[] = [];
  if (themes.security) likelyObjections.push("Sovereignty concerns from non-aligned states");
  if (themes.economic) likelyObjections.push("Funding mechanism unclear");
  if (binding) likelyObjections.push("Implementation timeline missing");
  if (aggressive) likelyObjections.push("Tone may alienate moderate states");
  if (themes.climate && !themes.economic) likelyObjections.push("No financing for developing nations");
  if (likelyObjections.length === 0) likelyObjections.push("Scope and definitions need clarification");

  const diplomaticToneRisk = aggressive ? 75 : binding ? 45 : cooperative ? 15 : 30;

  // Country-name awareness boost
  if (ctx.country) {
    const own = ctx.country.toLowerCase();
    if (lower.includes(own)) likelyObjections.push("Self-referential — may appear partisan");
  }

  return {
    countriesGained,
    countriesLost,
    amendmentRisk,
    sponsorProbability,
    blocReaction,
    voteConfidence,
    likelyObjections: likelyObjections.slice(0, 5),
    diplomaticToneRisk,
  };
}
