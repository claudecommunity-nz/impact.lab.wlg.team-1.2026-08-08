# Unit 05: Incident Panel

## Objective

Clicking an incident pin opens a panel on the right side of the map showing a
human-readable description of the emergency, a severity badge (yellow/red),
and the authoritative WCC/GW data sources that back up that category. Clicking
outside or pressing Escape closes it.

## Severity Levels

- **Yellow** — monitor the situation, awareness needed
- **Red** — immediate danger, take action now

Severity is stored per incident in the hardcoded data.

## Authoritative Sources per Category

Drawn from `catalogue.json` (74 WCC datasets):

| Category              | Sources                                              |
|-----------------------|------------------------------------------------------|
| Drinking / Tap Water  | `water-network-faults`, `emergency-water-tanks`      |
| Fallen / Dangerous Trees | `tree-cover`, `wind-zones`                        |
| Slips                 | `landslide-features`, `slope-failure`, `slope-degrees` |
| Weather Event         | `metservice-warnings`, `nema-cap-alerts`, `rainfall-observations` |
| Road & Footpath       | `roads`, `footpaths`, `nzta-warnings`                |
| Flooding              | `flood-hazard-areas`, `storm-surge`, `river-levels-viewer` |

## Implementation

1. Add `severity` (`'yellow'` | `'red'`) and `detail` (a full human-readable
   sentence) to each incident in `incidents.js`. Add `sources` array (id +
   label + url) to each category in `CATEGORIES`.

2. Create `src/IncidentPanel.jsx` — fixed panel anchored to the right edge,
   slides in when an incident is selected. Shows:
   - Category colour bar at top
   - Category label + severity badge
   - Incident description (short) + detail (full sentence)
   - "What this means" paragraph (per category, written in plain English)
   - Authoritative sources list with links

3. In `Map.jsx` — add a click handler on each `incident-pin-*` layer that
   calls `onIncidentClick(properties)` prop. Add cursor pointer on hover.

4. In `App.jsx` — manage `selectedIncident` state, pass `onIncidentClick` to
   Map and `incident` to IncidentPanel. Clicking the map background clears
   selection.

5. Confirm in browser: click pin → panel opens with correct data, click
   elsewhere → panel closes, Escape closes it.

## Files Modified

- `src/incidents.js`
- `src/IncidentPanel.jsx` (new)
- `src/Map.jsx`
- `src/App.jsx`

## Status: In Progress
