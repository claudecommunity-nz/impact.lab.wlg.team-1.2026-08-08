# Unit 04: Incidents

## Objective

Display community incident reports as map layers — one per category — each
with a configurable blast radius circle. Synthetic hardcoded data stands in
until a real CSV is provided in a future unit. Each category is independently
toggleable via the legend.

## Categories and Blast Radii

| # | Category                      | Colour  | Radius |
|---|-------------------------------|---------|--------|
| 1 | Drinking / Tap Water          | #0ea5e9 | 200 m  |
| 2 | Fallen or Dangerous Trees     | #16a34a | 50 m   |
| 3 | Slips                         | #b45309 | 150 m  |
| 4 | Weather Event                 | #7c3aed | 400 m  |
| 5 | Road & Footpath Maintenance   | #d97706 | 80 m   |
| 6 | Flooding                      | #1d4ed8 | 500 m  |

## Implementation

1. Create `src/incidents.js` — exports `CATEGORIES` (id, label, colour,
   radiusMetres) and `INCIDENTS` (hardcoded array of ~3–4 incidents per
   category, each with `type`, `lat`, `lng`, `description`).

2. Create `src/useIncidents.js` — converts `INCIDENTS` into two GeoJSON
   FeatureCollections per category: one Point collection (pins) and one
   Polygon collection (radius circles, approximated as 64-point polygons).

3. In `Map.jsx` — on map `load`, register one icon per category (coloured
   circle SVG generated inline), add a `geojson` source + `symbol` layer for
   pins and a `geojson` source + `fill` + `line` layer for radii. Update
   sources when props change.

4. In `App.jsx` — add incident layers to the `layers` state object (one key
   per category id, default `true`). Pass incident GeoJSON and layers to Map.

5. In `Legend.jsx` — add a section for incidents with one toggle row per
   category, showing a colour swatch and label.

6. Confirm in browser: all 6 categories visible, circles rendered around each
   pin, each toggle hides/shows its category independently.

## Synthetic Data

3–4 incidents per category, placed at realistic Wellington streets/suburbs
(Newtown, Kelburn, Island Bay, Karori, Thorndon, Te Aro).

## AI Interactions

## Files Modified

- `src/incidents.js` (new)
- `src/useIncidents.js` (new)
- `src/Map.jsx`
- `src/App.jsx`
- `src/Legend.jsx`

## Status: In Progress
