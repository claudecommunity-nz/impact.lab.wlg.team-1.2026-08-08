# One Clear View

Official warnings, Council information and community reports for the Wellington
south coast, in one view — with the source and time on every item, and official
advice never confusable with an unverified report.

Built at the Impact Lab with Wellington City Council Emergency Management,
8 August 2026. Team 1, problem statement 01.

> **Prototype. Hazard-planning and public feed data, not an operational
> emergency source. In an emergency, call 111.**

---

## The problem

> How might we give people a clear, location-specific picture of an emerging
> weather event by bringing together official warnings, Council information and
> trusted reports of local conditions?

South coast events are forecast by MetService, but official sources do not show
what is happening at street level — waves crossing the road, surface flooding,
access becoming unsafe. Residents watch MetService, WCC, WREMO, news and
Facebook without knowing which to rely on or how it fits together.

## What this does

- **One map and one feed** across eleven live sources plus community reports.
- **Every item carries its source and its time**, and anything over two hours
  old is greyed with its age spelled out.
- **Four tiers that cannot be confused** — official, Council/operator, measured,
  unverified community — distinguished by shape and border style, not colour
  alone.
- **Two questions answered separately.** `tier` is who said it. `evidence_basis`
  is how they know: observed, measured, modelled, forecast or reported.
- **Four questions, no login** turn the feed into a short list of what to do,
  with the exact arithmetic behind every suggestion one click away.
- **A composable GeoJSON endpoint** so the other nine prototypes can pull this
  into the shared common operating picture.

---

## Run it

```bash
bun install && supabase start && bun run dev
```

Then load <http://localhost:8082>. Press **Refresh sources** to pull every feed.

Ports are the 545xx block (API `54521`, Studio `54523`) and Vite is on `8082`,
because sibling projects on this machine hold 543xx/544xx and 8080/8081.

## The composable output

The judged deliverable. Open, keyless, CORS `*`:

```bash
curl "http://127.0.0.1:54521/functions/v1/signals-geojson?bbox=174.62,-41.36,174.94,-41.14"
```

Parameters: `tier`, `bbox`, `area`, `suburb`, `since`, and `scenario` (+`at`).
Every feature carries `source_id`, `publisher`, `tier`, `evidence_basis`,
`observed_at`, `age_seconds`, `attribution`, `licence`, `url`, `suburb`,
`suburb_exact`, and for community items `status`, `report_count` and
`unverified: true`. The collection carries `generated_at`, `simulation`, the
disclaimer, and per-source health.

`suburb` is Wellington City Council's own boundary, so another team's module can
ask for a place by the name Council uses:

```bash
curl "http://127.0.0.1:54521/functions/v1/signals-geojson?suburb=Island%20Bay"
```

`suburb_exact: false` means the item is *outside* every boundary and this is the
nearest suburb within 3 km — a wave buoy, a sea-level gauge, a report from the
sea wall. Word those "off Island Bay", never "in Island Bay". `null` means
outside Wellington City altogether.

The app itself is just the first consumer of this endpoint. If it breaks for
another team it breaks for us.

---

## The catalogue and SDK are the backbone

