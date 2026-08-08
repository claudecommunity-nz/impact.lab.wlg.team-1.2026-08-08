# Unit 17: Dynamic Weather Panel

## Objective

Replace the static weather values in the left panel with synthetic readings
that update as the timeline scrubber moves. Always shows the most recent
snapshot at or before `currentTime`.

## Data

`public/weather.json` — ~20 key snapshots timed to the incident narrative
(heavy rain Jul 10, northerly gusts Jul 11, stream flooding Jul 21, southerly
storm Aug 2, etc.). Each snapshot:

```json
{
  "timestamp": "2026-07-10T06:00:00Z",
  "tempC": 12,
  "feelsLikeC": 9,
  "highC": 13,
  "lowC": 10,
  "condition": "Heavy rain",
  "windKph": 45,
  "windDir": "Northerly",
  "windGustKph": 65,
  "rainChancePct": 95,
  "seaTempC": 14
}
```

Selection: find the latest entry whose `timestamp` ≤ `currentTime`.
Before the first snapshot → show the first. After the last → show the last.

## Implementation

1. Create `public/weather.json` with ~20 snapshots.
2. Create `src/useWeather.js` — fetches weather.json once, returns the active
   snapshot for a given `currentTime`.
3. Update `src/InfoPanel.jsx` — accept `weather` prop, render live values in
   `WeatherCard` and `StatsRow`. Conditions card stays hardcoded (council
   advice, not a weather reading).
4. Update `src/App.jsx` — call `useWeather(currentTime)`, pass result to
   `<InfoPanel />`.

## Files Modified

- `public/weather.json` (new)
- `src/useWeather.js` (new)
- `src/InfoPanel.jsx`
- `src/App.jsx`

## Status: Complete
