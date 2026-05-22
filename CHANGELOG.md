# Changelog

## Recovered State

- Identified the project as a Vite + React + TypeScript + Tailwind Model UN command center.
- Confirmed the project root is `mun-ai-command-center-spec` inside the workspace wrapper folder.
- Confirmed there is no `.git` repository available in the project folder.

## Intelligence Upgrade

- `src/lib/intelligence/relationshipModel.ts`
  - Expanded `assessRelationship` from score/posture output into a tactical assessment with role, confidence, sponsor probability, opposition probability, bluff risk, what to say, what to avoid, concession path, clause compatibility, leverage, warning, and next move.
  - Added `buildCommitteeStrategy` to rank tracked countries as allies, rivals, swing states, sponsor targets, likely opponents, and warnings from the selected delegation's perspective.

- `src/api/models/dossier.ts`
  - Added `OperationalBrief` and `OperationalCountryRef` to make the required tactical outputs first-class dossier data instead of UI-generated prose.

- `src/lib/services/dossierService.ts`
  - Added `committeeEntries` and `countryIntel` to dossier context options.
  - Added `buildOperationalBrief` and included it in every `CountryDossier`.
  - Reworked local intelligence claims to use tactical relationship probabilities, bluff warnings, exact what-to-say/avoid guidance, concession logic, clause compatibility, and risk warnings.

- `src/lib/services/strategyEngine.ts`
  - Updated game-theory and sponsor assessment logic to use the shared relationship model's sponsor, opposition, and bluff-risk outputs.

- `src/features/country-intelligence/components/DossierCard.tsx`
  - Added a first-screen Operational Brief with role, confidence, sponsor probability, opposition probability, bluff risk, what to say, what to avoid, recommended next move, allies, swings, likely opponents, clause compatibility, and risk warnings.

- `src/app/country-intelligence/CountryIntelligence.tsx`
  - Passed committee entries and country intel into the dossier pipeline so outputs depend on the selected country and other committee countries.

- `src/app/bloc-tracker/BlocTracker.tsx`
  - Added operational coalition guidance: allies to use, swings to convert, and states to avoid/isolate.
  - Updated the tactical policy index to rank by sponsor probability and show role, bluff risk, and next move.
  - Updated selected-country detail to show sponsor/oppose/bluff probabilities, what to say, what to avoid, and warning logic.

- `src/components/CommandPalette.tsx`
  - Updated relationship command output to use committee-level tactical strategy and per-country sponsor/opposition/bluff guidance.
  - Changed the palette panel to a fixed top-right header dropdown.

- `src/pages/Dashboard.tsx`
  - Removed the duplicate page-level `CommandPalette` trigger so the palette remains accessible through the app header.

## Verification

- `.\node_modules\.bin\tsc.cmd --noEmit` passes.
- `npm.cmd run build` passes.
- Local HTTP check confirms `http://127.0.0.1:5173/` responds.
- In-app browser smoke confirms AI Providers, task routing, committee creation, compact command trigger, and command palette opening.

## AI Provider Architecture

- Added `src/lib/ai/models/types.ts` and `src/lib/ai/models/providers.ts`
  - Defined provider-agnostic `AIProvider`, `AIRequest`, `AIResponse`, `AIMessage`, `ProviderHealth`, `ProviderError`, `ProviderMetadata`, and `TaskRoutingConfig`.
  - Added provider metadata and model hints for Anthropic, OpenAI, Gemini, OpenRouter, and custom OpenAI-compatible providers.

- Added `src/lib/ai/vault/apiVault.ts`
  - Stores multiple provider credentials in a local encrypted vault using Web Crypto when available.
  - Supports active provider, fallback provider, task routing, streaming preference, internet augmentation toggle, health state, last-used timestamps, vault clearing, and masked display.

- Added `src/lib/ai/providers/base.ts`
  - Implemented normalized provider adapters that now call the configured gateway instead of vendor APIs directly from browser code.
  - Added gateway-backed health checks, sanitized error normalization, rate-limit metadata capture, and response normalization.

- Added `src/lib/ai/gateway/aiGatewayClient.ts`
  - Centralized browser-to-gateway transport, timeout handling, gateway error normalization, and key/error sanitization.

- Added `server/ai-gateway.mjs`
  - Provides a small Node HTTP gateway at `/api/ai/generate`.
  - Routes Anthropic, OpenAI, Gemini, OpenRouter, and custom OpenAI-compatible requests server-side.
  - Avoids browser direct vendor calls and removes the main CORS/key-exposure failure mode.

