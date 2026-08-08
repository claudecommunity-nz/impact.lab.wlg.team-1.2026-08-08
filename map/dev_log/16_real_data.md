# Unit 16: Real Data

## Objective

Replace synthetic incidents.json with the 12 relevant tickets from
synthetic_tickets_v7.csv. Fix the corrupted SERVICE_ITEM values, normalise
category names, assign severity, and expand the timeline to cover the full
date range (10 Jul – 8 Aug 2026).

## Changes

1. **`public/incidents.json`** — 12 tickets mapped from CSV (flooding ×3,
   slips ×3, weather ×2, roads ×2, water ×1, trees ×1). 18 non-emergency
   tickets dropped. Corrupted SERVICE_ITEM split manually. Severity inferred
   from description text.
2. **`src/incidents.js`** — EVENT_WINDOW expanded to Jul 10–Aug 8. durationMs
   increased to days (not hours) so incidents are visible when scrubbing a
   29-day window.
3. **`src/App.jsx`** — SPEED increased to ~1 simulated day per real second so
   play-through takes ~30 seconds.

## Files Modified

- `public/incidents.json`
- `src/incidents.js`
- `src/App.jsx`

## Status: Complete
