# Unit 13: Legend Bar Full Width

## Objective

Stretch the legend bar to span the full map width so pills are evenly
distributed across the screen. If they don't all fit on one line they
wrap to a second row.

## Implementation

1. In `LegendBar.jsx` — remove `left: 50%` / `transform: translateX(-50%)`
   centering. Replace with `left: 0, right: 0, padding: '0 16px'` so the
   container spans edge to edge.
2. Change `justifyContent` from `'center'` to `'space-evenly'` so pills
   spread across the full width.
3. Remove `maxWidth` constraint.

## Files Modified

- `src/LegendBar.jsx`

## Status: Complete
