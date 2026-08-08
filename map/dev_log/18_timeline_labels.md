# Unit 18: Human-Readable Timeline Labels

## Objective

Replace the `-H:MM` offset format on the timeline with natural language
relative labels that make sense across the 29-day window.

## Format

- `now` — at the right edge
- `Xm ago` — less than 1 hour
- `Xh Ym ago` — less than 1 day (omit minutes if zero)
- `Xd Yh ago` — 1 day or more (omit hours if zero)

## Files Modified

- `src/Timeline.jsx`

## Status: Complete
