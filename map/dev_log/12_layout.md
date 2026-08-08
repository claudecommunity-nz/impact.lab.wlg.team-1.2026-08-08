# Unit 12: Layout

## Objective

Two layout fixes: compact the header so the title sits beside the logo
instead of below it, and move the legend from the map overlay into a
horizontal bar above the timeline.

## Header

Single row: `[red crest W] [Wellington City Council / Te Kaunihera o Pōneke]`
then to the right of that, separated by a vertical divider: `[title + subtitle]`.
Notice bar stays below, full width. Header total height shrinks from ~90px to ~48px.

## Legend bar

Remove `Legend.jsx` from the map overlay. Add a `LegendBar.jsx` component
that sits between the map and the timeline — a dark semi-transparent strip
(same style as the timeline pill but wider) showing all layer toggles as
compact pills in a wrapping flex row, two per visual group:

```
[ ● Your location ]  [ ● Drinking/Tap Water ]  [ ● Fallen/Trees ]  [ ● Slips ]  [ ● Weather ]  [ ● Roads ]  [ ● Flooding ]
```

Each pill: colour dot + label + checkbox. Wraps to a second line if needed.
Sits just above the timeline, anchored bottom-centre like the timeline itself,
wider (80vw, max 860px).

## Implementation

1. Update `Header.jsx` — single-row layout, title/subtitle right of the
   wordmark.
2. Create `src/LegendBar.jsx` — horizontal pill row, absolute positioned,
   bottom 72px (above the timeline at bottom 24px).
3. Remove `<Legend />` from `App.jsx`, add `<LegendBar />`.
4. Delete `src/Legend.jsx`.

## Files Modified

- `src/Header.jsx`
- `src/LegendBar.jsx` (new)
- `src/App.jsx`
- `src/Legend.jsx` (deleted)

## Status: Complete
