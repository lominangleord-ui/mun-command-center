# Project State

This is a Vite + React 19 + TypeScript + Tailwind CSS 4 app named `react-vite-tailwind`. The app is a Model UN command center for delegates: it stores committee context, tracks bloc relationships, builds country intelligence dossiers, manages negotiations, drafts speeches/clauses, models voting, records snapshots/memory, and exports intelligence.

## Current Structure

- `src/App.tsx` wires hash-router routes for the main app pages.
- `src/context/AppContext.tsx` owns global committee state and mutation helpers.
- `src/lib/storage.ts` persists committees through IndexedDB with localStorage fallback.
- `src/lib/intelligence/*` owns agenda normalization, country doctrine, relationship scoring, and committee-level tactical ranking.
- `src/lib/services/dossierService.ts` builds the authoritative country dossier and now includes an operational brief.
- `src/lib/services/strategyEngine.ts` derives leverage, pressure, contradictions, game theory, and sponsor role from the shared relationship model.
- `src/app/bloc-tracker/BlocTracker.tsx` renders relationship map, tactical policy index, and operational coalition guidance.
- `src/features/country-intelligence/components/DossierCard.tsx` renders the dossier, including the first-screen operational brief.
- `src/components/CommandPalette.tsx` provides the clean header command palette.
- `src/lib/ai/*` owns provider-agnostic AI: encrypted local vault, provider adapters, orchestration, cache, prompts, task routing, verification discipline, context-pack assembly, and memory compression helpers.
- `src/app/ai-settings/AiSettings.tsx` is the provider settings surface for adding Anthropic, OpenAI, Gemini, OpenRouter, and OpenAI-compatible keys, selecting active/fallback credentials, testing health, and routing tasks to models.
- `server/ai-gateway.mjs` is the local gateway boundary for provider calls. The browser calls the gateway; the gateway calls Anthropic/OpenAI/Gemini/OpenRouter/custom endpoints.
- `server/ai-gateway-health.mjs` provides a minimal startup/test check for gateway liveness via `/api/ai/health`.
- `src/lib/strategic-context/*` is the strategic context engine: session context, live memory signals, relationship graph, chair profile, negotiation memory, resolution evolution, procedural momentum, and country doctrine memory.

## Current Health

The recovery build is clean:

- `.\node_modules\.bin\tsc.cmd --noEmit` passes.
- `npm.cmd run build` passes and emits a single-file bundle to `dist/index.html`.
- Local HTTP check confirms the dev server responds at `http://127.0.0.1:5173/`.
- In-app browser smoke confirms `/ai-settings`, provider task routing, committee creation, compact `Ctrl K` header trigger, and command palette opening without the old floating overlay.
- AI gateway preflight responds at `http://127.0.0.1:8787/api/ai/generate`.
- AI gateway health endpoint responds at `http://127.0.0.1:8787/api/ai/health` and `npm.cmd run ai:gateway:health` now provides a minimal pass/fail startup check.
- In-app browser smoke confirms the gateway URL field, Strategic Intel Panel, Swing State Radar, Chair Mood Tracker, Amendment Risk panel, and `next best move` local fallback.

There is no `.git` repository in this project folder, so no clean baseline or diff is available.

## Intelligence State

The intelligence layer now returns operational, relationship-aware guidance rather than only descriptive prose:

- `assessRelationship` includes tactical role, confidence, sponsor probability, opposition probability, bluff risk, what to say, what to avoid, workable concession, clause compatibility, leverage, warning, and next move.
- `buildCommitteeStrategy` ranks tracked committee countries into allies, rivals, swing states, sponsor targets, likely opponents, and warnings from the selected delegation's perspective.
- Dossiers include required operational outputs: Allies/Rivals/Swing States, Strategic Interests, Red Lines, Negotiation Strategy, What To Say, What To Avoid, Exploitable Leverage, Clause Compatibility, Sponsor Probability, Risk Warnings, and Recommended Next Move.
- Outputs depend on selected country, current agenda, bloc alignment, committee entries, negotiation state, doctrine, rivalries, and alliance signals.
- AI orchestration now injects a compact source-verification brief (selected country + top high-impact counterparts) built from source adapters, with confidence/freshness labels and simulation-year guardrails.
- Timeline policy is now explicitly included in strategic system context (`simulationYear` and `timelinePolicy`) so post-simulation claims are treated as out-of-scope in AI guidance.

## AI Provider State

The app now has a provider-agnostic AI layer instead of an Anthropic-only helper:

