# Unit 02: Basemap

## Objective

Mount a MapLibre GL map into `#map-root`, centered on Wellington, filling the
full viewport. No data layers yet — just a working, pannable/zoomable basemap.

## Implementation

1. Create `src/Map.jsx` — initialises `maplibre-gl` on mount, destroys on
   unmount. Centre `[174.7762, -41.2865]`, zoom 12.
2. Style: CARTO Positron — `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (no key required)
3. Add `src/index.css` with a viewport reset (`margin: 0`, `body`/`html` 100%)
   and `#map-root` sized to `100vw × 100vh`
4. Import `index.css` in `main.jsx`
5. Render `<Map />` from `App.jsx`
6. Confirm in browser: tiles load, map pans and zooms

## AI Interactions

## Files Modified

- `src/Map.jsx` (new)
- `src/App.jsx`
- `src/index.css` (new)
- `src/main.jsx`

## Status: Complete
