# Next Task

Run hosted Vercel smoke validation and finish one low-risk code hygiene cleanup.

## Exact Next Steps

1. Deploy current branch to Vercel preview and verify:
   - `/api/ai/health` returns `ok: true`
   - `/api/sources/restcountries/v3.1/name/azerbaijan?fields=name` returns JSON
   - deep-link refreshes resolve (SPA rewrite + `/api/*` coexistence)
2. In preview `/ai-settings`, test one credential each for Gemini/OpenAI/Anthropic/OpenRouter (where keys are available) and verify:
   - provider tests go through gateway route only
   - fallback credential is used when primary fails
3. Browser network smoke:
   - source adapters hit same-origin `/api/sources/*`
   - no browser direct vendor AI or third-party source endpoints
4. Timeline discipline smoke:
   - include a post-2013 claim in command palette strategic prompt
   - verify timeline lock warning/filter appears and does not silently pass through
5. Re-run:
   - `.\node_modules\.bin\tsc.cmd --noEmit`
   - `npm.cmd run build`

## Constraints

- No UI redesign.
- No new features.
- Preserve committee/procedure architecture and local fallback engines.
- Keep gateway-only provider routing and same-origin source fetching intact.