`wcc_gis.py`, `catalogue.json` and `sources-supplementary.json` from
[wcc-emergency-gis-data](https://github.com/claudecommunity-nz/wcc-emergency-gis-data)
are vendored into `vendor/wcc-gis/`. `scripts/build_sources.py` resolves every
endpoint **through the SDK** and generates both the `sources` seed rows and a
typed TypeScript registry.

```bash
bun run sources:build   # regenerate; a no-op run must produce no diff
```

No ArcGIS URL is hand-typed anywhere outside `vendor/`. Using the SDK rather
than reading URLs off the catalogue by eye paid for itself three times:

1. **`em_hackathon_bundle`** — WCC published a purpose-built service for this
   event: 24 hazard layers on one CORS-open host, described in the supplementary
   file as "the officially-blessed stack in one call". It replaced eight
   separate council endpoints, so there is one host to be polite to.
2. **`image_url()` refused a whole-service raster and listed its sublayers**,
   revealing that `flood-depths` is modelled **per suburb** — Island Bay (5),
   Ōwhiro Bay (12), Lyall/Houghton (8). Exactly the places in the problem
   statement. A blanket raster would have been the wrong layer. The same trick
   found `storm-surge` layer 4 is the present-day case, not a sea-level-rise
   scenario.
3. **`feature_queryable` / `raster_only`** classify the raster trap
   automatically, instead of discovering it at three in the afternoon.

---

## Trust, made structural

The failure mode this problem statement fears most is an unverified post being
read as confirmed fact. Four things prevent it, and none of them rely on
remembering to be careful:

**A community report cannot outrank an official warning.** `COMMUNITY_MAX` (35)
sits below `OFFICIAL_FLOOR` (45) in `src/lib/tiers.ts`, and community scores are
clamped to it however many people corroborate.

**A report cannot be self-confirmed.** `anon` holds a *column-level* INSERT
grant that omits `status` and `is_seed`, so Postgres rejects the attempt before
any policy is consulted. Verified, along with the rate limit and the geographic
fence:

```
anon submits            -> 201, born status="unverified"
anon sets status        -> 401 permission denied for table community_reports
anon sets is_seed       -> 401
anon PATCH              -> 401
6th report in 10 min    -> rejected by the rate-limit trigger
a point in Auckland     -> rejected by the bbox CHECK
```

**Counts are never summed across tiers.** "2 official · 66 council · 4 measured
· 15 unverified", never one number.

**The words verified, confirmed and validated never appear** in the interface
about a community report. Corroboration is phrased as a count of *reports*,
followed at the same size by "Council has not confirmed this."

## Reliability, made visible

- A **source health strip** shows every feed green or red, with the real error
  text. A failing feed is shown, not hidden, and the feed says plainly that what
  is below is incomplete.
- Three filtering decisions made for honesty rather than volume:
  - **NEMA CAP alerts mix live and historic.** Unfiltered, the layer offers a
    three-week-old "TSUNAMI — Evacuate Immediately" and a "Nationwide Test 2026"
    as though both were in force. Filtered to `status = 'Actual'`, not historic,
    and not expired.
  - **WCC "street events and road closures" is mostly planned festivals.** The
    Thorndon Fair is not an emerging weather event, so items are labelled
    *in effect now* or *planned, starts <date>*.
  - **Wellington Water has ~1,437 open jobs**, many months old. Capped to 60
    recent ones so a thousand pins do not bury every warning.
- **Stale data is labelled, not hidden.** The Greater Wellington ArcGIS gauge
  layers cache values that are years out of date — Hutt River at Estuary Bridge
  still reports `2019-03-04`. Those layers are used as the gauge *registry*;
  current values come from Hilltop.

## Scenario mode

On the morning of the build MetService had three warnings in force nationwide
and none for Wellington. **Run the storm scenario** replays a synthetic south
coast southerly over six hours — warning issued, swell builds, residents report
spray, Council closes The Esplanade, corroboration climbs, power goes out,
warning upgraded, then easing.

Containment is structural, not conventional: simulated rows live in their own
table, `signals_public` never references it, the endpoint requires an explicit
`?scenario=`, responses stamp `simulation: true` at feature *and* collection
level, and every `external_id` is prefixed `sim:` as a tripwire.

Five simultaneous cues say it is not real: a hatched banner, a hatched page
background, a hatched map frame, a `SIMULATED` chip on every card, and the
Refresh button visibly disabled.

---

## Sources and attribution

Data belongs to its publishers and licences vary. Generated from the catalogue —
see `src/lib/catalogue.generated.ts` for the machine-readable list.

| Source | Publisher | Tier | Licence |
|---|---|---|---|
| Severe weather warnings | MetService | official | Restricted — see MetService terms |
| Emergency Mobile Alerts (CAP) | NEMA | official | CC BY 4.0 |
| Emergency Mobile Alert feed | NEMA | official | CC BY 4.0 |
| Street events and road closures | Wellington City Council | council | Check WCC terms |
| State highway delays | NZ Transport Agency Waka Kotahi | council | CC BY 4.0 |
| Water network faults | Wellington Water | council | Check Wellington Water terms |
| Electricity outages | NEMA / 18 lines companies | council | CC BY 4.0 |
| Sea level, detided (Wellington Harbour) | GeoNet / GNS Science | measured | CC BY 3.0 NZ |
| Wave height, Baring Head | Greater Wellington Regional Council | measured | Check GWRC terms |
| River level and rainfall | Greater Wellington Regional Council | measured | Check GWRC terms |
| Marine and weather forecast | Open-Meteo | measured | CC BY 4.0 |
| Hazard layers (24) | Wellington City Council | context | Check WCC terms |
| Modelled flood depth, storm surge | Wellington Water · Greater Wellington | context | Check publisher terms |

Community reports are submitted by members of the public and are not verified by
Council.

## Privacy

There is no login and no account. Profile answers — area, responsibilities,
travel, whether someone depends on mains power — are held in `localStorage` and
never sent to a server. Reports carry a random per-browser id used only for rate
limiting; no name, contact detail or exact address is collected. This repo
contains no personal information.

## Layout

```
vendor/wcc-gis/     wcc_gis.py + catalogue.json + sources-supplementary.json
scripts/            build_sources.py — the only place a URL is constructed
supabase/
  migrations/       sources, signals, community_reports, signals_public, scenario
  functions/
    ingest/         11 adapters behind a per-host queue
    signals-geojson/ the composable output
src/
  lib/relevance.ts  the scoring engine — pure, no model, every weight named
  lib/tiers.ts      the trust invariants
```

## Known limits

- Reports are placed at the centre of the chosen area, not a dragged pin.
- Moderation is out of scope. `status` exists and only Council-side tooling can
  write it; there is no Council-side tooling yet.
- Hilltop river and rainfall gauges are registered but not yet ingested; the
  measured tier currently runs on sea level, wave height and forecast.
- Rate limiting is per browser, so it slows abuse rather than preventing it.
