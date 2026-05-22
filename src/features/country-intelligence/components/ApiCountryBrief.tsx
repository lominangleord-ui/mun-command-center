import { useMemo } from "react";
import { buildCountryProfile, type CountryProfileBundle } from "../../../api/services/countryService";
import { buildIntelligenceBrief } from "../../../api/services/intelligenceService";
import type { IntelligenceBrief } from "../../../api/models/intelligence";
import { describeFreshness } from "../../../api/core/freshness";
import { useApiResource } from "../../../shared/hooks/useApiResource";

interface Props {
  country: string;
  agenda: string;
  compact?: boolean;
}

interface Bundle {
  profile: CountryProfileBundle;
  brief: IntelligenceBrief;
}

export default function ApiCountryBrief({ country, agenda, compact = false }: Props) {
  const includeWeather = !compact;
  const trimmedCountry = country?.trim() || "";
  const trimmedAgenda = agenda?.trim() || "";

  const resource = useApiResource<Bundle>(async () => {
    const [profile, brief] = await Promise.all([
      buildCountryProfile(trimmedCountry, includeWeather),
      buildIntelligenceBrief(trimmedCountry, trimmedAgenda),
    ]);
    return { profile, brief };
  }, [trimmedCountry, trimmedAgenda, includeWeather]);

  const meta = resource.data?.profile.metadata ?? null;
  const indicators = resource.data?.profile.indicators ?? null;
  const brief = resource.data?.brief ?? null;
  const profile = resource.data?.profile ?? null;

  const freshness = useMemo(() => {
    if (!profile || profile.freshness.length === 0) return null;
    // Worst-case status: stale > error > cached > live
    const order = { error: 4, stale: 3, unavailable: 2, cached: 1, live: 0 } as const;
    return [...profile.freshness].sort(
      (a, b) => (order[b.cacheStatus] ?? 0) - (order[a.cacheStatus] ?? 0)
    )[0];
  }, [profile]);

  if (!trimmedCountry) {
    return <EmptyShell title="No country selected" body="Set your country in the Context Vault to enable live open-intelligence enrichment." />;
  }

  if (resource.status === "loading" && !resource.data) {
    return <LoadingShell />;
  }

  if (resource.status === "error" && !resource.data) {
    return <ErrorShell message={resource.error || "Live data unavailable."} onRetry={resource.refresh} />;
  }

  if (!profile) {
    return <ErrorShell message="No data returned." onRetry={resource.refresh} />;
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] shadow-tactical p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-semibold">
            Open Intelligence
          </div>
          <div className="text-sm text-white font-semibold mt-1 truncate">
            {meta?.officialName || trimmedCountry}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <FreshnessBadge status={freshness?.cacheStatus} label={freshness ? describeFreshness(freshness) : "Loading"} />
          <button
            onClick={resource.refresh}
            title="Refresh live data"
            className="text-[9px] px-2 py-1 rounded-lg border border-white/8 bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.07]"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Capital" value={meta?.capital || "—"} />
        <Metric
          label="Region"
          value={meta?.region ? `${meta.region}${meta.subregion ? ` / ${meta.subregion}` : ""}` : "—"}
        />
        <Metric label="Population" value={formatNumber(indicators?.population ?? meta?.population)} />
        <Metric label="GDP" value={formatMoney(indicators?.gdpNominal)} />
        {!compact && <Metric label="GDP / Capita" value={formatMoney(indicators?.gdpPerCapita)} />}
        {!compact && <Metric label="Life Exp." value={formatPlain(indicators?.lifeExpectancy, " yrs")} />}
        {!compact && <Metric label="CO₂" value={formatPlain(indicators?.co2Emissions, " kt")} />}
        {!compact && <Metric label="Languages" value={meta?.languages?.slice(0, 2).join(", ") || "—"} />}
      </div>

      {profile.weather && !compact && (
        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-100">
          Weather: {profile.weather.condition} · {profile.weather.temperatureC ?? "—"}°C · wind {profile.weather.windSpeedKmh ?? "—"} km/h
        </div>
      )}

      <SectionGdelt brief={brief} compact={compact} />
      {!compact && <SectionSources profile={profile} brief={brief} />}

      {profile.errors.length > 0 && (
        <ApiNotice
          tone="amber"
          title="Partial live data"
          body={profile.errors.slice(0, 2).join("; ")}
        />
      )}
    </div>
  );
}

