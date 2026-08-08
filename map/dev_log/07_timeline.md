# Unit 07: Timeline

## Objective

A minimal time scrubber at the bottom of the map lets the user play through
the 8-hour storm event or drag to any point in time. Incidents appear
cumulatively as the clock reaches their timestamp and stay visible — building
a picture of damage over time.

## Playback

- Speed: 1 real second = 15 simulated minutes → full 8-hour window plays in
  ~32 seconds. Feels watchable without being too slow to demo.
- Play advances `currentTime` on a `requestAnimationFrame` loop.
- At the end of the window, playback stops (no auto-loop).
- Incidents with `timestamp <= currentTime` are visible; others are hidden.

## UI — keep it discrete

Fixed bar anchored to the bottom centre of the viewport. Semi-transparent
dark background, no border, no shadow. Contains:

- Play / Pause icon button (left)
- Scrubber `<input type="range">` (fills available width)
- Current time label `HH:mm` (right, monospace, small)

No labels on the track, no tick marks — let the incident pins tell the story.

## Implementation

1. Create `src/Timeline.jsx` — the scrubber component. Accepts `currentTime`
   (ms epoch), `window` (`{ start, end }` as ms), `playing`, `onSeek`,
   `onTogglePlay`.

2. In `App.jsx`:
   - Parse `EVENT_WINDOW` into ms on mount.
   - Hold `currentTime` (starts at window start) and `playing` state.
   - `useEffect` drives a `requestAnimationFrame` loop when `playing` is true:
     advances `currentTime` by `delta * SPEED` (SPEED = 15 min/s in ms).
   - Pass `currentTime` to `useIncidents` as a filter — only include incidents
     where `Date.parse(inc.timestamp) <= currentTime`.

3. Update `useIncidents.js` — accept optional `before` (ms) argument; when
   provided, filter incidents before building GeoJSON.

4. Render `<Timeline />` in `App.jsx` over the map.

5. Confirm in browser: play from start → pins appear one by one as their
   timestamp is reached; drag scrubber → map updates instantly.

## Files Modified

- `src/Timeline.jsx` (new)
- `src/App.jsx`
- `src/useIncidents.js`

## Status: In Progress
