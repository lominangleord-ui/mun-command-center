import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { getFlag, getCountry, searchCountries } from "../../lib/countries";
import type { CountryIntel, StoredCommittee } from "../../types";
import ExternalAIBridge from "../../components/ExternalAIBridge";
import DossierCard from "../../features/country-intelligence/components/DossierCard";
import { normalizeAgenda } from "../../lib/intelligence/agendaNormalization";
import { getCountryDoctrine } from "../../lib/intelligence/countryDoctrine";

function defaultIntel(country: string, blocEntry?: { riskLevel: number; supportLevel: number; stance?: string; contactStatus?: string; bloc?: string }, agenda = ""): CountryIntel {
  const info = getCountry(country);
  const bloc = info?.defaultBloc || "";
  const s = blocEntry?.supportLevel ?? 50;
  const r = blocEntry?.riskLevel ?? 30;
  const stance = blocEntry?.stance || "neutral";

  // Country-specific strategic interests based on region + support level
  const strategicInterests: string[] = [];
  if (bloc === "Western") { strategicInterests.push("Rule-based international order"); strategicInterests.push("Alliance cohesion"); strategicInterests.push("Trade liberalisation"); }
  else if (bloc === "G77") { strategicInterests.push("Sovereign development space"); strategicInterests.push("Climate finance equity"); if (s > 60) strategicInterests.push("Technology transfer access"); else strategicInterests.push("Multilateral support access"); }
  else if (bloc === "Arab Group") { strategicInterests.push("Regional security"); strategicInterests.push("Energy market stability"); strategicInterests.push("Sovereignty protections"); }
  else if (bloc === "NAM") { strategicInterests.push("Non-alignment integrity"); strategicInterests.push("South-South cooperation"); strategicInterests.push("Development sovereignty"); }
  else { strategicInterests.push("Regional stability"); strategicInterests.push("Economic resilience"); strategicInterests.push("Strategic autonomy"); }

  const countryDoctrines: Record<string, { interests: string[]; rivals: string[]; dependencies: string[]; concerns: string[]; notes: string }> = {
    "united states": { interests: ["Alliance leadership", "Verification mechanisms", "Sanctions credibility"], rivals: ["China", "Russia", "Iran"], dependencies: ["Congressional optics", "NATO cohesion", "Market access"], concerns: ["Credibility of enforcement", "Burden sharing"], notes: "Prefers enforceable mechanisms, but will trade scope and timelines to keep coalition breadth." },
    china: { interests: ["Sovereignty protections", "Development-first implementation", "Non-interference"], rivals: ["United States", "Japan", "India"], dependencies: ["Trade routes", "Energy imports", "G77 legitimacy"], concerns: ["External monitoring", "Technology restrictions"], notes: "Accepts broad principles while narrowing intrusive reporting, sanctions, and attribution language." },
    russia: { interests: ["Security parity", "Anti-sanctions language", "P5 prerogatives"], rivals: ["United States", "United Kingdom", "Ukraine"], dependencies: ["Energy leverage", "Security partnerships", "P5 status"], concerns: ["NATO framing", "Country-specific condemnation"], notes: "Uses sovereignty and procedural objections to slow hostile text; expects reciprocal obligations." },
    india: { interests: ["Strategic autonomy", "Development equity", "Technology access"], rivals: ["Pakistan", "China"], dependencies: ["Energy security", "Technology transfer", "Diaspora optics"], concerns: ["Kashmir framing", "Unequal climate burdens"], notes: "Keeps options open until implementation burden, equity language, and sovereignty safeguards are clear." },
    pakistan: { interests: ["Security parity", "Development assistance", "OIC credibility"], rivals: ["India"], dependencies: ["Debt relief", "Security assistance", "Regional legitimacy"], concerns: ["Kashmir language", "Counterterrorism asymmetry"], notes: "Seeks balancing language against India and avoids text that isolates its security posture." },
    "saudi arabia": { interests: ["Energy market stability", "Regime security", "Regional influence"], rivals: ["Iran"], dependencies: ["Oil markets", "US security relationship", "OIC legitimacy"], concerns: ["Human-rights monitoring", "Iran-aligned framing"], notes: "Supports humanitarian or development language while stripping external scrutiny clauses." },
    iran: { interests: ["Sanctions relief", "Sovereignty", "Regional deterrence"], rivals: ["United States", "Israel", "Saudi Arabia"], dependencies: ["Energy exports", "Regional partners", "Sanctions relief"], concerns: ["Coercive measures", "Nuclear restrictions"], notes: "Rejects coercive language unless equal-treatment or sanctions-relief framing is present." },
    brazil: { interests: ["Amazon sovereignty", "South-South cooperation", "Development finance"], rivals: [], dependencies: ["Agricultural exports", "Climate finance", "Regional leadership"], concerns: ["External forest monitoring", "Unfunded mandates"], notes: "Often bridges ambitious language with sovereignty-protective implementation wording." },
    "south africa": { interests: ["African leadership", "Non-alignment", "Development justice"], rivals: [], dependencies: ["African Union legitimacy", "BRICS ties", "Development finance"], concerns: ["One-sided condemnation", "Bloc fracture"], notes: "Mediates between rights principles and non-aligned resistance to country targeting." },
    israel: { interests: ["Security guarantees", "Counterterrorism", "Hostage/civilian protection"], rivals: ["Iran", "Syria"], dependencies: ["US backing", "Regional normalization", "Security cooperation"], concerns: ["One-sided ceasefire language", "External investigations"], notes: "Needs explicit security carve-outs before accepting humanitarian obligations." },
  };
  const doctrine = countryDoctrines[country.toLowerCase()];
  if (doctrine) {
    strategicInterests.splice(0, strategicInterests.length, ...doctrine.interests);
  }
  const tacticalDoctrine = getCountryDoctrine(country, undefined, blocEntry ? {
    id: country,
    country,
    stance: (blocEntry.stance as any) || "neutral",
    supportLevel: s,
    riskLevel: r,
    notes: "",
    contactStatus: (blocEntry.contactStatus as any) || "none",
    bloc: blocEntry.bloc || bloc,
    updatedAt: Date.now(),
  } : undefined, normalizeAgenda(agenda || "Unspecified agenda"));

  const votingTendencies = stance === "ally" && s > 70
    ? `Consistent ${bloc} voter. Supports bloc consensus with ${s}% alignment.`
    : stance === "swing"
    ? `Transactional voting pattern. Demands explicit concessions before committing. Support at ${s}% but volatile.`
    : stance === "opponent"
    ? `Active opposition on key votes. ${r > 60 ? "High coordination risk with opposition bloc." : "Limited but present opposition footprint."}`
    : `Independent streak. Evaluates proposals case-by-case. ${r < 30 ? "Low risk of sudden realignment." : "Monitor for late-session shifts."}`;

  return {
    country,
    ideology: tacticalDoctrine.bloc || bloc || "Independent",
    strategicInterests: tacticalDoctrine.priorities.length ? tacticalDoctrine.priorities : strategicInterests,
    allies: tacticalDoctrine.allies.length ? tacticalDoctrine.allies : (bloc ? [`${bloc} core partners`, `Regional neighbours`] : ["Bilateral partners"]),
    rivals: tacticalDoctrine.rivalries.length ? tacticalDoctrine.rivalries : (doctrine?.rivals ?? (bloc === "Western" ? ["Russia", "China"] : bloc === "G77" ? ["High-income donor blocs"] : [])),
    dependencies: tacticalDoctrine.dependencies.length ? tacticalDoctrine.dependencies : (doctrine?.dependencies ?? ["Trade interdependence", "Energy security", "Institutional access"]),
    regionalConcerns: tacticalDoctrine.redLines.length ? tacticalDoctrine.redLines : (doctrine?.concerns ?? (info?.defaultBloc === "Arab Group" ? ["Territorial integrity", "Water security"] : info?.defaultBloc === "Western" ? ["Alliance credibility", "Democratic backsliding"] : ["Sovereignty", "Resource governance"])),
    votingTendencies,
    diplomacyNotes: tacticalDoctrine.negotiationStyle || doctrine?.notes || tacticalDoctrine.agendaPosture,
    riskLevel: r,
    supportLevel: s,
  };
}

