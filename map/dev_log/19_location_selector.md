# Unit 19: Location Selector

## Objective

Let the user choose where on the map they care about, and show it.

Two levels. A search box at the top of the left panel chooses one of the
seven regions — the south coast, the eastern suburbs, and so on. Underneath,
a checkbox per suburb in that region narrows it further. The chosen suburbs
are outlined on the map and the camera frames the region.

On load the map opens on the user's own region, worked out from their
browser location, falling back to the south coast.

The boundaries and the suburb names are Wellington City Council's own, not
drawn by us.

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

- Text input showing the current region; typing turns it into a search box
- The dropdown offers the seven **regions only**. A single suburb is a small,
  easily-missed outline on a city-wide map, and "the south coast" is how both
  the problem statement and a resident talk about this
- Search matches the region name, any member suburb, or a postcode prefix, and
  the row says which suburb matched: `Onslow and the northern hills · matches
  Khandallah`. Without that you would need to already know which region your
  suburb is in — exactly what someone searching does not know
- Matching folds case and macrons, so "owhiro" finds Ōwhiro Bay
- Arrow keys walk the list, Enter chooses, Escape closes, click outside closes
- Below the input, a checkbox per suburb in the chosen region, all on by
  default, with a `Select all` / `Clear all` link and an `n of m shown` count.
  Changing region turns them all back on — the checkboxes narrow a region, they
  are not a selection that should survive leaving it

**Map**:

- `suburb-fill` and `suburb-outline` layers, added beneath the incident pins —
  the outline is context, not something to click
- Filtered to exactly the ticked suburbs; unticking everything outlines nothing
- Camera frames the region with `fitBounds`, and only on a region change.
  Ticking boxes does not move the map — it would lurch under you mid-click

## Implementation

1. `prototype-1/scripts/build_suburbs.py` — also emit `map/src/areas.js` and
   `map/public/wcc-suburbs.geojson`.
2. Create `src/AreaPicker.jsx` — the combobox, in this app's inline-style idiom.
3. `src/InfoPanel.jsx` — accept `areaId` / `onArea`, render `<AreaPicker />`
   above `<ConditionsCard />`.
4. Create `src/suburbLookup.js` — point-in-polygon over the same boundary file,
   for turning a browser location into a region.
5. `src/App.jsx` — hold `areaId` and `activeSuburbs`; resolve the opening region
   from `useGeolocation`; pass `focusArea` and `activeSuburbs` to `<Map />`.
6. `src/Map.jsx` — add the boundary source and the two layers; `setSuburbFilter`
   and `flyToArea` helpers; effects driving the outline from `activeSuburbs` and
   the camera from `focusArea`.

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

**A user's own choice always wins over geolocation.** A cold GPS fix can land
seconds late, well after someone has started clicking. `chosenRef` records that
they chose, and the location effect then leaves them alone — moving the map out
from under someone is worse than not using their location at all. A location
outside Wellington City resolves to `null` and keeps the fallback rather than
guessing a nearest region.

**Choices made before the style loads are held and replayed.** The camera and
outline effects bail while `loadedRef` is false and never re-run, so picking an
area in the first second would otherwise do nothing at all. `pendingFocusRef`
and `pendingOutlineRef` are applied in the `load` handler, the same way this
file already replays incident data that lands early.

## Files Modified

- `src/AreaPicker.jsx` (new)
- `src/suburbLookup.js` (new)
- `src/areas.js` (new, generated)
- `public/wcc-suburbs.geojson` (new, generated)
- `src/InfoPanel.jsx`
- `src/App.jsx`
- `src/Map.jsx`
- `../prototype-1/scripts/build_suburbs.py`

## Status: Complete
