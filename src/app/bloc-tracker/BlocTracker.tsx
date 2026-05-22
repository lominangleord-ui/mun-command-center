import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import type { BlocEntry, RelationshipLabel, Stance, SourcedBlocTrend } from "../../types";
import { stanceToRel, relToStance, relToSupport, REL_META } from "../../types";
import { getFlag, searchCountries, getCountry, REGIONAL_BLOC_PRESETS } from "../../lib/countries";
import WorldMap from "../../components/WorldMap";
import { analyzeBlocTrendsLocally } from "../../lib/services/synthesisService";
import { normalizeAgenda } from "../../lib/intelligence/agendaNormalization";
import { getCountryDoctrine } from "../../lib/intelligence/countryDoctrine";
import { assessRelationship, buildCommitteeStrategy } from "../../lib/intelligence/relationshipModel";

type FilterType = "all" | Stance;
type RegionType = "all" | "africa" | "americas" | "asia" | "europe" | "oceania";

const REL_OPTS: { value: RelationshipLabel; label: string }[] = [
  { value: "strong_ally", label: "Strong Ally" },
  { value: "likely_ally", label: "Likely Ally" },
  { value: "uncertain", label: "Swing / Uncertain" },
  { value: "neutral", label: "Neutral" },
  { value: "opponent", label: "Opponent" },
];