export default function CountryIntelligence() {
  const { activeCommittee, updateCommittee, addTimelineEvent } = useApp();
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; flag: string }[]>([]);

  // Available countries: tracked + all known
  const blocEntries = activeCommittee?.blocEntries || [];
  const trackedCountries = useMemo(() => blocEntries.map((e) => e.country), [blocEntries]);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;

  const ctx = activeCommittee.contextPack;
  const intel = activeCommittee.countryIntel;

  const handleSelect = async (country: string) => {
    setSelectedCountry(country);
    const existing = intel.find((i) => i.country.toLowerCase() === country.toLowerCase());
    if (!existing) {
      const blocEntry = activeCommittee.blocEntries.find((e) => e.country.toLowerCase() === country.toLowerCase());
      const newIntel = defaultIntel(country, blocEntry, activeCommittee.contextPack.agenda);
      await updateCommittee((c: StoredCommittee) => ({ ...c, countryIntel: [newIntel, ...c.countryIntel] }));
      await addTimelineEvent({ type: "intelligence", title: `Intel profile: ${country}`, description: `Created intelligence profile`, icon: "🔍" });
    }
  };

  const updateIntel = (country: string, updates: Partial<CountryIntel>) => {
    updateCommittee((c: StoredCommittee) => ({
      ...c, countryIntel: c.countryIntel.map((i) => i.country.toLowerCase() === country.toLowerCase() ? { ...i, ...updates } : i),
    }));
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (v.length >= 2) setSuggestions(searchCountries(v).slice(0, 6).map((c) => ({ name: c.name, flag: c.flag })));
    else setSuggestions([]);
  };

  const selected = intel.find((i) => i.country.toLowerCase() === selectedCountry.toLowerCase());
  const selectedInfo = selectedCountry ? getCountry(selectedCountry) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">Country Intelligence Profiles</h1>
        <p className="text-[11px] text-gray-500">Deep-dive intelligence on tracked countries — usable for speeches, lobbying, clauses.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Country list */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-800/40">
            <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <div className="w-1 h-1 rounded-full bg-cyan-400" /> Countries
            </div>
            <div className="relative">
              <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                placeholder="Add country…"
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1 text-[10px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50" />
              {suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-2xl max-h-48 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button key={s.name} onMouseDown={() => { handleSelect(s.name); setSearch(""); setSuggestions([]); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-[10px] text-gray-300 hover:bg-gray-800">
                      <span>{s.flag}</span><span>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {/* Existing profiles first */}
            {intel.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[8px] text-gray-500 uppercase tracking-wider bg-gray-950/40">Profiles ({intel.length})</div>
                {intel.map((i) => (
                  <button key={i.country} onClick={() => setSelectedCountry(i.country)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-800/30 ${selectedCountry === i.country ? "bg-blue-500/10 border-l-2 border-blue-500" : ""}`}>
                    <span className="text-base">{getFlag(i.country)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200 truncate">{i.country}</div>
                      <div className="text-[9px] text-gray-500 truncate">{i.ideology}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* Tracked countries without profile */}
            {trackedCountries.filter((c) => !intel.find((i) => i.country.toLowerCase() === c.toLowerCase())).length > 0 && (
              <div>
                <div className="px-3 py-1 text-[8px] text-gray-500 uppercase tracking-wider bg-gray-950/40">Tracked (no profile)</div>
                {trackedCountries.filter((c) => !intel.find((i) => i.country.toLowerCase() === c.toLowerCase())).map((c) => (
                  <button key={c} onClick={() => handleSelect(c)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-800/30">
                    <span className="text-base">{getFlag(c)}</span>
                    <div className="text-xs text-gray-400 flex-1 truncate">{c}</div>
                    <span className="text-[9px] text-gray-600">+ Profile</span>
                  </button>
                ))}
              </div>
            )}
            {trackedCountries.length === 0 && intel.length === 0 && (
              <div className="p-4 text-center text-[10px] text-gray-600">Search above to add a country profile.</div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-3">
          {selected && selectedInfo ? (
            <>
              {/* Evidence-backed intelligence dossier — primary intel layer */}
              {(() => {
                const blocEntry = activeCommittee.blocEntries.find((e) => e.country.toLowerCase() === selected.country.toLowerCase());
                return (
                  <DossierCard
                    country={selected.country}
                    agenda={ctx.agenda}
                    blocEntry={blocEntry}
                    intel={selected}
                    contextOptions={{
                      selectedCountry: ctx.country,
                      committee: ctx.committee,
                      phase: ctx.current_phase,
                      bloc: ctx.bloc,
                      committeeEntries: activeCommittee.blocEntries,
                      countryIntel: activeCommittee.countryIntel,
                      negotiations: activeCommittee.negotiations,
                    }}
                  />
                );
              })()}

              {/* Editable profile fields — secondary reference layer */}
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 py-1 select-none">
                  <div className="w-1 h-1 rounded-full bg-gray-600" /> Profile Fields (editable)
                  <span className="ml-auto text-gray-600 group-open:hidden">▸ expand</span>
                  <span className="ml-auto text-gray-600 hidden group-open:inline">▾ collapse</span>
                </summary>
                <div className="mt-2 bg-gray-900 border border-gray-800/60 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-800/40">
                  <span className="text-3xl">{selectedInfo.flag}</span>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-white">{selectedInfo.name}</h2>
                    <div className="text-[10px] text-gray-500">{selectedInfo.iso} · {selected.ideology} · Support {selected.supportLevel}% · Risk {selected.riskLevel}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Editable label="Ideology / General Stance" value={selected.ideology} onChange={(v) => updateIntel(selected.country, { ideology: v })} />
                  <ListEdit label="Strategic Interests" items={selected.strategicInterests} onChange={(v) => updateIntel(selected.country, { strategicInterests: v })} color="blue" />
                  <ListEdit label="Allies" items={selected.allies} onChange={(v) => updateIntel(selected.country, { allies: v })} color="emerald" />
                  <ListEdit label="Rivals" items={selected.rivals} onChange={(v) => updateIntel(selected.country, { rivals: v })} color="red" />
                  <ListEdit label="Dependencies" items={selected.dependencies} onChange={(v) => updateIntel(selected.country, { dependencies: v })} color="amber" />
                  <ListEdit label="Regional Concerns" items={selected.regionalConcerns} onChange={(v) => updateIntel(selected.country, { regionalConcerns: v })} color="violet" />
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-wider">Voting Tendencies</label>
                    <textarea value={selected.votingTendencies} onChange={(e) => updateIntel(selected.country, { votingTendencies: e.target.value })}
                      rows={3}
                      className="w-full mt-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-wider">Diplomacy Notes</label>
                    <textarea value={selected.diplomacyNotes} onChange={(e) => updateIntel(selected.country, { diplomacyNotes: e.target.value })}
                      placeholder="Behavioural patterns, contact preferences, key delegates…"
                      rows={3}
                      className="w-full mt-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none" />
                  </div>
                </div>
                </div>
              </details>

              <ExternalAIBridge
                prompt={`Build a tactical lobbying profile for ${selected.country} on the agenda "${ctx.agenda}". Use their ideology (${selected.ideology}), strategic interests (${selected.strategicInterests.join(", ")}), and voting tendencies. Suggest 3 angles to win their support.`}
                context={ctx}
                suggestedModel="ChatGPT" />
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-12 text-center">
              <div className="text-4xl mb-3 opacity-30">🔍</div>
              <p className="text-xs text-gray-500">Select a country from the list to view or build its intelligence profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Editable({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
    </div>
  );
}

function ListEdit({ label, items, onChange, color }: { label: string; items: string[]; onChange: (v: string[]) => void; color: string }) {
  const [input, setInput] = useState("");
  const c: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5", emerald: "border-emerald-500/30 bg-emerald-500/5",
    red: "border-red-500/30 bg-red-500/5", amber: "border-amber-500/30 bg-amber-500/5",
    violet: "border-violet-500/30 bg-violet-500/5",
  };
  return (
    <div className={`rounded-md border p-2 ${c[color]}`}>
      <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="space-y-0.5 mb-1.5">
        {items.length === 0 ? <div className="text-[10px] text-gray-600 italic">None</div> : items.map((it, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px]">
            <span className="text-gray-600">•</span>
            <span className="flex-1 text-gray-300">{it}</span>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 text-[10px]">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onChange([...items, input.trim()]); setInput(""); } }}
          placeholder="Add…"
          className="flex-1 bg-gray-950/40 border border-gray-800/40 rounded px-2 py-0.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { onChange([...items, input.trim()]); setInput(""); } }}
          className="px-1.5 text-[11px] bg-gray-800/60 hover:bg-gray-700 text-gray-300 rounded">+</button>
      </div>
    </div>
  );
}
