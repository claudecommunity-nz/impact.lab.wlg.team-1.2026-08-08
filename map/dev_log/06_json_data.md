# Unit 06: JSON Data

## Objective

Extract the hardcoded `INCIDENTS` array from `incidents.js` into a static
JSON file served from `public/`. Add an ISO 8601 timestamp to every incident
so future units can filter and animate by time. The time window is hardcoded
in `incidents.js` alongside the blast radii — configurable in one place.

## Time Window

Hardcoded in `incidents.js`:

```js
export const EVENT_WINDOW = {
  start: '2026-08-08T06:00:00+12:00',
  end:   '2026-08-08T14:00:00+12:00',
}
```

8-hour storm event. Incidents are spread across the window with a narrative
arc: wind and tree damage early, slips and flooding building through the
middle, road and water faults appearing later.

## Implementation

1. Add `EVENT_WINDOW` export to `incidents.js`.
2. Add `timestamp` (ISO 8601 string) to every incident in `incidents.js`,
   ordered to tell a credible storm progression story.
3. Create `public/incidents.json` from the updated `INCIDENTS` array
   (typed out as JSON — same fields: `type`, `severity`, `lat`, `lng`,
   `description`, `detail`, `timestamp`).
4. Update `useIncidents.js` to `fetch('/incidents.json')` on mount. Return
   `{ pins, radii, loading }`.
5. Remove the `INCIDENTS` export from `incidents.js` — `CATEGORIES` and
   `EVENT_WINDOW` stay.
6. Confirm in browser: incidents render as before, Network tab shows
   `GET /incidents.json 200`.

## Files Modified

- `public/incidents.json` (new)
- `src/incidents.js`
- `src/useIncidents.js`

## Status: Complete
