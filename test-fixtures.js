export const SAMPLE_RSS_SPACENEWS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>SpaceNews</title>
  <item>
    <title><![CDATA[SpaceX launches Starship Flight 13 with V3 Starlink satellites]]></title>
    <link>https://spacenews.com/spacex-starship-flight-13-v3-starlink/</link>
    <pubDate>Mon, 20 Jul 2026 10:00:00 +0000</pubDate>
    <description><![CDATA[SpaceX successfully launched Starship Flight 13 on Monday, carrying the first batch of V3 Starlink satellites to orbit.]]></description>
  </item>
  <item>
    <title><![CDATA[NASA delays Artemis III lunar landing to 2027]]></title>
    <link>https://spacenews.com/nasa-delays-artemis-iii/</link>
    <pubDate>Sun, 19 Jul 2026 18:30:00 +0000</pubDate>
    <description><![CDATA[NASA officials confirmed a further delay to the Artemis III crewed lunar landing mission, citing lander readiness.]]></description>
  </item>
</channel>
</rss>`;

export const SAMPLE_RSS_SPACEFLIGHTNOW = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Spaceflight Now</title>
  <item>
    <title><![CDATA[Starship Flight 13 lifts off carrying new V3 Starlink satellites]]></title>
    <link>https://spaceflightnow.com/2026/07/20/starship-flight-13/</link>
    <pubDate>Mon, 20 Jul 2026 10:15:00 +0000</pubDate>
    <description><![CDATA[SpaceX's Starship Flight 13 test mission launched Monday from Starbase, sending V3-generation Starlink satellites to orbit for the first time.]]></description>
  </item>
  <item>
    <title><![CDATA[Rocket Lab schedules next Electron launch for late July]]></title>
    <link>https://spaceflightnow.com/2026/07/20/rocket-lab-electron/</link>
    <pubDate>Mon, 20 Jul 2026 08:00:00 +0000</pubDate>
    <description><![CDATA[Rocket Lab announced its next Electron mission is targeting a late-July liftoff from Mahia, New Zealand.]]></description>
  </item>
</channel>
</rss>`;

// Atom-style feed to test the alternate parser branch
export const SAMPLE_ATOM_UNIVERSETODAY = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Universe Today</title>
  <entry>
    <title>New interferometry proposal could image exoplanets directly</title>
    <link href="https://www.universetoday.com/exoplanet-interferometry-proposal/" />
    <published>2026-07-19T14:25:00Z</published>
    <summary>A new mission concept proposes linking multiple small satellites to act as one giant mirror for direct exoplanet imaging.</summary>
  </entry>
</feed>`;

// Realistic subset of Launch Library 2's /launch/upcoming/ response shape
export const SAMPLE_LL2_RESPONSE = {
  count: 2,
  results: [
    {
      id: "abc-123",
      name: "Falcon 9 Block 5 | Starlink 17-40",
      net: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      status: { abbrev: "Go" },
      rocket: { configuration: { name: "Falcon 9 Block 5" } },
      mission: { name: "Starlink 17-40" },
      launch_service_provider: { name: "SpaceX" },
      pad: { name: "SLC-40", location: { name: "Cape Canaveral SFS, FL, USA" } },
    },
    {
      id: "def-456",
      name: "Long March 2C | HaiYang 3B",
      net: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(), // outside 7-day window
      status: { abbrev: "TBD" },
      rocket: { configuration: { name: "Long March 2C" } },
      mission: { name: "HaiYang 3B" },
      launch_service_provider: { name: "CASC" },
      pad: { name: "LC-2", location: { name: "Xichang Satellite Launch Center" } },
    },
  ],
};
