# Unit 02: Basemap — Completion Context

## What Was Implemented

`Map.jsx` mounts a MapLibre GL map on a ref'd div, centred on Wellington
`[174.7762, -41.2865]` at zoom 12, using the CARTO Positron style. Cleanup
runs on unmount. `index.css` resets margin/padding and sizes `html`, `body`,
`#root`, and `#map-root` to 100% so the map fills the viewport.

## Key Decisions

- Map container sized via inline `width/height: 100%` on the ref div, with
  the full-height chain handled in CSS — avoids hardcoded pixel values.
- `map.remove()` in useEffect cleanup prevents the double-mount warning from
  React StrictMode.

## Deviations from Plan

None.

## Files Modified

- `src/Map.jsx` (new)
- `src/App.jsx`
- `src/index.css` (new)
- `src/main.jsx`

## Integration Notes

Unit 03 can call `map.addSource()` / `map.addLayer()` by lifting the map
instance via a ref or context — the `useEffect` in `Map.jsx` is the right
place to attach data layers once the map is loaded.