- Updated `package.json`
  - Added `npm.cmd run ai:gateway`.

- Added `src/lib/ai/orchestration/aiOrchestrator.ts`
  - Centralized provider routing, model selection, cache lookup, request normalization, strategic system prompting, verification discipline, primary provider execution, and fallback provider failover.

- Added AI support infrastructure:
  - `src/lib/ai/cache/aiCache.ts`
  - `src/lib/ai/orchestration/contextPackBuilder.ts`
  - `src/lib/ai/orchestration/memoryCompressor.ts`
  - `src/lib/ai/orchestration/verificationLayer.ts`
  - Modular strategic prompts under `src/lib/ai/prompts/*`.

- Added `src/app/ai-settings/AiSettings.tsx`
  - Provides a professional provider settings UI for saving keys, selecting active/fallback providers, testing connections, toggling augmentation options, and assigning model overrides per intelligence task.
  - Added configurable AI Gateway URL with default `http://127.0.0.1:8787/api/ai/generate`.
  - Reused inside the Context Vault AI tab and exposed at `/ai-settings`.

- Updated `src/lib/anthropicClient.ts`
  - Converted the old Claude-only helper into a compatibility wrapper over `AIOrchestrator`.

- Updated intelligence integrations:
  - `src/agents/index.ts` now routes async agents through `AIOrchestrator` with task-specific routing.
  - `src/components/CommandPalette.tsx` adds Strategic Intelligence Mode through the orchestrator and keeps the trigger as a compact header control.
  - `src/api/services/intelligenceService.ts` can attach provider-backed strategic assessment metadata to the thin live intelligence brief.
  - `src/api/models/intelligence.ts` records optional AI strategic assessment and provider metadata.

## Strategic Context Engine

- Added `src/lib/strategic-context/*`
  - `SessionContextEngine` builds the central strategic context snapshot.
  - `CommitteeStateTracker` extracts weighted live memory signals and rolling memory compression.
  - `BlocRelationshipGraph` converts tracked countries into tactical country cards with alignment, sponsor probability, opposition probability, bluff risk, warnings, and next moves.
  - `ChairBehaviorTracker` models observable chair strictness, motion openness, aggression tolerance, and paperwork sensitivity.
  - `NegotiationMemory` tracks active/stalled targets, promises, unresolved issues, reliability warnings, and follow-ups.
  - `ResolutionEvolutionTracker` tracks clause count, amendment pressure, vulnerable clauses, protected clauses, and drafting advice.
  - `ProceduralMomentumTracker` merges rulebook/procedure state with drafting/voting momentum.
  - `CountryDoctrineMemory` packs agenda-specific doctrine, red lines, framing, confidence, and freshness into AI context.

- Updated `src/lib/ai/orchestration/contextPackBuilder.ts`
  - The strategic context pack now includes the full strategic snapshot.

- Updated `src/lib/ai/orchestration/aiOrchestrator.ts`
  - Every request can now carry a `strategicContext`; the orchestrator injects it as an authoritative Strategic Context Pack before provider execution.

- Updated `src/components/CommandPalette.tsx`
  - Strategic Intelligence Mode / `next best move` now sends live strategic context and shows the local next move and chair lens even when no provider is configured.

- Updated `src/components/IntelligenceRail.tsx`
  - Added Strategic Intel Panel, Swing State Radar, Chair Mood Tracker, and Amendment Risk indicators from the same context engine.

## Latest Verification

- Installed missing local dependencies in this workspace copy with `npm.cmd install` after `node_modules` was absent.
- `.\node_modules\.bin\tsc.cmd --noEmit` passes.
- `npm.cmd run build` passes.
- `npm.cmd run ai:gateway` starts the local gateway and OPTIONS preflight responds.
- Browser smoke confirms `/ai-settings` gateway field, task routing, Strategic Intel Panel, Swing State Radar, Chair Mood Tracker, Amendment Risk, compact command trigger, and `next best move` local fallback.

## Gateway Hardening Pass

- `src/lib/ai/orchestration/aiOrchestrator.ts`
  - Hardened fallback behavior so gateway/provider outages return a truthful local-fallback message (`Live AI unavailable ...`) instead of implying provider keys are missing.

- `src/components/CommandPalette.tsx`
  - Updated fallback display logic to key off `sourceBasis === "fallback"` so outage fallback and no-provider fallback are both surfaced correctly.

