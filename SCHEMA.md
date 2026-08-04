# `SPACE_KV["space-data"]` — data contract

This is the shape `stl-dispatcher`'s new ingestion task must write to KV. The Worker
does no transformation — it serves this blob as-is at `/data.json`.

```jsonc
{
  "meta": {
    "version": "0.2",              // bump on every successful ingestion run
    "lastUpdated": "2026-07-20T14:00:00Z",
    "sourcesPolled": 25,
    "sourcesErrored": []            // list any feed that failed to fetch this run
  },
  "launches": {
    "next7Days": [
      {
        "id": "ll2-abc123",
        "vehicle": "Falcon 9",
        "mission": "Starlink 17-40",
        "provider": "SpaceX",
        "pad": "SLC-40, Cape Canaveral SFS",
        "windowStart": "2026-07-21T14:00:00Z",
        "status": "Go",              // Go / TBD / Hold / Scrubbed
        "source": "Launch Library 2"
      }
    ]
  },
  "breaking": {
    "last24h": [
      {
        "id": "hash-of-url",
        "headline": "...",           // Haiku-generated one-liner, not scraped verbatim
        "summary": "...",            // 1-2 sentence Haiku summary
        "category": "Launch",        // Launch / Astronomy / Policy / Mission / Industry
        "sourceName": "SpaceNews",
        "sourceUrl": "https://...",
        "publishedAt": "2026-07-20T09:00:00Z",
        "clusterOf": 3               // how many source articles deduped into this item
      }
    ]
  },
  "astronomy": [ /* same item shape as breaking, filtered to astronomy/skywatching feeds */ ],
  "missions": [ /* same item shape, ongoing mission updates (Artemis, ISS, Mars rovers, etc.) */ ],
  "policy": [ /* same item shape, industry/policy/business coverage */ ]
}
```

## Notes for the `stl-dispatcher` ingestion task (not yet built)

- **Dedup key:** hash on normalized headline + date, not URL — the same launch/story
  often runs near-identically across 3-5 of the 25 sources same-day.
- **Summarization:** per the project's copyright practice, never store scraped
  headline/body text verbatim — Haiku 4.5 pass rewrites into an original one-liner +
  summary, with `sourceUrl` for attribution/click-through.
- **Launch Library 2 API:** free tier ~15 req/hr — poll hourly at most, cache the
  raw response in a separate KV key (`ll2-cache`) so a Worker error doesn't force
  a re-fetch against the rate limit.
- **RSS feeds:** poll every 2-4 hours; that's the practical freshness ceiling for
  most of these 25 sources anyway.
- Write the whole blob as **one KV `put`** (single key `space-data`) — same
  "combine data updated together" pattern used by `status`'s `STATUS_KV`.
