# Kia ora — local alerts & weather

Team 1's prototype for the Impact Lab with Wellington City Council Emergency
Management, Saturday 8 August 2026. Problem statement 01 — bringing official
warnings, Council information and local community reports into one clear view.

**Published app:** https://claudecommunity-nz.github.io/impact.lab.wlg.team-1.2026-08-08/

<img src="assets/qr-published-app.png" alt="QR code linking to https://claudecommunity-nz.github.io/impact.lab.wlg.team-1.2026-08-08/" width="220">

Scan to open the app on a phone.

> **Prototype built in a day. The incident and weather data in it is synthetic.
> This is not an operational emergency source. In an emergency, call 111.**

## The problem

> How might we give people a clear, location-specific picture of an emerging
> weather event by bringing together official warnings, Council information and
> trusted reports of local conditions?

Official sources forecast the event. They do not show what is happening at
street level — surface flooding, a slip, a road becoming unsafe. Residents watch
MetService, WCC, WREMO, news and Facebook without knowing which to rely on.

## What the app does

A full-screen Wellington map with a time scrubber. Everything on the page moves
with the scrubber, so you can play the event forwards and watch it build.

- **Six incident categories** — flooding, slips, weather events, road and
  footpath faults, drinking water faults, dangerous trees. Each is a coloured
  pin with a blast radius, and each appears and disappears on its own duration.
- **A timeline scrubber** running from 10 July 2026 to now, with a density bar
  showing when and what was reported.
- **Weather panel** that updates as you scrub — temperature, wind, gusts, rain
  chance, sea temperature.
- **Notice bar** across the top, its text driven by the current weather and
  incident counts. Click it for the detail.
- **Region and suburb picker** over Council's own 57 suburb boundaries. Opens on
  your location when the browser gives one, and says so plainly when it has
  fallen back to the city centre instead.
- **Incident panel** — click a pin for severity, detail, a plain-language "what
  this means for you", and links to the authoritative sources for that hazard
  type.
- **Nearby community report** — the newest report in the area on screen, styled
  apart from everything else, labelled unverified, and asking the reader to
  corroborate rather than presenting one account as fact.
- **Share** — sends an alert on with its source and its time attached. Mock only;
  nothing is posted anywhere.
- **Responsive** — bottom sheets and stacked header on a phone.

## Repo layout

| Path | What it is |
|---|---|
| `map/` | **The deployed app.** Vite + React 19 + maplibre-gl. This is what ships. |
| `data/` | Source ticket CSV and the converter that produces the app's incident data |
| `prototype-1/` | A separate, earlier prototype — Vite + Supabase, with a composable GeoJSON endpoint. Not deployed. |
| `backend/` | Standalone Streamlit dashboard for exploring the 74 WCC hazard datasets. Not deployed. |
| `*.html` (root) | Early single-file mockups, superseded by `map/` |

## Running the map locally

```bash
npm --prefix map ci && npm --prefix map run dev
```

Opens on http://localhost:5173. To check what actually ships, build and preview —
the built app is served under the GitHub Pages path, so `preview` uses it too:

```bash
npm --prefix map run build && npm --prefix map run preview
```

## Deployment

Pushing to `main` with changes under `map/` triggers
[`.github/workflows/deploy-map.yml`](.github/workflows/deploy-map.yml), which
builds on Node 22 and publishes `map/dist` to GitHub Pages. Nothing else in the
repo is deployed.

## Data

The app is client-side only. It fetches three static files from its own origin —
no backend, no API keys.

| File | What | Provenance |
|---|---|---|
| `map/public/incidents.json` | 389 incidents | Converted from `data/synthetic_tickets_1000.csv` by `data/convert_tickets.py`. **Synthetic**, in the shape of real WCC service tickets. |
| `map/public/weather.json` | 21 hourly snapshots | **Synthetic**, hand-built to describe one storm |
| `map/public/wcc-suburbs.geojson` | 57 suburb boundaries | Wellington City Council boundary polygons |

Severity is **inferred**, not supplied — `convert_tickets.py` matches keywords in
the ticket text. That is a guess, and the converter is the place to read exactly
how it guesses.

The source links in each incident panel point at real, live, keyless ArcGIS
endpoints — MetService weather alerts, NEMA mobile alerts, Wellington Water
network faults, GW flood hazard and river levels, WCC slope and tree cover. The
app links to them so a reader can reach the authoritative source. It does not
query them at runtime.

The wider dataset catalogue, and the `wcc_gis.py` helper used by `backend/`,
come from the companion project:
https://github.com/claudecommunity-nz/wcc-emergency-gis-data

## Limitations

- **The incidents and the weather are synthetic.** They are shaped like the real
  ticket feed, but nothing on the map happened.
- **Severity is inferred from ticket text**, not from an official assessment.
- **In `incidents.json` an incident's address and its coordinates often disagree** —
  the source CSV's two location columns do not describe the same place. The
  nearby-report card matches on the address, because the address is what the
  reader is shown.
- **No live source is polled.** Official feeds are linked, not fetched.
- **Sharing is a mock.** Nothing leaves the browser.
- **The "What does this mean for your day?" card is static placeholder text.**
  It does not respond to the weather or the incidents. Unlike everything else on
  the page, it is a sketch of an idea, not a working one.
- Underlying WCC hazard layers are **hazard-planning data**, not live emergency
  information.

## Attribution

Suburb boundaries and hazard layers © Wellington City Council and Greater
Wellington Regional Council. Basemap © CARTO, © OpenStreetMap contributors.
Licences vary per dataset — check before publishing anything derived.
