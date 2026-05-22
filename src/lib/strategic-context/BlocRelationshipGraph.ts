import type { StoredCommittee } from "../../types";
import { normalizeAgenda } from "../intelligence/agendaNormalization";
import { assessRelationship } from "../intelligence/relationshipModel";
import type { CountryMemoryCard } from "./types";

export function buildBlocRelationshipGraph(committee: StoredCommittee): CountryMemoryCard[] {
  const ctx = committee.contextPack;
  const agenda = normalizeAgenda(ctx.agenda);
  return committee.blocEntries
    .map((entry) => {
      const intel = committee.countryIntel.find((i) => i.country.toLowerCase() === entry.country.toLowerCase());
      const rel = assessRelationship({
        targetCountry: entry.country,
        perspectiveCountry: ctx.country,
        perspectiveBloc: ctx.bloc,
        agenda,
        entry,
        intel,
        negotiations: committee.negotiations,
      });
      return {
        country: entry.country,
        role: rel.tacticalRole,
        alignmentScore: rel.score,
        sponsorProbability: rel.sponsorProbability,
        oppositionProbability: rel.oppositionProbability,
        bluffRisk: rel.bluffRisk,
        whatToSay: rel.whatToSay,
        whatToAvoid: rel.whatToAvoid,
        nextMove: rel.nextMove,
        warning: rel.warning,
      };
    })
    .sort((a, b) => (b.sponsorProbability + b.alignmentScore) - (a.sponsorProbability + a.alignmentScore))
    .slice(0, 32);
}
