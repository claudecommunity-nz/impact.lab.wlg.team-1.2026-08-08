# Unit 01: Foundation

## Objective

Set up the project from scratch: Python environment, WCC GIS SDK, and a Streamlit multi-page scaffold with navigation stubs for all data units.

## Implementation

1. Create `pyproject.toml` with `uv` — dependencies: `streamlit`, `pydeck`, `altair`, `requests`
2. Copy `wcc_gis.py` and `catalogue.json` from https://github.com/claudecommunity-nz/wcc-emergency-gis-data into project root
3. Create `app.py` — Streamlit home page: project title, brief description, link list to pages
4. Create `pages/` directory with one stub file per data unit (02–07)
5. Verify `wcc_gis.ids()` returns results with no errors

## Files Modified

- `pyproject.toml` (new)
- `wcc_gis.py` (copied)
- `catalogue.json` (copied)
- `app.py` (new)
- `pages/02_flood_coastal.py` (new stub)
- `pages/03_seismic_tsunami.py` (new stub)
- `pages/04_landslide.py` (new stub)
- `pages/05_infrastructure.py` (new stub)
- `pages/06_telemetry.py` (new stub)
- `pages/07_vulnerability.py` (new stub)

## Status: In Progress
