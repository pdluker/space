/**
 * space.stluker.com — Worker
 *
 * Mirrors the `status` Worker's architecture:
 *   - /data.json is read from SPACE_KV at request time (written by stl-dispatcher's
 *     ingestion task), NOT baked into the static asset bundle. This means new data
 *     reaches the live site the moment stl-dispatcher writes to KV — no redeploy needed.
 *   - Falls back to the static public/data.json (a checked-in sample/empty shape) if
 *     KV is ever empty, so the dashboard never renders broken on first deploy.
 *   - Everything else (index.html, css, js) is served directly from static assets.
 *
 * KV key used: "space-data" (single JSON blob — same "combine data updated together"
 * pattern as the rest of the ecosystem, to keep write ops cheap).
 */

const KV_KEY = "space-data";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/data.json") {
      return handleDataJson(request, env, ctx);
    }

    // Everything else: static assets (index.html, css, js, icons)
    return env.ASSETS.fetch(request);
  },
};

async function handleDataJson(request, env, ctx) {
  try {
    const raw = await env.SPACE_KV.get(KV_KEY);

    if (raw) {
      return new Response(raw, {
        headers: {
          "Content-Type": "application/json",
          // Dashboard polls this client-side; keep it fresh but cache briefly at the edge
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // KV empty (e.g. brand-new deploy before first ingestion run) — fall back to
    // the static shape so the dashboard has something sane to render.
    return env.ASSETS.fetch(request);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "space-data unavailable", detail: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
