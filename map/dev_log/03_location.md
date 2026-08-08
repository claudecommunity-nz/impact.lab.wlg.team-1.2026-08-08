# Unit 03: Location

## Objective

Show the user's current position as a pin on the map, with a legend toggle
to turn the layer on and off. Location is sourced from the browser
Geolocation API. This is the first live data layer and proves the
source→state→map pipeline that all subsequent layers will reuse.

## Implementation

1. Create `src/useGeolocation.js` — wraps `watchPosition`, returns a GeoJSON
   Feature (Point) or `null` while permission is pending/denied.
2. In `App.jsx`: call `useGeolocation`, hold a `layers` visibility state
   (`{ location: true }`), pass `locationFeature` and `layers` down to `Map`.
3. In `Map.jsx`: on map `load`, add a `geojson` source `my-location` and a
   `circle` layer styled as a blue pin. When `locationFeature` prop changes,
   call `setData`. When `layers.location` changes, toggle layer visibility
   via `map.setLayoutProperty`.
4. Create `src/Legend.jsx` — a small overlay panel with one toggle row:
   "Your location" + a checkbox/switch. Calls `onToggle('location')` in
   `App.jsx`.
5. Render `<Legend>` in `App.jsx`, positioned absolute over the map.
6. Confirm in browser: pin appears at current position, toggle hides/shows it.

## AI Interactions

## Files Modified

- `src/useGeolocation.js` (new)
- `src/Legend.jsx` (new)
- `src/App.jsx`
- `src/Map.jsx`
- `src/index.css`

## Status: Complete
