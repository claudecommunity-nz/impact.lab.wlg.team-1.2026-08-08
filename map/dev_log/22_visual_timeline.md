# Unit 22: Visual Timeline Bar

## Objective

Replace the plain dark scrubber pill with a full-width bar that visualises
incident density over time — inspired by Shademap's bottom bar where the
visual itself carries data. The bar becomes a heatmap: calm periods are dark
and quiet, incident clusters glow with category colour.

## Design

- **Full width**, pinned to the bottom, no border-radius pill shape
- **Canvas background** — pre-computed per-pixel colour showing incident
  density across the July 9 → Aug 8 range. Each pixel column maps to a time
  slice; colour is blended from active incident category colours, brightness
  increases with count.
- **Range input** sits on top of the canvas, transparent track, styled thumb
- **Play/pause** button left of the bar
- **Current time label** floats above the thumb, updates as it moves
- Height: ~48px — tall enough to read the heatmap, slim enough to not crowd

## Implementation

1. `src/Timeline.jsx` — replace current pill layout:
   - Render a `<canvas>` element sized to the bar dimensions
   - On mount and when incidents change, draw the heatmap via a
     `useEffect`: slice the time range into N buckets (one per canvas pixel
     width), count active incidents per bucket, blend category colours,
     write pixel data with `putImageData`
   - Layer a transparent `<input type="range">` on top with CSS
   - Keep play/pause and time label
2. Pass `allIncidents` (raw array before time filter) down from
   `useIncidents` so the canvas has the full dataset.
3. `src/useIncidents.js` — also export the raw incidents array.

## Files Modified

- `src/Timeline.jsx`
- `src/useIncidents.js`
- `src/App.jsx`

## Status: Complete
