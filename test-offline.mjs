import assert from "node:assert/strict";
import {
  parseRssItems,
  clusterItems,
  mapLl2Response,
} from "./space-ingest.js";
import {
  SAMPLE_RSS_SPACENEWS,
  SAMPLE_RSS_SPACEFLIGHTNOW,
  SAMPLE_ATOM_UNIVERSETODAY,
  SAMPLE_LL2_RESPONSE,
} from "./test-fixtures.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("\n1. RSS parsing (RSS 2.0)");
test("parses 2 items from SpaceNews fixture", () => {
  const items = parseRssItems(SAMPLE_RSS_SPACENEWS);
  assert.equal(items.length, 2);
});
test("strips CDATA and decodes entities in title", () => {
  const items = parseRssItems(SAMPLE_RSS_SPACENEWS);
  assert.equal(items[0].title, "SpaceX launches Starship Flight 13 with V3 Starlink satellites");
});
test("extracts link correctly", () => {
  const items = parseRssItems(SAMPLE_RSS_SPACENEWS);
  assert.equal(items[0].link, "https://spacenews.com/spacex-starship-flight-13-v3-starlink/");
});
test("parses pubDate to ISO string", () => {
  const items = parseRssItems(SAMPLE_RSS_SPACENEWS);
  assert.equal(items[0].pubDate, new Date("Mon, 20 Jul 2026 10:00:00 +0000").toISOString());
});
test("description is stripped of HTML and truncated safely", () => {
  const items = parseRssItems(SAMPLE_RSS_SPACENEWS);
  assert.ok(items[0].description.includes("SpaceX successfully launched Starship Flight 13"));
});

console.log("\n2. RSS parsing (Atom)");
test("parses Atom entry via href-style link", () => {
  const items = parseRssItems(SAMPLE_ATOM_UNIVERSETODAY);
  assert.equal(items.length, 1);
  assert.equal(items[0].link, "https://www.universetoday.com/exoplanet-interferometry-proposal/");
  assert.equal(items[0].title, "New interferometry proposal could image exoplanets directly");
});

console.log("\n3. Cross-source clustering / dedup");
test("clusters the same Starship story from two different sources into one cluster", () => {
  const spacenewsItems = parseRssItems(SAMPLE_RSS_SPACENEWS).map((i) => ({ ...i, sourceName: "SpaceNews" }));
  const sfnItems = parseRssItems(SAMPLE_RSS_SPACEFLIGHTNOW).map((i) => ({ ...i, sourceName: "Spaceflight Now" }));
  const clusters = clusterItems([...spacenewsItems, ...sfnItems]);

  // Expect 3 clusters total: Starship (merged x2), Artemis delay, Rocket Lab Electron
  assert.equal(clusters.length, 3, `expected 3 clusters, got ${clusters.length}`);

  const starshipCluster = clusters.find((c) => c.clusterOf === 2);
  assert.ok(starshipCluster, "expected one cluster with clusterOf === 2");
  assert.deepEqual(new Set(starshipCluster.sources), new Set(["SpaceNews", "Spaceflight Now"]));
});
test("does not merge genuinely different stories (Artemis vs Rocket Lab)", () => {
  const spacenewsItems = parseRssItems(SAMPLE_RSS_SPACENEWS).map((i) => ({ ...i, sourceName: "SpaceNews" }));
  const sfnItems = parseRssItems(SAMPLE_RSS_SPACEFLIGHTNOW).map((i) => ({ ...i, sourceName: "Spaceflight Now" }));
  const clusters = clusterItems([...spacenewsItems, ...sfnItems]);
  const singletons = clusters.filter((c) => c.clusterOf === 1);
  assert.equal(singletons.length, 2);
});

console.log("\n4. Launch Library 2 response mapping");
test("filters launches to the 7-day window", () => {
  const { launches } = mapLl2Response(SAMPLE_LL2_RESPONSE);
  assert.equal(launches.length, 1, "the 20-day-out HaiYang launch should be excluded");
  assert.equal(launches[0].mission, "Starlink 17-40");
});
test("maps LL2 fields to our schema correctly", () => {
  const { launches } = mapLl2Response(SAMPLE_LL2_RESPONSE);
  const l = launches[0];
  assert.equal(l.vehicle, "Falcon 9 Block 5");
  assert.equal(l.provider, "SpaceX");
  assert.equal(l.status, "Go");
  assert.equal(l.pad, "SLC-40, Cape Canaveral SFS, FL, USA");
  assert.ok(l.id.startsWith("ll2-"));
});

console.log(`\n${passed} tests passed.\n`);