- `server/ai-gateway.mjs`
  - Added `/api/ai/health`.
  - Added provider-id allowlist validation.
  - Added safer base URL sanitization for OpenAI-compatible/OpenRouter routes.
  - Added request-size guard (`messages` count cap) as a minimal abuse guard.

- `server/ai-gateway-health.mjs`
  - Added minimal health-check script.

- `package.json`
  - Added `ai:gateway:health` script.

- Verification:
  - `src` vendor endpoint scan returns no direct provider calls.
  - `npm.cmd run ai:gateway:health` passes when gateway is up and fails cleanly when gateway is down.
  - `.\node_modules\.bin\tsc.cmd --noEmit` passes.
  - `npm.cmd run build` passes.

## Known Unfinished Work

- Broader full-app visual smoke remains useful after future UI work.
- Mojibake in icons and UI strings remains visible in several files.
- Public-source coverage is uneven; low-data countries should continue to show lower confidence instead of invented certainty.
- Real-key provider tests are still required for Gemini/OpenAI/Anthropic/OpenRouter/custom providers.
- The gateway must be running locally or deployed for live provider calls; without it, local strategic fallback remains active.

## Final Hardening + Source Context Pass

- `src/lib/ai/orchestration/aiOrchestrator.ts`
  - Added source-backed context injection (`SOURCE VERIFICATION BRIEF`) for selected country and top high-impact relationship states.
  - Added explicit `simulationYear` and `timelinePolicy` lines into strategic system context payloads.
  - Source-intel enrichment now composes through existing adapters and degrades safely when retrieval is sparse.

- `src/lib/intelligence/sourceIntelligenceEngine.ts`
  - Added `toSourceIntelBrief(...)` for compact, tactical, provider-ready source summaries.

- `src/api/services/intelligenceService.ts`
  - Thin intelligence brief now builds and passes source-backed briefing lines into the orchestrator.
  - Added source-backed confidence/freshness/simulation-year signal to factual summary output.

- `src/lib/ai/cache/aiCache.ts`
  - Cache hash now includes strategic simulation year and source-intel brief slices to avoid stale cross-context reuse.

- `src/lib/ai/gateway/aiGatewayClient.ts`
  - Added minimal browser-side gateway health check helper.

- `src/app/ai-settings/AiSettings.tsx`
  - Added compact `Test gateway` startup check control.

- `src/lib/procedureRules.ts`
  - Expanded procedure model outputs with timeline policy, voting options, points precedence, yield options, and paperwork guardrails from the handbook-oriented ruleset.

- `src/components/CommandPalette.tsx`
  - Procedure command output now surfaces timeline policy, formal voting options, and point precedence for live tactical use.

- Validation:
  - `.\node_modules\.bin\tsc.cmd --noEmit` passes.
  - `npm.cmd run build` passes.

## Committee Context + Source Proxy Reliability Pass

- Added `src/lib/committee/committeeContext.ts`
  - Canonical handbook-aware rule layer for roll call, present/present-and-voting behavior, motions, caucus constraints, yields, points precedence, voting options, paperwork rules, chair-style expectations, and Azerbaijan-2013 strategic constraints.

- Updated `src/lib/storage.ts` and `src/context/AppContext.tsx`
  - New committees start with canonical important rules.
  - Manual context updates now merge canonical rules to prevent drift.

- Updated `src/lib/procedureRules.ts`
  - Procedure outputs now consume canonical committee constants instead of scattered duplicated strings.

- Updated `src/lib/strategic-context/SessionContextEngine.ts` and `src/lib/ai/prompts/strategicIntelligence.prompt.ts`
  - Strategic AI context now injects centralized committee operating brief and delegation constraints.
  - Simulation year default now references centralized committee year constant.

- Added `api/sources/[...path].js`
  - Same-origin serverless proxy for external public intelligence APIs.
  - Strict source/path allowlist (not an open proxy).
  - Upstream timeout and non-JSON guard for reliability.

- Updated `src/api/core/registry.ts`
  - Source adapters now call `/api/sources/*` paths by default instead of external domains.

- Updated `vite.config.ts`
  - Added `/api/sources/*` local proxies for dev parity with deployed same-origin paths.

- Validation:
  - `.\node_modules\.bin\tsc.cmd --noEmit` passes.
  - `npm.cmd run build` passes.
  - `src` scan shows no browser adapter direct calls to World Bank/OpenAlex/GDELT/REST Countries/Open-Meteo domains.

## Deployment Hardening Pass (GitHub + Vercel Free)

