# Unit 09: Timeline Orientation

## Objective

Reframe the timeline as a live view: the right edge is always "now" (0) and
the left edge is the furthest point in the past. The time label shows a
relative offset (e.g. `-3:00` for three hours ago) instead of an absolute
clock time. This makes the map feel like a live dashboard you can scrub back
from, rather than a replay of a fixed historical window.

## Implementation

1. Update `Timeline.jsx`:
   - Range `min = -(win.end - win.start)`, `max = 0`, `value = currentTime - win.end`
   - `onChange` converts offset back to epoch ms: `onSeek(win.end + offset)`
   - Time label: `formatOffset(offsetMs)` → `now` at 0, `-H:mm` in the past
   - Left edge label shows the maximum negative offset (total window span)
2. No changes to `App.jsx`, `useIncidents.js`, or any other file.

## Files Modified

- `src/Timeline.jsx`

## Status: Complete
