# One Clear View — working notes

## What this is

Team 1's prototype for Impact Lab Wellington, 8 August 2026. Problem statement
01: bringing official warnings, Council information and trusted reports of
local conditions into one clear community view for the south coast.

## Non-negotiables

These come from the organisers' brief. Breaking one of them fails the task even
if the code is good.

1. **Never present an unverified report as fact.** The words *verified*,
   *confirmed*, *validated* and *corroborated* must not appear in the interface
   about a community report. Corroboration is a count of *reports*, always
   followed at the same size by "Council has not confirmed this."
2. **A community report can never outrank an official warning.** `COMMUNITY_MAX`
   (35) < `OFFICIAL_FLOOR` (45) in `src/lib/tiers.ts`, and `score()` clamps to
   it. Do not add a code path around this.
3. **Show reliability, don't hide it.** A failing feed appears in the source
   health strip with its real error. Stale data is labelled with its age, not
   quietly dropped. If a list is capped, say so.
4. **Say it is not an operational emergency source.** In the footer, in the
   GeoJSON payload and in the README. Three places, none of them dismissible.
5. **No personal information in this repo.** No names, no contact details, no
   addresses in seed data. The repo is public.
6. **Attribution travels with the data.** Every signal joins back to `sources`
   for publisher, licence and attribution, and the GeoJSON carries them.

## Stack

bun + Vite 5 + React 18 + TypeScript + Tailwind 3 + MapLibre GL.
Supabase local via Docker. Deno edge functions.

**Never use npm or node directly** — bun only, and `deno` for edge functions.

Ports are the **545xx** block: API `54521`, DB `54522`, Studio `54523`.
Vite is on **8082**. Sibling projects on this machine hold 543xx/544xx and
8080/8081, so do not move to the defaults.

`[analytics] enabled = false` in `config.toml` is not optional — Logflare and
Vector are the heaviest containers and Vector crash-loops on the Docker socket.

## Commands

```bash
bun install
supabase start
bun run dev                # http://localhost:8082
bun run sources:build      # regenerate the catalogue-derived registry
bun run ingest             # terminal fallback for the Refresh button
bun run typecheck
supabase db reset          # reapplies migrations + seed
bun run types              # after EVERY migration, or TS will lie to you
```

## The rule about URLs

**No ArcGIS URL is hand-typed outside `vendor/`.** `scripts/build_sources.py`
imports the vendored `wcc_gis` SDK and resolves every endpoint from
`catalogue.json`, generating `src/lib/catalogue.generated.ts` and
`supabase/seed_sources.sql`. Both are checked in and both are marked generated.

If you need a new layer, add it to the lists at the top of `build_sources.py`
and re-run. A re-run with no upstream change must produce no diff.

Two things the SDK protects you from, learned the hard way:

- `layers=show:N` for a raster sublayer is a **query parameter**, not part of
  the path. Splitting the URL on `?` silently collapses six per-suburb flood
  models into one all-layers image.
- `catalogue.json`'s `feature_queryable` / `raster_only` tell you which layers
  advertise a query capability and then refuse to answer. Trust them.

## Data model

- `sources` — provenance and health. Generated. Drives both per-item
  attribution and the health strip.
- `signals` — everything from an attributable feed. `tier` is *who said it*;
  `evidence_basis` is *how they know*. Keep them separate.
- `community_reports` — separate table on purpose. `anon` holds a
  **column-level** INSERT grant that omits `status` and `is_seed`, so a report
  cannot be born as anything but unverified. Do not replace this with a policy;
  the column grant is what makes it unspoofable.
- `signals_public` — the union view. `security_invoker = on` is essential.
- `scenario_signals` — simulated rows. `signals_public` must never reference it.

RLS on every table **plus explicit GRANTs** — RLS alone leaves a table
unreadable under current Supabase defaults.

## Ingest

One Deno function, one adapter per feed, `Promise.allSettled` so a dead feed
cannot kill the run. Always returns HTTP 200 with a per-source report.

Be considerate: adapters are grouped by host and run sequentially within a host
with a 150 ms gap, at most three hosts at a time, with an honest User-Agent.
Refresh is a button, never a poll loop. **Never call ingest from an unguarded
`useEffect`.**

Three feeds have no CORS headers and can only be fetched server-side: NZTA
delays, NZTA cameras, and the AlertHub EMA RSS. Everything else allows a
browser request, which is why `src/lib/signals.ts` can exist as a no-backend
fallback.

## Feed quirks worth knowing

- **NEMA CAP mixes live and historic.** Filter `status = 'Actual'`, not
  historic, not expired — otherwise you show a weeks-old "TSUNAMI — Evacuate
  Immediately" and a nationwide test as current.
- **WCC "street events and road closures" is mostly planned festivals.** Label
  in-effect vs planned.
- **Wellington Water has ~1,437 open jobs**, many months old. Capped to 60.
- **The GW ArcGIS gauge layers are a stale cache** — Estuary Bridge still
  reports 2019. Use them as the gauge registry; take values from Hilltop.
- **Hilltop**: spaces must be `%20`, never `+` (`URLSearchParams` emits `+`),
  and errors arrive as HTTP 200 with an `<Error>` element.
- **Open-Meteo** returns local time with no offset. Request `timezone=UTC`.

## Testing the security claims

These should keep passing:

```
anon submits report   -> 201, status = "unverified"
anon sets status      -> 401 permission denied
anon sets is_seed     -> 401
anon PATCH            -> 401
6th report in 10 min  -> rate-limit trigger rejects
point outside the bbox-> CHECK constraint rejects
default GeoJSON       -> zero features with simulated = true
```

## A note on the preview pane

MapLibre completes its style load inside a `requestAnimationFrame` tick. The
embedded preview pane reports `document.hidden === true` and delivers zero
frames, so the map stays blank there while everything else renders. This is the
pane, not the app — verified by driving rAF manually, at which point the style
loads and CARTO tiles paint. Check the map in a real browser window.
