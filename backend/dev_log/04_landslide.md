# Unit 04: Landslide

## Objective

Display landslide hazard zones across Wellington on an interactive map.

## Implementation

1. Run `wcc_gis.ids("landslide")` to enumerate datasets
2. Load layers as GeoJSON with `outSR=4326`
3. Render on pydeck — colour-coded by hazard severity if attribute is available, otherwise single colour
4. Add sidebar layer toggles and attribute info on click
5. Show feature count; warn if `exceededTransferLimit` is detected in response

## Files Modified

- `pages/04_landslide.py`

## Status: Planned