- `AIProvider`, `AIRequest`, `AIResponse`, `ProviderHealth`, `ProviderError`, `ProviderMetadata`, and `TaskRoutingConfig` live in `src/lib/ai/models/types.ts`.
- Provider adapters normalize Anthropic, OpenAI, Gemini, OpenRouter, and custom OpenAI-compatible requests through one factory in `src/lib/ai/providers/base.ts`, but they no longer call vendors from the browser. They call the configured gateway URL.
- `AIOrchestrator` routes by task, applies strategic system prompts, adds verification discipline when factual claims appear, checks cache, tries the primary credential, and fails over to a backup credential when available.
- API keys are encrypted locally with Web Crypto before persistence. The UI never renders a saved raw key and provider errors are sanitized. Keys are sent only to the configured gateway during a request, not directly from UI code to vendor APIs.
- If gateway/provider execution fails, orchestrator fallback messaging now reports live AI unavailability (not a misleading "no provider configured") and keeps local tactical engines active.
- `src/lib/ai/gateway/aiGatewayClient.ts` now includes a minimal gateway health probe; `/ai-settings` exposes a compact "Test gateway" control for startup sanity checks.
- AI cache keys now include simulation-year and source-intel brief slices to reduce cross-context tactical cache bleed.
- Legacy `callClaude` still exists as a compatibility wrapper, but it now uses `AIOrchestrator` so existing agents are provider-agnostic.
- `executeAgentAsync`, the command palette Strategic Intelligence Mode, and the thin live intelligence brief now use the orchestrator.
- If no provider is configured, local deterministic dossier, relationship, procedure, and strategy engines remain operational.

## Strategic Context State

The AI is now fed by a real strategic context engine instead of only shallow screen context:

- `buildSessionContext` compacts selected country, agenda, committee phase, tactical objective, relationship graph, negotiation memory, chair profile, procedural momentum, resolution/amendment pressure, country doctrine memory, and source/confidence policy.
- `CommandPalette` passes this strategic context into `AIOrchestrator` for `next best move` / Strategic Intelligence Mode.
- The right intelligence rail renders the same live context as operational panels: Strategic Intel Panel, Swing State Radar, Chair Mood Tracker, and Amendment Risk.
- The context engine preserves source discipline by labeling local doctrine as structured inference unless backed by source adapters.
- Committee procedure and delegate strategy context is now centralized in `src/lib/committee/committeeContext.ts` (handbook rules, points/yields/voting, chair-style expectations, and Azerbaijan-2013 constraints), and reused by storage defaults, procedure modeling, and AI prompt context.

## Known Limitations

- Doctrine remains a local heuristic index plus optional local/live data; public-source adapters exist, but not every country has strong live source coverage.
- Low-data countries intentionally produce lower-confidence guidance.
- Several visible strings/icons in the code are mojibake from an earlier encoding issue.
- Live provider calls require the gateway to be running or deployed. Without it, the app degrades to local heuristics and explicit fallback messaging.

## Deployment State (GitHub + Vercel Free)

- Added Vercel-compatible serverless API routes:
  - `api/ai/generate.js`
  - `api/ai/health.js`
- Shared gateway logic now lives in `server/ai-gateway-core.mjs` and is reused by:
  - local Node gateway runner (`server/ai-gateway.mjs`)
  - Vercel serverless functions (`api/ai/*`)
- Default browser gateway URL is now deployment-safe (`/api/ai/generate`) via the vault default, with optional override from `VITE_AI_GATEWAY_URL`.
- Added `vercel.json` SPA rewrite + function runtime config so HashRouter deep links and `/api/*` coexist in Vercel free deployments.
- Vite dev now proxies `/api/ai/*` to `http://127.0.0.1:8787`, so local dev matches production pathing without frontend vendor calls.
- Gateway health checks support relative gateway URLs correctly.
- External intelligence APIs are now same-origin proxied via `api/sources/[...path].js` with strict allowlisted source/path patterns (World Bank, REST Countries, GDELT, Open-Meteo, OpenAlex). Browser adapters call `/api/sources/*` only.
- `vite.config.ts` now proxies `/api/sources/*` in local dev, preserving production-like same-origin adapter behavior.
- Broader page-by-page visual smoke is still useful after future UI work, but the AI settings and command-trigger paths were verified in the in-app browser.

## Final Reliability Hardening Status (Current)

- Timeline control is now strict by default:
  - `simulationYear=2013`
  - `simulationYearSource=default_2013`
  - Year changes require explicit chair override (`simulationYearSource=chair_override`).
- Strategic context now carries explicit timeline metadata:
  - `timelineLockActive`
  - `timelineLockSource`
  - lock policy text injected into AI context and cache partitioning.
- Source proxy behavior is unified in `server/source-proxy-core.mjs` and reused by:
  - local gateway (`server/ai-gateway.mjs`)
  - Vercel route (`api/sources/[...path].js`)
  so dev and deployment use equivalent allowlist/guard semantics.
- Source proxy hardening includes:
  - method guard (`GET`/`OPTIONS`)
  - source/path allowlist regex
  - query key/value/array-size bounds
  - upstream timeout
  - content-type guard and sanitized error output.
- Azerbaijan dossier integration is now structured and non-exclusive:
  - `src/lib/intelligence/localEvidence.ts`
  - wired into source-backed intelligence as supportive local evidence with traceability and confidence/freshness labels.
- Gateway startup diagnostics now include AI and source-proxy checks in `server/ai-gateway-health.mjs`.
- Deployment hygiene:
  - removed runtime log artifacts from repo root
  - `.gitignore` now ignores `*.log` and `*.err.log`.

## Remaining Limitation

- Several visible strings/icons in legacy files still show mojibake from earlier encoding damage. Functional behavior is unaffected, but readability cleanup is still outstanding.