- Added `server/ai-gateway-core.mjs`
  - Centralized provider routing and response normalization so local Node gateway and Vercel serverless functions share one implementation.

- Added Vercel serverless gateway routes:
  - `api/ai/generate.js`
  - `api/ai/health.js`
  - This removes persistent local-server assumptions in hosted deployments.

- Updated `server/ai-gateway.mjs`
  - Now a thin local runner that reuses `server/ai-gateway-core.mjs`.

- Added `vercel.json`
  - SPA fallback rewrites and Node function runtime config for `api/**/*.js`.

- Updated `src/lib/ai/vault/apiVault.ts`
  - Default gateway URL changed to deployment-safe `/api/ai/generate`.
  - Supports optional override via `VITE_AI_GATEWAY_URL`.

- Updated `vite.config.ts`
  - Added local dev proxy for `/api/ai/*` to `http://127.0.0.1:8787`, preserving same-path behavior in dev/prod.

- Updated `src/lib/ai/gateway/aiGatewayClient.ts`
  - Gateway health URL builder now supports relative gateway URLs (required for hosted same-origin API paths).

- Updated `src/app/ai-settings/AiSettings.tsx`
  - Gateway placeholder/help now documents Vercel default path and local override.

- Updated timeline discipline:
  - `src/lib/intelligence/sourceIntelligenceEngine.ts` now filters events/research by simulation year and records filtered-count warnings.
  - `src/api/services/intelligenceService.ts` now applies 2013 timeline gating before AI synthesis summaries.

- Validation:
  - `.\node_modules\.bin\tsc.cmd --noEmit` passes.
  - `npm.cmd run build` passes.

## Final Reliability Hardening Pass

- Added `server/source-proxy-core.mjs`
  - Shared same-origin source proxy core for local gateway + Vercel source route.
  - Enforces allowlisted source keys/path regex, query-size limits, timeout, non-JSON guard, and sanitized errors.

- Updated `api/sources/[...path].js`
  - Now delegates to shared source proxy core.

- Updated `server/ai-gateway.mjs`
  - Added `/api/sources/*` handling through the same source-proxy core to keep local dev parity with deployment behavior.

- Updated `vite.config.ts`
  - `/api/sources` now proxies to local gateway (same as `/api/ai`) instead of direct third-party targets.

- Timeline hardening (strict 2013 default lock):
  - Updated `src/types/index.ts`, `src/lib/storage.ts`, `src/context/AppContext.tsx`, `src/lib/contextPack.ts`, `src/lib/syncCode.ts`
    - Added `simulationYearSource` and strict default-2013 behavior unless explicit chair override is set.
  - Updated `src/lib/strategic-context/types.ts`, `src/lib/strategic-context/SessionContextEngine.ts`
    - Added `timelineLockActive` + `timelineLockSource`.
  - Updated `src/lib/ai/orchestration/aiOrchestrator.ts`, `src/lib/ai/cache/aiCache.ts`, `src/lib/ai/prompts/strategicIntelligence.prompt.ts`
    - Timeline lock metadata now propagates into AI context and cache partitioning.

- Committee canonical context expansion:
  - Updated `src/lib/committee/committeeContext.ts` with structured debate formats, motion verbatims, decision hierarchy, and handbook/chair constraints.
  - Updated `src/lib/procedureRules.ts` and `src/lib/agentSystemPrompts.ts` to consume canonical context.
  - Cleaned `src/agents/index.ts` RuleForge path by removing unreachable legacy duplicated procedure text.

- Added Azerbaijan curated dossier evidence support:
  - Added `src/lib/intelligence/localEvidence.ts`
  - Updated `src/lib/intelligence/sourceRegistry.ts` and `src/lib/intelligence/sourceIntelligenceEngine.ts`
  - Dossier evidence is now supportive and traceable, never sole authority.

- Gateway diagnostics:
  - Updated `server/ai-gateway-health.mjs` to probe both `/api/ai/health` and `/api/sources/*`.

- Deployment hygiene:
  - Removed local runtime logs from repo root:
    - `ai-gateway.log`
    - `ai-gateway.err.log`
    - `vite-dev.log`
    - `vite-dev.err.log`
  - Updated `.gitignore` to ignore `*.log` and `*.err.log`.
  - Updated `.env.example` with optional gateway/source probe/OpenRouter referer vars.

- Validation:
  - `.\node_modules\.bin\tsc.cmd --noEmit` passes.
  - `npm.cmd run build` passes.
