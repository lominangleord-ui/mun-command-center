import type { StoredCommittee } from "../../types";
import { normalizeAgenda } from "../intelligence/agendaNormalization";
import { getCountryDoctrine } from "../intelligence/countryDoctrine";

export function buildCountryDoctrineMemory(committee: StoredCommittee): string[] {
  const ctx = committee.contextPack;
  const agenda = normalizeAgenda(ctx.agenda);
  const countries = [ctx.country, ...committee.blocEntries.map((entry) => entry.country)]
    .filter(Boolean)
    .slice(0, 18);
  return countries.map((country) => {
    const entry = committee.blocEntries.find((item) => item.country.toLowerCase() === country.toLowerCase());
    const intel = committee.countryIntel.find((item) => item.country.toLowerCase() === country.toLowerCase());
    const doctrine = getCountryDoctrine(country, intel, entry, agenda);
    return [
      `${country}: ${doctrine.agendaPosture}`,
      `priorities=${doctrine.priorities.slice(0, 3).join("; ") || "low-source fallback"}`,
      `redLines=${doctrine.redLines.slice(0, 3).join("; ") || "not recorded"}`,
      `framing=${doctrine.preferredFraming.slice(0, 2).join("; ") || "balanced UN wording"}`,
      `confidence=${doctrine.confidence}; freshness=${doctrine.freshnessLabel}`,
    ].join(" | ");
  });
}
