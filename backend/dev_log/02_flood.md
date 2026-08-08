# Unit 02: Flood & Coastal

## Objective

Display all flood and coastal hazard layers on an interactive pydeck map within Streamlit.

## Implementation

1. Run `wcc_gis.ids("flood")` and `wcc_gis.ids("coastal")` to enumerate available datasets
2. Load each layer as GeoJSON via `wcc_gis.geojson(id, bbox=wcc_gis.WELLINGTON, outSR=4326)`
3. Render layers on a pydeck `GeoJsonLayer` — distinct colour per layer
4. Add a sidebar layer toggle (checkbox per dataset)
5. Show a summary table: dataset name, feature count, source, last updated

## Files Modified

- `pages/02_flood_coastal.py`

## Status: Planned
