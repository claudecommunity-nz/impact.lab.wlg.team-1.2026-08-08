# Unit 05: Emergency Infrastructure

## Objective

Map emergency hubs, water tanks, and post-quake road reopening order to show where people can go and what routes open first after an event.

## Implementation

1. Load emergency hubs and water tanks via `wcc_gis.geojson()` with `outSR=4326`
2. Load post-quake road reopening order dataset
3. Render on pydeck:
   - Hubs as icon layer (distinct marker)
   - Water tanks as scatter layer
   - Roads coloured by reopening priority (phase 1 = green → phase N = red)
4. Sidebar layer toggles; click a hub/tank to show name and address

## Files Modified

- `pages/05_infrastructure.py`

## Status: Planned
