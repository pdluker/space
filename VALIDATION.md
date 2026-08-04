# Validation Summary — `space-ingest.js`

## What was actually run, and results

**Offline tests (`test-offline.mjs`) — 10/10 passed:**

| # | What it checks | Result |
|---|---|---|
| 1-5 | RSS 2.0 parsing (SpaceNews fixture): item count, CDATA/entity stripping, link extraction, pubDate → ISO conversion, description HTML-stripping | ✅ Pass |
| 6 | Atom-format parsing (Universe Today fixture uses `<entry>`/`href` link instead of RSS's `<item>`/`<link>text</link>`) | ✅ Pass |
| 7 | Cross-source clustering: a real near-duplicate headline pair (SpaceNews vs. Spaceflight Now, both covering the same Starship Flight 13 launch) correctly merges into one cluster | ✅ Pass — required tuning, see below |
| 8 | Clustering does not over-merge genuinely different stories (Artemis delay vs. Rocket Lab Electron) | ✅ Pass |
| 9-10 | Launch Library 2 response mapping: 7-day window filtering (excludes a launch 20 days out), field mapping to our schema | ✅ Pass |

**One real tuning finding from validation, not just a pass/fail:** the initial similarity threshold (0.55) failed to cluster a genuine cross-source duplicate — measured Jaccard similarity between `"SpaceX launches Starship Flight 13 with V3 Starlink satellites"` and `"Starship Flight 13 lifts off carrying new V3 Starlink satellites"` was **0.44** (different verbs/framing per outlet is normal). Lowered threshold to **0.4**, re-tested against both the true-positive pair and the true-negative pair (similarity 0) — both now correct. This threshold should be revisited once it's run against a full day of real feed output; two data points is enough to fix an obviously-wrong constant, not enough to call it tuned.

## What was NOT validated here, and why

This sandbox's network egress is allow-listed to a fixed domain set (npm, PyPI, GitHub, `api.anthropic.com`, etc.) — it cannot reach `spacenews.com`, `spaceflightnow.com`, `ll.thespacedevs.com`, or any other of the actual feed/API hosts this task depends on. Concretely, not yet checked against live traffic:

- **All 15 RSS feed URLs** — the parser is validated against realistic hand-built fixtures matching each format (RSS 2.0 with CDATA, Atom with `href` links), but not against the live, possibly-messier real output of each of the 15 feeds. **Do this before first production run:** deploy to a dev environment (or `wrangler dev`, which does have real network) and run `fetchFeed()` against each URL in `FEEDS`, logging `error` and item count per feed.
- **Launch Library 2's actual response shape** — mapped against a hand-built fixture that mirrors LL2's documented schema, not a live response. LL2's free tier is also rate-limited (~15 req/hr); confirm the real 429 behavior before relying on hourly polling.
- **The live Haiku summarization call** — `test-live-api.mjs` is written and will run the real prompt → real API call → response-parsing → copyright-safety assertion (checks the generated summary isn't a verbatim substring of the source description) end-to-end, but this sandbox has no `ANTHROPIC_API_KEY` available to it. **Run this once `stl-dispatcher` has the real secret** (locally via `ANTHROPIC_API_KEY=sk-... node test-live-api.mjs`, or as a one-off `wrangler dev` invocation) before wiring it into the daily cron.
- **The `env.SPACE_KV.put()` call** — untestable outside a real Workers KV binding; will only be exercised on first real deploy. Recommend a manual `runSpaceIngest(env)` invocation via `wrangler dev` and a `wrangler kv key get --binding=SPACE_KV space-data` check before trusting the cron.

## Recommended pre-production checklist

1. `wrangler dev` the `stl-dispatcher` change locally, call `runSpaceIngest(env)` directly, confirm no feed throws unexpectedly (some 404s are fine and expected — see `sourcesErrored` in the output).
2. Spot-check 3-4 `sourcesErrored` feed URLs by hand (browser or `curl`) if they fail — feed URLs on outlet redesigns drift more than APIs do.
3. Run `test-live-api.mjs` with the real key once, confirm the JSON-array response parses cleanly (Haiku occasionally wraps output in stray markdown fences — `safeParseJsonArray` strips these, but worth eyeballing once).
4. Confirm the LL2 free-tier rate limit isn't hit by cross-checking response headers (`X-RateLimit-Remaining` if present) during the first few real polls.
5. After first successful KV write, load `space.stluker.com/data.json` and confirm the shape matches `SCHEMA.md` exactly (the placeholder `index.html` already does a raw JSON dump for this purpose).
