import type { StoredCommittee } from "../../types";
import { buildProcedureModel, estimateScrappingRisk } from "../procedureRules";
import type { ProceduralMomentum } from "./types";

export function buildProceduralMomentum(committee: StoredCommittee): ProceduralMomentum {
  const procedure = buildProcedureModel(committee.contextPack, committee.blocEntries, committee.clauses);
  const scrapping = estimateScrappingRisk(committee.clauses);
  const phase = committee.contextPack.current_phase;
  const support = committee.blocEntries.filter((entry) => entry.stance === "ally").length;
  const swings = committee.blocEntries.filter((entry) => entry.stance === "swing").length;
  const momentum: ProceduralMomentum["momentum"] =
    phase === "voting" ? "force_vote"
    : phase === "amendment" || scrapping.risk === "high" ? "defend_text"
    : phase === "unmoderated_caucus" || phase === "drafting" ? "draft_quietly"
    : support < Math.max(2, swings) ? "build_support"
    : "slow_down";

  return {
    phase,
    recommendedMotion: procedure.recommendedFormat.motionTemplate,
    quorumMet: procedure.quorumMet,
    simpleMajorityNeeded: procedure.simpleMajorityNeeded,
    formalPaperworkVotesNeeded: procedure.formalPaperworkVotesNeeded,
    scrappingRisk: scrapping.risk,
    momentum,
    warnings: [...procedure.immediateWarnings, scrapping.explanation].filter(Boolean).slice(0, 6),
  };
}