function SectionGdelt({ brief, compact }: { brief: IntelligenceBrief | null; compact: boolean }) {
  if (!brief) return null;
  if (brief.events.length === 0) {
    return (
      <div className="rounded-xl border border-white/6 bg-black/20 px-3 py-2 text-[10px] text-gray-500">
        No high-signal GDELT events in the last 14 days. Use this as a baseline — quiet ≠ stable.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-semibold">
        GDELT event pulse · last 14 days
      </div>
      {brief.events.slice(0, compact ? 2 : 4).map((e) => (
        <a
          key={e.id}
          href={e.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-white/6 bg-black/20 px-3 py-2 hover:bg-white/[0.04] transition-colors"
        >
          <div className="text-[11px] text-gray-200 line-clamp-2 leading-snug">{e.title}</div>
          <div className="text-[8px] text-gray-600 mt-1">{e.sourceDomain} · {e.date}</div>
        </a>
      ))}
    </div>
  );
}

function SectionSources({ profile, brief }: { profile: CountryProfileBundle; brief: IntelligenceBrief | null }) {
  const all = [...profile.sources, ...(brief?.sources ?? [])];
  if (all.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 pt-1 border-t border-white/6">
      {all.slice(0, 6).map((s, i) => (
        <span
          key={`${s.name}-${i}`}
          title={s.endpoint}
          className="text-[8px] text-gray-500 bg-white/[0.03] border border-white/6 rounded px-1.5 py-0.5"
        >
          {s.name}
        </span>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 px-3 py-2 min-w-0">
      <div className="text-[8px] text-gray-500 uppercase tracking-[0.18em] font-semibold">{label}</div>
      <div className="text-[11px] text-gray-200 mt-1 truncate" title={value}>{value}</div>
    </div>
  );
}

function FreshnessBadge({ status, label }: { status?: string; label: string }) {
  const palette =
    status === "live"
      ? "text-emerald-300 border-emerald-500/25 bg-emerald-500/10"
      : status === "cached"
      ? "text-blue-300 border-blue-500/25 bg-blue-500/10"
      : status === "stale"
      ? "text-amber-300 border-amber-500/25 bg-amber-500/10"
      : status === "error"
      ? "text-red-300 border-red-500/25 bg-red-500/10"
      : "text-gray-400 border-white/10 bg-white/[0.04]";
  return <span className={`text-[9px] px-2 py-1 rounded-xl border ${palette}`}>{label}</span>;
}

function LoadingShell() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 animate-pulse space-y-3">
      <div className="h-3 w-40 rounded bg-white/10" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 rounded-xl bg-white/5" />
        <div className="h-14 rounded-xl bg-white/5" />
        <div className="h-14 rounded-xl bg-white/5" />
        <div className="h-14 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

function ErrorShell({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-red-300">
        Live data unavailable
      </div>
      <p className="text-[11px] text-red-200/80">{message}</p>
      <button
        onClick={onRetry}
        className="text-[10px] px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-400">{title}</div>
      <p className="text-[11px] text-gray-500 mt-1">{body}</p>
    </div>
  );
}

function ApiNotice({ tone, title, body }: { tone: "amber" | "red"; title: string; body: string }) {
  const c = tone === "red" ? "border-red-500/20 bg-red-500/5 text-red-200" : "border-amber-500/20 bg-amber-500/5 text-amber-200";
  return (
    <div className={`rounded-xl border px-3 py-2 ${c}`}>
      <div className="text-[10px] font-semibold">{title}</div>
      <div className="text-[9px] opacity-80 mt-0.5">{body}</div>
    </div>
  );
}

function formatNumber(value?: number): string {
  if (typeof value !== "number") return "—";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatMoney(value?: number): string {
  if (typeof value !== "number") return "—";
  return Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPlain(value?: number, suffix = ""): string {
  if (typeof value !== "number") return "—";
  return `${Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}
