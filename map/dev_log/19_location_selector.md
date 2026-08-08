# Unit 19: Location Selector

## Objective

Let the user choose where on the map they care about, and show it.
A search box at the top of the left panel filters all 57 Wellington City
suburbs by name or postcode, or a whole grouping such as the south coast.
Choosing one outlines its boundary on the map and moves the camera to it.

The boundaries are Wellington City Council's own, not drawn by us.

## Design

**Data** — `src/areas.js`, generated, not hand-written:

- 57 suburbs, each with Council's spelling, a display label, a postcode, a
  region, a centre and a catchment radius
- 7 regions (South coast, Eastern suburbs, City and inner suburbs, Southern
  suburbs, Western suburbs, Onslow and the northern hills, Northern suburbs
  and Tawa), each with its member suburbs and a bounding box
- `public/wcc-suburbs.geojson` — the boundary polygons, fetched by MapLibre

Both come from `prototype-1/scripts/build_suburbs.py`, which pulls WCC's
`PropertyAndBoundaries/Boundaries` layer. That script also generates
prototype-1's copies, so the two apps cannot disagree about where a suburb is
or what it is called. **Do not edit `src/areas.js` by hand** — re-run
`bun run suburbs:build` from `prototype-1/`.

**AreaPicker** (top of InfoPanel, above the conditions card):

- Text input showing the current area; typing turns it into a search box
- Results grouped by region, south coast first — that is the problem statement,
  not alphabetical order
- Each group is led by a selectable row: `SOUTH COAST · all 11`
- Text matches suburb names, case- and macron-insensitive, so "owhiro" finds
  Ōwhiro Bay
- All digits searches postcodes as a prefix; the code shows on every row
  because postcodes are not unique — 6021 covers eight suburbs
- Arrow keys walk the list, Enter chooses, Escape closes, click outside closes

**Map**:

- `suburb-fill` and `suburb-outline` layers, added beneath the incident pins —
  the outline is context, not something to click
- Filtered to the chosen suburb, or to every suburb in the chosen region
- Camera: `flyTo` a suburb, sized from its own catchment; `fitBounds` a region

## Implementation

1. `prototype-1/scripts/build_suburbs.py` — also emit `map/src/areas.js` and
   `map/public/wcc-suburbs.geojson`.
2. Create `src/AreaPicker.jsx` — the combobox, in this app's inline-style idiom.
3. `src/InfoPanel.jsx` — accept `areaId` / `onArea`, render `<AreaPicker />`
   above `<ConditionsCard />`.
4. `src/App.jsx` — hold `areaId` (default `region-south-coast`), pass
   `focusArea={SELECTABLE_BY_ID[areaId]}` to `<Map />`.
5. `src/Map.jsx` — add the boundary source and the two layers; `setSuburbFilter`
   and `flyToArea` helpers; an effect driving both from `focusArea`.

## Notes

Three things worth knowing if you touch this.

**The join key is Council's spelling, not the label.** The boundary data says
`Owhiro Bay`; we display `Ōwhiro Bay`. `areas.js` carries both for that reason.
Filter on `suburb`, never on `label`.

**Zoom is derived, not fixed.** Moa Point is 0.26 km² and Makara is 89 km², and
no single zoom level frames both. Suburbs use the Web Mercator metres-per-pixel
relation solved for zoom; regions use `fitBounds` with left padding for the
sidebar. A region's bounding box is the union of its members — a centre and
radius would be wrong for the western suburbs, which run from Makara Beach to
Wadestown.

**Choices made before the style loads are held and replayed.** The camera and
outline effects bail while `loadedRef` is false and never re-run, so picking an
area in the first second would otherwise do nothing at all. `pendingFocusRef`
and `pendingOutlineRef` are applied in the `load` handler, the same way this
file already replays incident data that lands early.

## Files Modified

- `src/AreaPicker.jsx` (new)
- `src/areas.js` (new, generated)
- `public/wcc-suburbs.geojson` (new, generated)
- `src/InfoPanel.jsx`
- `src/App.jsx`
- `src/Map.jsx`
- `../prototype-1/scripts/build_suburbs.py`

## Status: Complete