export default function BlocTracker() {
  const { activeCommittee, addBlocEntry, updateBlocEntry, deleteBlocEntry, addTimelineEvent, addAlert } = useApp();
  const [country, setCountry] = useState("");
  const [rel, setRel] = useState<RelationshipLabel>("neutral");
  const [bloc, setBloc] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [region, setRegion] = useState<RegionType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; flag: string; bloc?: string }[]>([]);
  const [showInfluence, setShowInfluence] = useState(false);
  const [preset, setPreset] = useState("");

  const entries = activeCommittee?.blocEntries || [];
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.stance !== filter) return false;
      if (search.trim() && !e.country.toLowerCase().includes(search.toLowerCase()) && !(e.bloc || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entries, filter, search]);

  if (!activeCommittee) return <div className="p-6 text-gray-500 text-sm">Create a committee first.</div>;
  const ctx = activeCommittee.contextPack;
  const normalizedAgenda = normalizeAgenda(ctx.agenda || "Unspecified agenda");

  const handleCountryInput = (v: string) => {
    setCountry(v);
    if (v.length >= 2) {
      const matches = searchCountries(v).slice(0, 6);
      setSuggestions(matches.filter((c) => !entries.find((e) => e.country.toLowerCase() === c.name.toLowerCase())).map((c) => ({ name: c.name, flag: c.flag, bloc: c.defaultBloc })));
    } else {
      setSuggestions([]);
    }
  };

  const pickCountry = (name: string) => {
    setCountry(name);
    const info = getCountry(name);
    if (info?.defaultBloc) setBloc(info.defaultBloc);
    setSuggestions([]);
  };

  const handleAdd = async () => {
    if (!country.trim()) return;
    const alreadyTracked = entries.some((e) => e.country.toLowerCase() === country.trim().toLowerCase());
    if (alreadyTracked) {
      await addAlert({ severity: "warning", title: `${country.trim()} is already tracked`, description: "Update their stance in the list below instead." });
      setCountry("");
      return;
    }
    const stance = relToStance(rel);
    const support = relToSupport(rel);
    const entry: BlocEntry = {
      id: Date.now().toString(),
      country: country.trim(),
      stance, supportLevel: support,
      riskLevel: stance === "opponent" ? 70 : stance === "swing" ? 50 : 25,
      notes, contactStatus: "contacted", bloc: bloc || undefined,
      updatedAt: Date.now(),
    };
    await addBlocEntry(entry);
    await addTimelineEvent({ type: "relationship", title: `${entry.country} added`, description: `Marked as ${REL_META[rel].label}`, icon: stance === "ally" ? "🤝" : stance === "opponent" ? "🛡" : "🔄" });
    setCountry(""); setBloc(""); setNotes(""); setRel("neutral");
  };

  const handleBulkAdd = async () => {
    if (!preset) return;
    const names = REGIONAL_BLOC_PRESETS[preset] || [];
    let added = 0;
    for (const name of names) {
      if (entries.some((e) => e.country.toLowerCase() === name.toLowerCase())) continue;
      await addBlocEntry({
        id: `${Date.now().toString(36)}-${name}`,
        country: name,
        stance: "neutral",
        supportLevel: 50,
        riskLevel: 30,
        notes: `Bulk-added from ${preset}`,
        contactStatus: "none",
        bloc: preset,
        visible: true,
        updatedAt: Date.now(),
      });
      added++;
    }
    await addAlert({ severity: "info", title: `Bulk added ${preset}`, description: `${added} new countries added as neutral.` });
    await addTimelineEvent({ type: "relationship", title: `Bulk added bloc: ${preset}`, description: `${added} countries added`, icon: "🌍" });
    setPreset("");
  };

  const counts = {
    all: entries.length,
    ally: entries.filter((e) => e.stance === "ally").length,
    swing: entries.filter((e) => e.stance === "swing").length,
    neutral: entries.filter((e) => e.stance === "neutral").length,
    opponent: entries.filter((e) => e.stance === "opponent").length,
  };

  const selectedEntry = selected ? entries.find((e) => e.country.toLowerCase() === selected.toLowerCase()) : undefined;
  const selectedInfo = selected ? getCountry(selected) : null;
  const selectedIntel = selected ? activeCommittee.countryIntel.find((i) => i.country.toLowerCase() === selected.toLowerCase()) : undefined;
  const selectedDoctrine = selected ? getCountryDoctrine(selected, selectedIntel, selectedEntry, normalizedAgenda) : null;
  const selectedRelationship = selected ? assessRelationship({
    targetCountry: selected,
    perspectiveCountry: ctx.country,
    perspectiveBloc: ctx.bloc,
    agenda: normalizedAgenda,
    entry: selectedEntry,
    intel: selectedIntel,
    negotiations: activeCommittee.negotiations,
  }) : null;
  const policyRows = entries.map((entry) => {
    const intel = activeCommittee.countryIntel.find((i) => i.country.toLowerCase() === entry.country.toLowerCase());
    const doctrine = getCountryDoctrine(entry.country, intel, entry, normalizedAgenda);
    const relationship = assessRelationship({
      targetCountry: entry.country,
      perspectiveCountry: ctx.country,
      perspectiveBloc: ctx.bloc,
      agenda: normalizedAgenda,
      entry,
      intel,
      negotiations: activeCommittee.negotiations,
    });
    return { entry, doctrine, relationship };
  }).sort((a, b) => b.relationship.sponsorProbability - a.relationship.sponsorProbability);
  const committeeStrategy = buildCommitteeStrategy({
    entries,
    intelProfiles: activeCommittee.countryIntel,
    selectedCountry: ctx.country,
    selectedBloc: ctx.bloc,
    agenda: normalizedAgenda,
    negotiations: activeCommittee.negotiations,
  });

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Relationship Map</h1>
          <p className="text-[11px] text-gray-500">Track countries, manage alliances, visualize the strategic landscape.</p>
        </div>
      </div>

      {/* World Map */}
      <div className="bg-gray-900 border border-gray-800/60 rounded-lg overflow-hidden">
        {/* Map controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/40 bg-gray-950/40">
          <div className="flex items-center gap-0.5 bg-gray-800/50 rounded p-0.5">
            {(["all", "ally", "swing", "neutral", "opponent"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-medium rounded ${filter === f ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <select value={region} onChange={(e) => setRegion(e.target.value as RegionType)}
            className="bg-gray-800/50 border border-gray-700/50 rounded px-2 py-0.5 text-[9px] text-gray-300 uppercase tracking-wider">
            <option value="all">All Regions</option>
            <option value="africa">Africa</option>
            <option value="americas">Americas</option>
            <option value="asia">Asia</option>
            <option value="europe">Europe</option>
            <option value="oceania">Oceania</option>
          </select>
          <button onClick={() => setShowInfluence(!showInfluence)}
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${showInfluence ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : "bg-gray-800/50 border-gray-700/50 text-gray-500"}`}>
            Influence
          </button>
          <div className="ml-auto text-[9px] text-gray-500">
            {entries.length} tracked · {counts.ally} ally · {counts.swing} swing · {counts.opponent} opp
          </div>
        </div>

        <div className="h-[420px]">
          <WorldMap entries={entries} ownCountry={ctx.country} selected={selected} onSelect={setSelected} filter={filter} region={region} showInfluence={showInfluence} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Add country */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-emerald-400" /> Add Country
          </div>
          <div className="relative">
            <input type="text" value={country} onChange={(e) => handleCountryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={() => setTimeout(() => setSuggestions([]), 200)}
              placeholder="Country name…"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
            {suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-2xl max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button key={s.name} onMouseDown={() => pickCountry(s.name)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-gray-300 hover:bg-gray-800">
                    <span>{s.flag}</span>
                    <span className="flex-1">{s.name}</span>
                    {s.bloc && <span className="text-[9px] text-gray-600">{s.bloc}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select value={rel} onChange={(e) => setRel(e.target.value as RelationshipLabel)}
            className="w-full mt-2 bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1.5 text-sm text-gray-300">
            {REL_OPTS.map((o) => <option key={o.value} value={o.value}>{REL_META[o.value].label}</option>)}
          </select>

          <input type="text" value={bloc} onChange={(e) => setBloc(e.target.value)} placeholder="Bloc (e.g. G77)"
            className="w-full mt-2 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tactical notes…" rows={2}
            className="w-full mt-2 bg-gray-800/60 border border-gray-700/50 rounded-md px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none" />

          <button onClick={handleAdd} disabled={!country.trim()}
            className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-md">
            + Add Country
          </button>

          <div className="mt-3 pt-3 border-t border-gray-800/50">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em] font-semibold mb-1.5">Bulk Add Bloc</div>
            <div className="flex gap-1.5">
              <select value={preset} onChange={(e) => setPreset(e.target.value)}
                className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1.5 text-[10px] text-gray-300">
                <option value="">Choose preset…</option>
                {Object.keys(REGIONAL_BLOC_PRESETS).map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <button onClick={handleBulkAdd} disabled={!preset}
                className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-[10px] font-medium">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Selected country detail */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-blue-400" /> Selected Detail
          </div>
          {selectedEntry && selectedInfo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedInfo.flag}</span>
                <div>
                  <div className="text-sm font-bold text-white">{selectedInfo.name}</div>
                  <div className="text-[9px] text-gray-500">{selectedInfo.iso} · {selectedEntry.bloc || selectedInfo.defaultBloc || "Unaffiliated"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="bg-gray-800/40 rounded p-1.5">
                  <div className="text-gray-500 uppercase tracking-wider text-[8px]">Stance</div>
                  <div className={`font-semibold ${REL_META[stanceToRel(selectedEntry.stance, selectedEntry.supportLevel)].color}`}>{REL_META[stanceToRel(selectedEntry.stance, selectedEntry.supportLevel)].label}</div>
                </div>
                <div className="bg-gray-800/40 rounded p-1.5">
                  <div className="text-gray-500 uppercase tracking-wider text-[8px]">Contact</div>
                  <div className="text-gray-200 capitalize">{selectedEntry.contactStatus}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <SliderRow label="Support" value={selectedEntry.supportLevel} color="emerald" onChange={(v) => updateBlocEntry(selectedEntry.id, { supportLevel: v })} />
                <SliderRow label="Risk" value={selectedEntry.riskLevel} color="red" onChange={(v) => updateBlocEntry(selectedEntry.id, { riskLevel: v })} />
              </div>
              {selectedEntry.notes && (
                <div className="bg-gray-800/40 rounded p-1.5 text-[10px] text-gray-300 italic">{selectedEntry.notes}</div>
              )}
              {selectedDoctrine && selectedRelationship && (
                <div className="bg-cyan-500/[0.04] border border-cyan-500/20 rounded p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-cyan-300 uppercase tracking-wider font-semibold">Tactical Lens</span>
                    <span className="text-[10px] text-cyan-100 font-mono">{selectedRelationship.score}/100 · {selectedRelationship.tacticalRole}</span>
                  </div>
                  <p className="text-[10px] text-gray-300 leading-relaxed">{selectedDoctrine.agendaPosture}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-black/20 rounded p-1.5">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Sponsor</div>
                      <div className="text-[10px] text-emerald-300">{selectedRelationship.sponsorProbability}%</div>
                    </div>
                    <div className="bg-black/20 rounded p-1.5">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Oppose</div>
                      <div className="text-[10px] text-red-300">{selectedRelationship.oppositionProbability}%</div>
                    </div>
                    <div className="bg-black/20 rounded p-1.5">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Bluff</div>
                      <div className="text-[10px] text-amber-300">{selectedRelationship.bluffRisk}%</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-200">Say: {selectedRelationship.whatToSay}</p>
                  <p className="text-[10px] text-red-200">Avoid: {selectedRelationship.whatToAvoid}</p>
                  <p className="text-[10px] text-amber-200">Warning: {selectedRelationship.warning}</p>
                  <p className="text-[9px] text-gray-500">Basis: {selectedRelationship.confidence} confidence; {selectedDoctrine.freshnessLabel}.</p>
                </div>
              )}
              <button onClick={() => { deleteBlocEntry(selectedEntry.id); setSelected(null); }}
                className="w-full py-1 text-[10px] text-red-400 hover:bg-red-600/10 border border-red-500/20 rounded">
                Remove
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-2xl mb-1 opacity-30">◌</div>
              <p className="text-[10px] text-gray-600">Click a country on the map to see details.</p>
            </div>
          )}
        </div>

        {/* Operational coalition guidance */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-emerald-400" /> Operational Coalition
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <MiniStack title="Use As Allies" items={committeeStrategy.allies} tone="text-emerald-300" />
            <MiniStack title="Convert Swings" items={committeeStrategy.swingStates} tone="text-amber-300" />
            <MiniStack title="Avoid / Isolate" items={committeeStrategy.likelyOpponents} tone="text-red-300" />
          </div>
          {committeeStrategy.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {committeeStrategy.warnings.slice(0, 2).map((warning) => (
                <p key={warning} className="text-[9px] text-amber-200 leading-relaxed">{warning}</p>
              ))}
            </div>
          )}
        </div>

        {/* Tactical policy index */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400" /> Tactical Policy Index
          </div>
          {policyRows.length === 0 ? (
            <div className="text-[10px] text-gray-600 py-6 text-center">Add countries to compute relationship-aware policy roles.</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {policyRows.slice(0, 8).map(({ entry, doctrine, relationship }) => (
                <button key={entry.id} onClick={() => setSelected(entry.country)}
                  className="w-full text-left bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800/30 rounded p-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <span>{getFlag(entry.country)}</span>
                    <span className="text-[11px] text-gray-200 flex-1 truncate">{entry.country}</span>
                    <span className={`text-[9px] font-mono ${relationship.sponsorProbability >= 65 ? "text-emerald-300" : relationship.oppositionProbability >= 65 ? "text-red-300" : "text-amber-300"}`}>{relationship.sponsorProbability}%</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {doctrine.issueRoles.slice(0, 2).map((role) => (
                      <span key={role} className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{role}</span>
                    ))}
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/8">{relationship.tacticalRole}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/8">bluff {relationship.bluffRisk}%</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1 truncate">Next move: {relationship.nextMove}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sourced Bloc Trends */}
        {(() => {
          const trends = analyzeBlocTrendsLocally(entries, activeCommittee.timeline);
          return trends.length > 0 ? (
            <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3 mb-3">
              <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <div className="w-1 h-1 rounded-full bg-amber-400" /> Geopolitical Trends
              </div>
              <div className="space-y-2">
                {trends.map((t: SourcedBlocTrend) => (
                  <div key={t.id} className="bg-gray-800/30 border border-gray-800/30 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">{t.label}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        t.direction === "stable" ? "bg-emerald-500/10 text-emerald-300" :
                        t.direction === "volatile" ? "bg-amber-500/10 text-amber-300" :
                        t.direction === "strengthening" ? "bg-blue-500/10 text-blue-300" :
                        "bg-red-500/10 text-red-300"
                      }`}>{t.direction}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-1">{t.rationale}</p>
                    <div className="flex items-center gap-2 text-[8px] text-gray-500">
                      <span>Confidence: {t.confidence}</span>
                      <span className="text-gray-600">·</span>
                      <span>{t.inferenceLevel === "factual" ? "Factual" : "Inferred"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Bloc summary */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <div className="w-1 h-1 rounded-full bg-violet-400" /> Bloc Summary
          </div>
          <div className="space-y-1.5">
            {(["ally", "swing", "neutral", "opponent"] as Stance[]).map((s) => {
              const list = entries.filter((e) => e.stance === s);
              const m = stanceToRel(s, list[0]?.supportLevel || 50);
              return (
                <div key={s} className="bg-gray-800/30 border border-gray-800/30 rounded p-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: REL_META[m].fill }} />
                      <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">{s}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{list.length}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 truncate">
                    {list.length === 0 ? "—" : list.slice(0, 5).map((e) => getFlag(e.country)).join(" ") + (list.length > 5 ? ` +${list.length - 5}` : "")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Country list */}
      <div className="bg-gray-900 border border-gray-800/60 rounded-lg">
        <div className="px-3 py-2 border-b border-gray-800/40 flex items-center gap-2">
          <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-cyan-400" /> All Tracked ({filtered.length})
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
            className="ml-auto bg-gray-800/60 border border-gray-700/50 rounded px-2 py-0.5 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50" />
        </div>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[11px] text-gray-600">No countries match the current filter.</div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {filtered.map((entry) => {
              const r = stanceToRel(entry.stance, entry.supportLevel);
              return (
                <div key={entry.id} onClick={() => setSelected(entry.country)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-800/30 ${selected === entry.country ? "bg-gray-800/40" : ""}`}>
                  <span className="text-base">{getFlag(entry.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-200 truncate">{entry.country}</div>
                    <div className="text-[9px] text-gray-500 truncate">{entry.bloc || "—"} · {entry.contactStatus}</div>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium ${REL_META[r].bg} ${REL_META[r].color}`}>{REL_META[r].label}</span>
                  <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-gray-500 w-32">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${entry.supportLevel}%` }} />
                    </div>
                    <span className="font-mono">{entry.supportLevel}%</span>
                  </div>
                  <select value={entry.stance} onClick={(e) => e.stopPropagation()} onChange={(e) => updateBlocEntry(entry.id, { stance: e.target.value as Stance })}
                    className="text-[9px] bg-gray-800/60 border border-gray-700/50 rounded px-1 py-0 text-gray-300">
                    <option value="ally">Ally</option>
                    <option value="swing">Swing</option>
                    <option value="neutral">Neutral</option>
                    <option value="opponent">Opponent</option>
                  </select>
                  <button onClick={(e) => { e.stopPropagation(); deleteBlocEntry(entry.id); }} className="text-[10px] text-gray-600 hover:text-red-400">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SliderRow({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] mb-0.5">
        <span className="text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`font-mono ${color === "emerald" ? "text-emerald-400" : "text-red-400"}`}>{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${color === "emerald" ? "accent-emerald-500" : "accent-red-500"}`} />
    </div>
  );
}

function MiniStack({ title, items, tone }: { title: string; items: ReturnType<typeof buildCommitteeStrategy>["allies"]; tone: string }) {
  return (
    <div className="bg-black/20 border border-white/6 rounded p-2 min-h-[92px]">
      <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-[9px] text-gray-600">No strong signal yet.</div>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 3).map((item) => (
            <div key={`${title}-${item.country}`} className="text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={tone}>{item.country}</span>
                <span className="ml-auto text-[8px] text-gray-500 font-mono">{item.score}</span>
              </div>
              <p className="text-[9px] text-gray-500 truncate">{item.nextMove}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
