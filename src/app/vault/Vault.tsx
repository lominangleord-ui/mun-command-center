import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { PHASE_LABELS, type CommitteePhase, type ContextPack, type PositionPaper } from "../../types";
import { createDefaultContext } from "../../lib/storage";
import { getFlag } from "../../lib/countries";
import AiSettings from "../ai-settings/AiSettings";

const PHASES: CommitteePhase[] = ["roll_call", "agenda_setting", "opening_speeches", "moderated_caucus", "unmoderated_caucus", "drafting", "amendment", "voting"];
const COMMITTEE_TYPES: { value: ContextPack["committeeType"]; label: string; size: number }[] = [
  { value: "unga", label: "UNGA (General Assembly)", size: 193 },
  { value: "unsc", label: "UNSC (Security Council)", size: 15 },
  { value: "unhrc", label: "UNHRC (Human Rights)", size: 47 },
  { value: "unodc", label: "UNODC (Crime & Drugs)", size: 40 },
  { value: "who", label: "WHO (World Health)", size: 194 },
  { value: "other", label: "Other / Custom", size: 30 },
];

export default function Vault() {
  const { activeCommittee, updateContextPack, updateCommittee } = useApp();
  const ctx = activeCommittee?.contextPack;
  const def = createDefaultContext();

  const [form, setForm] = useState<ContextPack>(ctx || def);
  const [alliesInput, setAlliesInput] = useState(form.allies.join(", "));
  const [opponentsInput, setOpponentsInput] = useState(form.opponents.join(", "));
  const [rulesInput, setRulesInput] = useState(form.important_rules.join("\n"));
  const [updatesInput, setUpdatesInput] = useState(form.latest_updates.join("\n"));
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>("basic");

  useEffect(() => {
    if (ctx) {
      setForm(ctx); setAlliesInput(ctx.allies.join(", ")); setOpponentsInput(ctx.opponents.join(", "));
      setRulesInput(ctx.important_rules.join("\n")); setUpdatesInput(ctx.latest_updates.join("\n"));
    }
  }, [ctx]);

  const handleSave = useCallback(async () => {
    const pack: ContextPack = {
      ...form,
      allies: alliesInput.split(",").map((s) => s.trim()).filter(Boolean),
      opponents: opponentsInput.split(",").map((s) => s.trim()).filter(Boolean),
      important_rules: rulesInput.split("\n").map((s) => s.trim()).filter(Boolean),
      latest_updates: updatesInput.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const errs: string[] = [];
    if (!pack.committee.trim()) errs.push("Committee required");
    if (!pack.agenda.trim()) errs.push("Agenda required");
    if (!pack.country.trim()) errs.push("Country required");
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    await updateContextPack(pack);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }, [form, alliesInput, opponentsInput, rulesInput, updatesInput, updateContextPack]);

  const setPP = useCallback((updates: Partial<PositionPaper>) => {
    if (!activeCommittee) return;
    updateCommittee((c) => ({ ...c, positionPaper: { ...c.positionPaper, ...updates } }));
  }, [activeCommittee, updateCommittee]);

  if (!activeCommittee) return <div className="flex items-center justify-center h-full"><p className="text-gray-500 text-sm">Select or create a committee first.</p></div>;

  const pp = activeCommittee.positionPaper;

  const sections = [
    { id: "basic", label: "Basic Info" },
    { id: "phase", label: "Phase" },
    { id: "strategy", label: "Strategy" },
    { id: "alliances", label: "Alliances" },
    { id: "delegate", label: "Delegate Setup" },
    { id: "position", label: "Position Paper" },
    { id: "ai", label: "AI Settings" },
    { id: "rules", label: "Rules" },
    { id: "updates", label: "Updates" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{getFlag(form.country)}</span>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Context Vault</h1>
            <p className="text-[11px] text-gray-500">Single source of truth. All agents read from this.</p>
          </div>
        </div>
        <button onClick={handleSave} className={`px-4 py-1.5 text-[10px] font-medium rounded-xl transition-all shadow-tactical ${saved ? "bg-emerald-600 text-white" : "bg-[linear-gradient(135deg,#3654FF,#4B6CFF)] hover:brightness-110 text-white"}`}>
          {saved ? "✓ Saved" : "Save All"}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <ul className="list-disc list-inside text-[11px] text-red-400 space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl border border-white/8 p-1 overflow-x-auto">
        {sections.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] font-medium rounded-lg transition-all flex-shrink-0 ${
              activeSection === s.id ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-gray-500 hover:text-gray-300"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-[linear-gradient(180deg,rgba(19,29,51,0.6),rgba(15,23,42,0.6))] border border-white/8 rounded-2xl p-4 shadow-tactical">
        {activeSection === "basic" && (
          <div className="space-y-3">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Committee" value={form.committee} onChange={(v) => setForm({ ...form, committee: v })} placeholder="UNGA, UNSC…" />
              <Field label="Agenda" value={form.agenda} onChange={(v) => setForm({ ...form, agenda: v })} placeholder="Climate Finance" />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="India" />
              <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} placeholder="Delegate" />
            </div>
          </div>
        )}

        {activeSection === "phase" && (
          <div className="space-y-3">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Committee Phase</h2>
            <div className="grid grid-cols-4 gap-1.5">
              {PHASES.map((p) => (
                <button key={p} onClick={() => setForm({ ...form, current_phase: p })}
                  className={`text-[10px] py-2 px-2 rounded-xl border transition-all ${form.current_phase === p ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-medium shadow-[0_0_12px_rgba(54,84,255,0.18)]" : "bg-white/[0.03] border-white/6 text-gray-500 hover:border-white/10"}`}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === "strategy" && (
          <div className="space-y-3">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Strategy & Objectives</h2>
            <Field label="Active Goal" value={form.active_goal} onChange={(v) => setForm({ ...form, active_goal: v })} placeholder="Soften burden-sharing language" />
            <Field label="Next Action" value={form.next_action_needed} onChange={(v) => setForm({ ...form, next_action_needed: v })} placeholder="Generate 45s speech" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Simulation Year"
                value={String(form.simulationYear)}
                onChange={(v) => setForm({ ...form, simulationYear: Math.max(1900, Math.min(2100, parseInt(v, 10) || 2013)) })}
                placeholder="2013"
              />
              <div>
                <label className="block text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">Timeline Source</label>
                <select
                  value={form.simulationYearSource}
                  onChange={(e) => setForm({ ...form, simulationYearSource: e.target.value as ContextPack["simulationYearSource"] })}
                  className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                >
                  <option value="default_2013">Default 2013 Lock</option>
                  <option value="chair_override">Chair Override</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSection === "alliances" && (
          <div className="space-y-3">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Bloc & Alliances</h2>
            <Field label="Bloc" value={form.bloc} onChange={(v) => setForm({ ...form, bloc: v })} placeholder="G77, NAM, EU…" />
            <Field label="Allies (comma-separated)" value={alliesInput} onChange={setAlliesInput} placeholder="Brazil, South Africa…" />
            <Field label="Opponents (comma-separated)" value={opponentsInput} onChange={setOpponentsInput} placeholder="Country X…" />
          </div>
        )}

        {activeSection === "delegate" && (
          <div className="space-y-4">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Delegate Configuration</h2>

            {/* Committee Type */}
            <div>
              <label className="text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Committee Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {COMMITTEE_TYPES.map((ct) => (
                  <button key={ct.value} onClick={() => setForm({ ...form, committeeType: ct.value, committeeSize: ct.size })}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      form.committeeType === ct.value
                        ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_12px_rgba(54,84,255,0.15)]"
                        : "bg-white/[0.03] border-white/6 hover:border-white/10"
                    }`}>
                    <div className="text-[10px] text-white font-medium">{ct.label.split("(")[0].trim()}</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">{ct.size} members</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Committee Size */}
            <Field label="Total Member States" value={String(form.committeeSize)}
              onChange={(v) => setForm({ ...form, committeeSize: parseInt(v) || 193 })} placeholder="193"
              note="UNGA = 193, UNSC = 15, UNHRC = 47" />

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
              <div className="text-sm font-semibold text-white">Double Delegate Workspace</div>
              <div className="mt-1 text-[10px] text-gray-400">This command center is built for exactly two delegates sharing one country and one synchronized workspace.</div>
            </div>

            <div className="space-y-3 bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                <label className="text-[9px] text-violet-300 uppercase tracking-[0.22em] font-semibold">Your Role This Session</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({ ...form, delegateRole: "floor" })}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      form.delegateRole === "floor" ? "bg-violet-500/10 border-violet-500/30" : "bg-white/[0.03] border-white/6"
                    }`}>
                    <div className="text-base">🎤</div>
                    <div className="text-[11px] text-white font-medium mt-1">Floor Manager</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Speeches, motions, timers, caucus strategy. You speak — your partner drafts.</div>
                  </button>
                  <button onClick={() => setForm({ ...form, delegateRole: "drafter" })}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      form.delegateRole === "drafter" ? "bg-violet-500/10 border-violet-500/30" : "bg-white/[0.03] border-white/6"
                    }`}>
                    <div className="text-base">📝</div>
                    <div className="text-[11px] text-white font-medium mt-1">Drafter / Whip</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Clause writing, bloc tracking, negotiation notes. You draft — your partner speaks.</div>
                  </button>
                </div>
                <Field label="Partner's Name" value={form.partnerName} onChange={(v) => setForm({ ...form, partnerName: v })} placeholder="e.g. Alex Chen" />
            </div>
          </div>
        )}

        {activeSection === "position" && (
          <div className="space-y-4">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Position Paper</h2>
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 mb-4">
              <div className="text-[10px] text-amber-300">Define {form.country}'s official stance. AI agents use this to ensure all content stays ideologically consistent.</div>
            </div>
            <Field label="Core Position (1–2 sentences)" value={pp.corePosition} onChange={(v) => setPP({ corePosition: v })} placeholder={`${form.country} believes in...`} />
            <ListEdit label="Key Policies" items={pp.keyPolicies} onChange={(v) => setPP({ keyPolicies: v })} placeholder="e.g. Supports climate finance mechanisms" />
            <ListEdit label="Non-Negotiables (Red Lines)" items={pp.nonNegotiables} onChange={(v) => setPP({ nonNegotiables: v })} placeholder="e.g. No binding emission caps" danger />
            <ListEdit label="Open to Compromise" items={pp.openToCompromise} onChange={(v) => setPP({ openToCompromise: v })} placeholder="e.g. Technology transfer timelines" />
            <ListEdit label="Prior Resolutions to Cite" items={pp.priorResolutions} onChange={(v) => setPP({ priorResolutions: v })} placeholder="e.g. A/RES/77/123" />
            <ListEdit label="Pre-Approved Phrases" items={pp.suggestedLanguage} onChange={(v) => setPP({ suggestedLanguage: v })} placeholder="e.g. Common but differentiated responsibilities" />
          </div>
        )}

        {activeSection === "ai" && (
          <AiSettings />
        )}

        {activeSection === "rules" && (
          <div className="space-y-3">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Committee Rules</h2>
            <textarea value={rulesInput} onChange={(e) => setRulesInput(e.target.value)} placeholder="One rule per line" rows={4}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
          </div>
        )}

        {activeSection === "updates" && (
          <div className="space-y-3">
            <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">Latest Intelligence Updates</h2>
            <textarea value={updatesInput} onChange={(e) => setUpdatesInput(e.target.value)} placeholder="One update per line" rows={4}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, note }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; note?: string }) {
  return (
    <div>
      <label className="block text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
      {note && <p className="text-[9px] text-gray-600 mt-1">{note}</p>}
    </div>
  );
}

function ListEdit({ label, items, onChange, placeholder, danger = false }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; danger?: boolean }) {
  const [input, setInput] = useState("");
  const add = () => { if (input.trim()) { onChange([...items, input.trim()]); setInput(""); } };
  return (
    <div>
      <label className="block text-[9px] text-gray-500 uppercase tracking-[0.22em] font-semibold mb-1">{label}</label>
      <div className="flex gap-1.5 mb-1.5">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={placeholder}
          className="flex-1 bg-white/[0.03] border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
        <button onClick={add} className="px-2.5 py-1.5 rounded-xl text-[10px] bg-white/[0.04] border border-white/8 text-gray-300 hover:bg-white/[0.07]">+</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span key={i} className={`text-[9px] px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
            danger ? "bg-red-500/8 text-red-300 border-red-500/15" : "bg-white/[0.03] text-gray-300 border-white/8"
          }`}>
            {it}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}
