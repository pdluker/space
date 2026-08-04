/**
 * fetch-ll2-to-kv.mjs
 *
 * Runs on a GitHub Actions schedule (see .github/workflows/fetch-launches.yml),
 * NOT on Cloudflare Workers — that's the entire point. LL2's anonymous tier is
 * rate-limited per-IP, and Cloudflare Workers share a small egress IP pool
 * across every customer on the platform, so anonymous LL2 calls from a Worker
 * get caught in contention that has nothing to do with this site's own
 * request volume. GitHub-hosted runners use a completely different IP range,
 * so the exact same anonymous LL2 call that 429s from a Worker generally
 * succeeds cleanly from here.
 *
 * This script reuses fetchUpcomingLaunches() and fetchSpaceXFallbackLaunches()
 * directly from space-ingest.js rather than reimplementing the request/retry/
 * mapping logic — same source of truth the Worker itself would use, just
 * invoked from a different network. Writes the result to Cloudflare KV under
 * "ll2-launches" via the REST API; stl-dispatcher's own ingest run reads that
 * key first (see fetchLaunchesWithFallback in space-ingest.js) before ever
 * attempting its own direct LL2 call.
 *
 * Required environment (set as GitHub repo secrets):
 *   CF_API_TOKEN        - Cloudflare API token with "Workers KV Storage: Edit"
 *                          permission, scoped to the account/namespace below
 *   CF_ACCOUNT_ID        - Cloudflare account ID
 *   CF_KV_NAMESPACE_ID   - the SPACE_KV namespace ID (from `wrangler kv namespace list`,
 *                          or visible in the wrangler deploy output as the
 *                          binding resource ID)
 *
 * Usage: node fetch-ll2-to-kv.mjs
 * (Node 18+ for native fetch; no npm dependencies)
 */

import { fetchUpcomingLaunches, fetchSpaceXFallbackLaunches } from "../space-ingest.js";

const { CF_API_TOKEN, CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID } = process.env;

function requireEnv() {
  const missing = ["CF_API_TOKEN", "CF_ACCOUNT_ID", "CF_KV_NAMESPACE_ID"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function writeToKv(key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${key}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body: value,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(`Cloudflare KV write failed: HTTP ${res.status} ${JSON.stringify(body?.errors || body)}`);
  }
  return body;
}

async function main() {
  requireEnv();

  // env passed as {} — no LL2_API_KEY, this stays anonymous. Authenticating
  // isn't the point here; being on a different IP pool is.
  console.log("Fetching LL2 (anonymous, from GitHub Actions IP range)...");
  const ll2 = await fetchUpcomingLaunches({}, fetch);

  let payload;
  if (!ll2.error && ll2.launches.length > 0) {
    console.log(`LL2 succeeded: ${ll2.launches.length} launches.`);
    payload = { launches: ll2.launches, error: null, debug: ll2.debug, fetchedAt: new Date().toISOString() };
  } else {
    console.warn(`LL2 failed even from GitHub's IP range (${ll2.error}) — falling back to SpaceX API.`);
    const spacex = await fetchSpaceXFallbackLaunches(fetch);
    if (!spacex.error && spacex.launches.length > 0) {
      console.log(`SpaceX fallback succeeded: ${spacex.launches.length} launches (SpaceX-only coverage).`);
    } else {
      console.error(`SpaceX fallback also failed (${spacex.error}) — writing empty result with error recorded.`);
    }
    payload = {
      launches: spacex.launches,
      error: spacex.error ? `LL2: ${ll2.error} / SpaceX: ${spacex.error}` : `LL2 failed (${ll2.error}), served by SpaceX fallback`,
      debug: spacex.debug,
      fetchedAt: new Date().toISOString(),
    };
  }

  await writeToKv("ll2-launches", JSON.stringify(payload));
  console.log("Wrote ll2-launches to KV successfully.");

  // Even a fully-failed run still writes a fresh `fetchedAt` with an empty
  // launches array and the error recorded, rather than leaving the previous
  // KV entry in place silently. Note this does NOT prevent stl-dispatcher
  // from making one direct LL2 attempt of its own on the next pulse —
  // fetchLaunchesWithFallback() only trusts a KV entry when it has at least
  // one launch, so an empty array here still falls through to that direct
  // attempt (cheap, occasionally succeeds) before stale carry-forward kicks
  // in. That's intentional layering, not a bug — this script's job is just
  // to be an honest, fresh signal, not to short-circuit the Worker's own
  // fallback chain.
  if (payload.launches.length === 0) {
    console.warn("Wrote an empty launches array — both sources failed this run. This is expected to be rare.");
  }
}

main().catch((err) => {
  console.error("Fatal error in fetch-ll2-to-kv.mjs:", err);
  process.exit(1);
});
