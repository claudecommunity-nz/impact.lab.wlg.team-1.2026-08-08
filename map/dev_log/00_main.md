# Project Plan and Dev Log

Map spike for Team 1's Impact Lab prototype (Problem 01 — bringing official
warnings and local conditions into one clear view). This proves the map
foundation the rest of the prototype will render on top of: hazard/emergency
data layers, and potentially user-drawn local condition reports. Built under
MMDD — granular units, developer approval at every step.

## Structure

Work is organized into units, each with a plan (`NN_name.md`), optionally a
`_test.md`, and a `_done.md` on completion — see `00_mmdd.md`. Status is
tracked in the kanban board below, per `00_kanban.md`.

## About the Project

### What This Is
A standalone, interactive Wellington map: base map first, then a client-side
architecture ready to take GeoJSON data layers and (potentially) user-drawn
annotations on top. Built to be lifted into the team's main prototype once
proven.

### Architecture
Client-side only, no backend. Council ArcGIS endpoints send permissive CORS
headers, so GeoJSON layers can be fetched directly from the browser in later
units. The map instance built in Unit 02 is the surface everything else
attaches to.

### Technical Stack
- Vite + React
- `maplibre-gl` for the map
- Free, no-key CARTO Positron vector basemap style
- Data source (later units): WCC/GW ArcGIS REST endpoints catalogued in the
  `wcc-emergency-gis-data` repo (`../../data/catalogue.json`)

## Project Status

### Overall Completion
Units 01–03 complete. Interactive Wellington basemap with live location pin and legend toggle.

### Completed Features
- Vite 6 + React 19 scaffold with maplibre-gl 5
- Full-viewport interactive map centred on Wellington (CARTO Positron basemap)
- Live user location pin (browser Geolocation API) with legend toggle

## Units

```fancy-kanban
---
title: Units
fields:
  - name: status, type: Select, options: planned|doing|done, label: Status, default: planned
  - name: title, type: Text, label: Title
  - name: description, type: Textarea, label: Description
  - name: file, type: Link, label: File
workflow: planned→doing, doing→done, doing→planned, done→doing
---

| _id    | Status  | Title         | Description                                                                  | File             |
|--------|---------|---------------|-------------------------------------------------------------------------------|------------------|
| 7f3k2q | done    | 01 Foundation | Scaffold the project (Vite + React + maplibre-gl) with a working dev server   | 01_foundation.md |
| m9x1lb | done    | 02 Basemap    | Render an interactive base map centered on Wellington                        | 02_basemap.md    |
| p4r8nt | done    | 03 Location   | Show user position as a pin with a legend toggle to turn the layer on/off   | 03_location.md   |
| k2m7vw | done    | 04 Incidents  | Six incident categories as map layers with blast radii and legend toggles   | 04_incidents.md  |
| h6t3pz | done    | 05 Panel      | Click a pin to open a right-side panel with severity, detail and sources    | 05_incident_panel.md |
| r9w2cx | done    | 06 JSON Data  | Extract hardcoded incidents to a static JSON file fetched at runtime        | 06_json_data.md      |
| v5n8ej | done    | 07 Timeline   | Video-style scrubber to play and scrub through the storm event over time    | 07_timeline.md       |
| c3f1yw | done    | 08 Active Window | Incidents appear and disappear based on per-category duration           | 08_active_window.md  |
| q7d4bm | done    | 09 Timeline Orientation | Right=now, left=past, relative offset labels (-H:mm)          | 09_timeline_orientation.md |
| x8k2pn | done    | 10 UI Style   | Unified floating overlay style — rounded, gray, no elevation               | 10_ui_style.md       |
| b2j5qt | done    | 11 Info Cards | WCC header + floating info cards (weather, conditions, stats) over the map | 11_info_cards.md     |
| n4w9xc | done    | 12 Layout     | Compact header, legend moved to horizontal bar above timeline              | 12_layout.md         |
| t6h1rx | done    | 13 Legend Width | Legend bar spans full width, pills distributed with space-evenly         | 13_legendbar_width.md |
| f2p8ks | done    | 14 Filter Modal | Filter button + modal replaces legend bar and search bar                 | 14_filter_modal.md    |
| w3c9br | done    | 15 WCC Branding | WCC yellow on header crest and timeline interactive accents              | 15_wcc_branding.md    |
| d8r2nf | done    | 16 Real Data    | Replace synthetic incidents with 12 tickets from CSV, expand timeline   | 16_real_data.md       |
| y5w1kp | done    | 17 Dynamic Weather | Left panel weather updates as timeline scrubs — 21 synthetic snapshots | 17_dynamic_weather.md |
| m1t6rz | done    | 18 Timeline Labels | Human-readable relative time labels (Xd Yh ago) on the scrubber       | 18_timeline_labels.md |
| d7v3mq | done    | 19 Location Selector | Region search + per-suburb checkboxes; outlines the area and opens on the user's own region | 19_location_selector.md |
| j4q7ha | done    | 20 Share Alert | Share button on the incident panel opens a mock share modal with source and time attached | 20_share_alert.md |
| p9q3vw | done    | 21 Data 1000      | Conversion script maps 389 relevant tickets to incidents.json          | 21_data_1000.md       |
| k8n2tv | done    | 22 Visual Timeline | Full-width heatmap bar showing incident density and category colour over time | 22_visual_timeline.md |
| z2r8gv | done    | 23 Dynamic Notice  | Notice bar text driven by current weather + incidents; click for detail modal | 23_dynamic_notice.md  |
| z6b4nk | done    | 24 Responsive     | Phone layout — bottom sheets, stacked header, touch targets            | 24_responsive.md      |
| s8g5tv | done    | 25 Nearby Report  | Newest community report for the area on screen, with a confirmation that collapses after 3s | 25_nearby_report.md |
```

More units (data layers, draw annotations) get added to this board as we go.