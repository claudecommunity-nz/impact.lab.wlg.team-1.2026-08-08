# Lyall Bay weather dashboard

A single-file HTML mockup/dashboard built as a Claude Cowork artifact. Shows current
conditions for Lyall Bay, Wellington, aggregates real official data sources, and
answers "what does this mean for me" questions with a mostly-free rule engine
(AI only as a fallback for unmatched free text).

## What's in it

- **Current conditions**: temperature, wind, rain chance, sea temp
- **Official sources panel**: MetService forecast summary, NIWA link, WREMO
  civil defence swell warning, Wellington City Council alerts
- **Live hazard check**: queries WCC's public ArcGIS REST API directly
  (no API key required) to confirm whether the location sits inside the
  council's CDEM tsunami evacuation zone
- **Illustrative local map**: SVG showing wind/swell direction relative to the bay
  (not a live tile map — see Limitations)
- **"What does this mean for me" box**: a small rule engine matches common
  intents (laundry, commuting, beach/exercise, gardening, evacuation questions,
  staying home, pets, rain gear) and answers instantly with no AI call. Only
  unrecognised free-text questions fall through to an AI call, and those get
  cached client-side so the same question never costs a second call.

## Data sources

| Source | Type | Notes |
|---|---|---|
| MetService | Manual/scheduled check | No public API found; page is JS-rendered |
| NIWA | Link only | Public forecast site, no API integrated |
| WREMO (civil defence) | Manual/scheduled check | No public API; social/web page only |
| Wellington City Council news | Manual/scheduled check | No public API for alerts |
| WCC ArcGIS hazard GIS | **Live REST query** | Keyless, public, `gis.wcc.govt.nz/arcgis/rest/services/...` — confirmed working via direct query in this project |

The hazard layer catalogue (74 datasets: flood, tsunami, landslide, earthquake,
liquefaction, climate projections, etc.) came from a companion project that
probed WCC/GWRC's ArcGIS Open Data portal and verified which endpoints are
public and keyless. None of the sources above expose a citizen-report/"Fix It"
feed — that system is a submission-only form, not a public dataset.

## Limitations

- The map is an illustrative SVG, not a real interactive map — the artifact
  sandbox only allows loading scripts from a small CDN allowlist (Chart.js,
  Grid.js, Mermaid), which excludes map tile providers.
- MetService/NIWA/WREMO/WCC news content is not live-polled by the page itself;
  it needs a scheduled task (external to this HTML) to refresh it periodically,
  since the sandbox can't call arbitrary external APIs client-side.
- The hazard GIS check queries a single point — a "no result" for flood depth
  or liquefaction at that point is not a confirmed "no risk" for the wider area.

## Files

- `lyall_bay_dashboard.html` — the dashboard itself, self-contained (inline CSS/JS)

## License

Add a license of your choice (MIT recommended for a demo/mockup like this).

## Pushing to GitHub

```bash
cd path/to/this/folder
git init
git add lyall_bay_dashboard.html README.md
git commit -m "Add Lyall Bay weather dashboard mockup"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
