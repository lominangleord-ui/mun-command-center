import type { StoredCommittee } from "../../types";
import type { ResolutionEvolution } from "./types";

export function buildResolutionEvolution(committee: StoredCommittee): ResolutionEvolution {
  const clauses = committee.clauses.slice(0, 12);
  const vulnerable = clauses.filter((clause) =>
    clause.amendments.length > 0 || /sanction|enforce|condemn|intervention|mandate|inspect/i.test(clause.text)
  );
  const protectedClauses = clauses.filter((clause) =>
    /capacity|humanitarian|reconstruction|un charter|sovereignty|voluntary|technical assistance/i.test(clause.text)
  );
  const amendmentPressure = Math.min(100, vulnerable.length * 18 + clauses.reduce((sum, clause) => sum + clause.amendments.length * 8, 0));
  return {
    activeClauseCount: clauses.length,
    amendmentPressure,
    vulnerableClauses: vulnerable.map((clause) => clause.text.slice(0, 180)).slice(0, 5),
    protectedClauses: protectedClauses.map((clause) => clause.text.slice(0, 180)).slice(0, 5),
    draftingAdvice: amendmentPressure > 55
      ? "Stabilize the draft with sovereignty safeguards and implementation feasibility before seeking more sponsors."
      : clauses.length === 0
      ? "Draft one low-friction operative clause that pairs state capacity with humanitarian access."
      : "Use existing low-risk clauses as sponsor anchors before introducing enforcement-heavy text.",
  };
}
