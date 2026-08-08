# Unit 06: JSON Data — Completion Context

## What Was Implemented

`INCIDENTS` moved from `incidents.js` to `public/incidents.json`. Every
incident now carries an ISO 8601 `timestamp` following a credible 8-hour
storm arc (06:00–14:00 NZST): weather events and trees first, slips and
flooding building through the middle, road and water network faults appearing
last as infrastructure fails under sustained damage.

`EVENT_WINDOW` added to `incidents.js` (start/end timestamps, configurable
alongside blast radii). `useIncidents.js` now fetches `/incidents.json` at
mount instead of importing a static array, returning `{ pins, radii, loading }`.

## Key Decisions

- JSON in `public/` (not `src/`) so it is served as a static file and can be
  swapped without a rebuild — ready for real CSV data in a future unit.
- Incidents sorted chronologically in the JSON so the file is readable as a
  narrative.

## Deviations from Plan

Added a comment in `incidents.js` pointing editors to the JSON file.

## Files Modified

- `public/incidents.json` (new)
- `src/incidents.js`
- `src/useIncidents.js`
- `src/App.jsx` (minor)
