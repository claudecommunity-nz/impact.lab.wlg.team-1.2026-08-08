# Unit 03: Location — Completion Context

## What Was Implemented

`useGeolocation.js` wraps `watchPosition` and returns a GeoJSON Point feature
or null. `Map.jsx` adds a `my-location` GeoJSON source and circle layer on
map load, seeding it with the latest prop values via refs to avoid a race
between geolocation resolving and the map load event. `Legend.jsx` renders a
checkbox overlay that toggles layer visibility. `App.jsx` owns the layers
state and wires everything together.

## Key Decisions

- Props mirrored into refs inside `Map.jsx` so the `load` handler can apply
  the latest values regardless of when it fires relative to geolocation.
- Circle layer chosen over a custom icon — no image asset needed, renders
  immediately.

## Deviations from Plan

None.

## Files Modified

- `src/useGeolocation.js` (new)
- `src/Legend.jsx` (new)
- `src/App.jsx`
- `src/Map.jsx`

## Integration Notes

Adding a new data layer follows the same pattern: a hook returns GeoJSON
features, `App.jsx` passes them as a prop, `Map.jsx` registers a source and
layer on load and updates via a `useEffect`.
