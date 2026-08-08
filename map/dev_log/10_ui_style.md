# Unit 10: UI Style

## Objective

Unify the visual style of all floating UI elements so they feel like lightweight
overlays sitting on the map rather than panels attached to the viewport. Consistent
rounded boxes, muted gray background, no elevation, no hard edges.

## Design System

All overlay elements share one style token set:

| Token          | Value                        |
|----------------|------------------------------|
| Background     | `rgba(255,255,255,0.88)`     |
| Border radius  | `12px`                       |
| Border         | `1px solid rgba(0,0,0,0.08)` |
| Box shadow     | none                         |
| Font           | Roboto, 13px, `#1f2937`      |
| Padding        | `12px 16px`                  |

## Per-element changes

### Legend
- Same position (bottom left), same width — just restyle to match tokens above.
- Section divider: a thin `rgba(0,0,0,0.08)` line instead of the current text label.

### Incident Panel
- Remove full-height anchoring (`top: 0, bottom: 0`).
- Float it: `position: absolute`, right-aligned with `top: 16px`, `right: 16px`,
  `max-height: calc(100vh - 32px)`, `overflow-y: auto`.
- Width: `320px`.
- Same border-radius and background as legend.
- Colour bar at top keeps the category colour — 4px, rounded top corners only.
- Remove the hard drop shadow.

## Implementation

1. Create `src/styles.js` — exports the shared style tokens as a plain object.
2. Restyle `Legend.jsx` using the tokens.
3. Restyle `IncidentPanel.jsx` using the tokens — change from full-height panel
   to floating card.
4. Confirm in browser: both elements look visually consistent and float over
   the map without covering it entirely.

## Files Modified

- `src/styles.js` (new)
- `src/Legend.jsx`
- `src/IncidentPanel.jsx`

## Status: Complete
