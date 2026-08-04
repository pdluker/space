import assert from "node:assert/strict";
import { summarizeClusters } from "./space-ingest.js";

// Build fake "clusters" in the shape clusterItems() produces, so we exercise
// the real prompt-building + real API call + real response-parsing path.
const fakeClusters = [
  {
    sources: ["SpaceNews", "Spaceflight Now"],
    representative: {
      title: "SpaceX launches Starship Flight 13 with V3 Starlink satellites",
      description:
        "SpaceX successfully launched Starship Flight 13 on Monday, carrying the first batch of V3 Starlink satellites to orbit from Starbase, Texas.",
      link: "https://spaceflightnow.com/2026/07/20/starship-flight-13/",
      sourceName: "Spaceflight Now",
    },
    clusterOf: 2,
    latestPubDate: new Date().toISOString(),
  },
  {
    sources: ["Universe Today"],
    representative: {
      title: "New interferometry proposal could image exoplanets directly",
      description:
        "A new mission concept proposes linking multiple small satellites to act as one giant mirror for direct exoplanet imaging.",
      link: "https://www.universetoday.com/exoplanet-interferometry-proposal/",
      sourceName: "Universe Today",
    },
    clusterOf: 1,
    latestPubDate: new Date().toISOString(),
  },
];

const env = { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY };

if (!env.ANTHROPIC_API_KEY) {
  console.log("SKIPPED — no ANTHROPIC_API_KEY in this environment.");
  console.log("(In the real stl-dispatcher Worker, this comes from a wrangler secret.)");
  process.exit(0);
}

console.log("Calling live Anthropic API (claude-haiku-4-5-20251001) to validate the summarization step...\n");

const results = await summarizeClusters(fakeClusters, env);

console.log("Raw results:");
console.log(JSON.stringify(results, null, 2));

assert.equal(results.length, 2, "expected one summarized entry per input cluster");

for (const r of results) {
  assert.ok(r.headline && r.headline.length > 0, "headline must be non-empty");
  assert.ok(r.summary && r.summary.length > 0, "summary must be non-empty");
  assert.ok(["Launch", "Astronomy", "Mission", "Policy", "Industry"].includes(r.category), `unexpected category: ${r.category}`);
  assert.ok(r.id.startsWith("story-"), "id must be a stable hash-based id");
  // Copyright check: summary should NOT be a verbatim substring of the source description
  assert.ok(
    !fakeClusters.find((c) => c.representative.link === r.sourceUrl).representative.description.includes(r.summary),
    "summary must be rewritten, not copied verbatim from source description"
  );
}

console.log("\nAll live-API assertions passed.");
