# Unit 06: Live Telemetry

## Objective

Display live river level and rainfall data from the Hilltop API as time-series charts.

## Implementation

1. Identify available sites and measurements using `wcc_gis.hilltop_data()` — rivers and rainfall gauges
2. For each site fetch recent readings (last 24h or 7 days)
3. Render a line chart per site using `altair` — time on x-axis, level/flow on y-axis
4. Add a site selector in the sidebar
5. Show last-reading timestamp and a staleness warning if data is older than 1 hour
6. Add a note: "Live telemetry — not an operational emergency source. In an emergency call 111."

## Files Modified

- `pages/06_telemetry.py`

## Status: Planned
