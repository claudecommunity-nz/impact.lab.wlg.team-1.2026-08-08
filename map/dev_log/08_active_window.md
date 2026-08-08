# Unit 08: Active Window

## Objective

Incidents appear and disappear as time moves. Each category has a configurable
duration — an incident is visible only while `currentTime` falls within
`[timestamp, timestamp + duration]`. This turns the map into a live picture
of what is active right now rather than a cumulative damage log.

## Durations per Category

Defined in `CATEGORIES` alongside blast radii:

| Category              | Duration |
|-----------------------|----------|
| Weather Event         | 1 hour   |
| Fallen / Trees        | 4 hours  |
| Slips                 | 6 hours  |
| Flooding              | 2 hours  |
| Road & Footpath       | 8 hours  |
| Drinking / Tap Water  | 3 hours  |

## Implementation

1. Add `durationMs` to each entry in `CATEGORIES` in `incidents.js`.
2. Update `useIncidents.js` — change the `before` filter to an active window
   filter: include an incident when
   `Date.parse(inc.timestamp) <= before && before < Date.parse(inc.timestamp) + cat.durationMs`.
3. No changes needed in `App.jsx`, `Map.jsx`, or `Timeline.jsx`.
4. Confirm in browser: scrub through the timeline — incidents appear and
   disappear. At any given time only the currently active ones are visible.

## Files Modified

- `src/incidents.js`
- `src/useIncidents.js`

## Status: Complete
