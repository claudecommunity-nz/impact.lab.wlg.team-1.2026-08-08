# Unit 03: Seismic & Tsunami

## Objective

Display earthquake fault lines, liquefaction zones, and tsunami evacuation zones on an interactive map.

## Implementation

1. Run `wcc_gis.ids("earthquake")`, `wcc_gis.ids("tsunami")`, `wcc_gis.ids("liquefaction")` to enumerate datasets
2. Load each layer as GeoJSON with `outSR=4326`
3. Render on pydeck — distinct colours: faults (red), liquefaction (orange), tsunami evacuation zones (purple)
4. Add sidebar layer toggles
5. Show tsunami evacuation zone boundaries prominently; add a note distinguishing hazard-planning data from operational advice

## Files Modified

- `pages/03_seismic_tsunami.py`

## Status: Planned
