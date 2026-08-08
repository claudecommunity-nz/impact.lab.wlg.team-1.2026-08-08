# WCC Emergency Data — Streamlit Dashboard

Standalone Streamlit app that surfaces all 74 WCC GIS emergency datasets in one view, grouped by hazard type. Uses `wcc_gis.py` as the data layer. Each unit corresponds to one category of data.

## Structure

Units follow `<NN>_<name>.md` naming in `dev_log/`.

## About the Project

### What This Is

A Streamlit dashboard for exploring Wellington City Council emergency and hazard datasets. Data is fetched live from WCC GIS via `wcc_gis.py`. Intended as a standalone analysis/ops tool.

### Architecture

- Streamlit multi-page app (one page per data category)
- `wcc_gis.py` + `catalogue.json` for data access
- `pydeck` for map layers within Streamlit
- `altair` for telemetry charts

### Technical Stack

- Python 3.12+, `uv`
- `streamlit`, `pydeck`, `altair`, `requests`

## Project Status

### Overall Completion

Unit 01 in progress.

## Units

```fancy-kanban
---
title: Units
fields:
  - name: status, type: Select, options: planned|doing|done, label: Status, default: planned
  - name: title, type: Text, label: Title
  - name: description, type: Textarea, label: Description
  - name: file, type: File, label: File
workflow: planned→doing, doing→done, doing→planned, done→doing
---

| _id    | Status  | Title                   | Description                                                  | File                |
|--------|---------|-------------------------|--------------------------------------------------------------|---------------------|
| f1a2b3 | doing   | 01 Foundation           | pyproject.toml, wcc_gis SDK, Streamlit scaffold with nav     | 01_foundation.md    |
| c4d5e6 | planned | 02 Flood & Coastal      | Flood zones, coastal inundation, sea level rise layers       | 02_flood.md         |
| g7h8i9 | planned | 03 Seismic & Tsunami    | Earthquake faults, tsunami evacuation zones                  | 03_seismic.md       |
| j1k2l3 | planned | 04 Landslide            | Landslide hazard zones                                       | 04_landslide.md     |
| m4n5o6 | planned | 05 Emergency Infra      | Emergency hubs, water tanks, post-quake road order           | 05_infra.md         |
| p7q8r9 | planned | 06 Live Telemetry       | River levels and rainfall charts from Hilltop API            | 06_telemetry.md     |
| s1t2u3 | planned | 07 Social Vulnerability | Deprivation by area and climate layers                       | 07_vulnerability.md |
```
