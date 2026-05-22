// Stance Enforcement / Policy Consistency
// Soft heuristic warnings based on country profile keywords

interface StancePattern {
  country: string;
  conflicts: { pattern: RegExp; reason: string }[];
}

const STANCE_PATTERNS: StancePattern[] = [
  {
    country: "china",
    conflicts: [
      { pattern: /(taiwan|tibet|hong kong|xinjiang|uyghur|sovereignty)/i, reason: "Conflicts with China's sovereignty and non-interference position" },
      { pattern: /(intervention|regime change|democracy promotion)/i, reason: "China opposes external intervention in domestic affairs" },
    ],
  },
  {
    country: "russia",
    conflicts: [
      { pattern: /(nato expansion|sanctions on russia|ukraine support)/i, reason: "Conflicts with Russia's strategic posture" },
      { pattern: /(intervention|regime change)/i, reason: "Russia opposes Western-led intervention" },
    ],
  },
  {
    country: "united states",
    conflicts: [
      { pattern: /(restrict.*free trade|abolish.*nato|disarmament without verification)/i, reason: "Conflicts with US strategic interests" },
    ],
  },
  {
    country: "united kingdom",
    conflicts: [
      { pattern: /(weaken.*security council|abolish.*veto)/i, reason: "UK is a P5 member and defends Security Council prerogatives" },
    ],
  },
  {
    country: "france",
    conflicts: [
      { pattern: /(weaken.*security council|abolish.*veto|undermine.*francophonie)/i, reason: "Conflicts with French strategic interests" },
    ],
  },
  {
    country: "switzerland",
    conflicts: [
      { pattern: /(military force|sanctions|aggressive|condemn)/i, reason: "Switzerland maintains strict neutrality — avoid aggressive language" },
      { pattern: /(coalition|alliance|intervention)/i, reason: "Switzerland avoids alignment with military coalitions" },
    ],
  },
  {
    country: "india",
    conflicts: [
      { pattern: /(kashmir|pakistan support|csto)/i, reason: "Sensitive to Kashmir framing — India insists on bilateral resolution" },
      { pattern: /(climate burden|emission caps without finance)/i, reason: "India opposes burden-sharing without climate finance for developing nations" },
    ],
  },
  {
    country: "saudi arabia",
    conflicts: [
      { pattern: /(human rights enforcement|women's rights mandate|democracy promotion)/i, reason: "Sensitive to external human rights pressure" },
      { pattern: /(yemen criticism|iran cooperation)/i, reason: "Conflicts with Saudi regional posture" },
    ],
  },
  {
    country: "iran",
    conflicts: [
      { pattern: /(israel cooperation|us alignment|nuclear restrictions without lifting sanctions)/i, reason: "Conflicts with Iran's strategic posture" },
    ],
  },
  {
    country: "north korea",
    conflicts: [
      { pattern: /(denuclearization|sanctions|human rights)/i, reason: "DPRK rejects external pressure on these issues" },
    ],
  },
  {
    country: "brazil",
    conflicts: [
      { pattern: /(amazon enforcement|external monitoring of forests)/i, reason: "Brazil insists on sovereignty over the Amazon" },
    ],
  },
  {
    country: "south africa",
    conflicts: [
      { pattern: /(condemn russia|condemn china)/i, reason: "South Africa pursues a non-aligned stance" },
    ],
  },
  {
    country: "japan",
    conflicts: [
      { pattern: /(offensive military|nuclear weapons)/i, reason: "Japan's pacifist constitution restricts offensive military language" },
    ],
  },
  {
    country: "germany",
    conflicts: [
      { pattern: /(unilateral military|nuclear sharing)/i, reason: "Germany strongly favors multilateral approaches" },
    ],
  },
];

const TONE_PATTERNS = [
  { pattern: /(condemn|denounce|reject outright|destroy|crush|overthrow)/i, severity: "high" as const, reason: "Highly aggressive language — may damage diplomatic standing" },
  { pattern: /(must|demand|insist|urgently|immediately)/i, severity: "medium" as const, reason: "Forceful language — consider softening for swing states" },
  { pattern: /(unacceptable|illegitimate|illegal)/i, severity: "high" as const, reason: "Strong moral framing — consider neutral diplomatic language" },
];

export interface StanceWarning {
  country: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

export function checkStance(text: string, country: string): StanceWarning[] {
  if (!text || !country) return [];
  const warnings: StanceWarning[] = [];
  const lower = country.toLowerCase();

  // Check country-specific conflicts
  const profile = STANCE_PATTERNS.find((p) => p.country === lower);
  if (profile) {
    for (const conflict of profile.conflicts) {
      if (conflict.pattern.test(text)) {
        warnings.push({ country, reason: conflict.reason, severity: "high" });
      }
    }
  }

  // Check tone for any country (especially neutral ones)
  for (const tone of TONE_PATTERNS) {
    if (tone.pattern.test(text)) {
      // Switzerland is extra strict
      const isNeutralCountry = ["switzerland", "sweden", "ireland", "austria", "finland"].includes(lower);
      if (tone.severity === "high" || isNeutralCountry) {
        warnings.push({ country, reason: tone.reason, severity: tone.severity });
        break; // one tone warning is enough
      }
    }
  }

  return warnings;
}

export function checkBlocAlignment(text: string, allies: string[]): StanceWarning[] {
  if (!allies.length) return [];
  const warnings: StanceWarning[] = [];
  // Detect language likely to fracture bloc consensus
  if (/(against my own bloc|isolate|abandon|diverge)/i.test(text)) {
    warnings.push({
      country: "Bloc",
      reason: `This language may weaken alignment with ${allies.slice(0, 2).join(", ")}`,
      severity: "medium",
    });
  }
  return warnings;
}
