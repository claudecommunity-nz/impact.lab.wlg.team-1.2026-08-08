# Unit 26: Alert list

## Objective

Turn the right sidebar into a list of every active alert in the area chosen in
the left sidebar. Cards collapsed by default, most serious at the top. Clicking
a pin on the map expands that alert's card; a card can also be expanded by
clicking it.

Read of the brief: the left sidebar stays the control — it is where the area is
chosen — and the alerts for that area appear in the right sidebar. The left
panel gains nothing new beyond what it already drives.

Today the right panel answers one question — *what is this pin?* — and only
after you have found a pin worth clicking. Someone who opens the app for their
own suburb cannot see how many alerts there are, or which is the worst, without
hunting across the map. This unit makes the answer the default view.

## Design

**Source** — the same active-window incidents the map is drawing, filtered to
the ticked suburbs. The list and the pins never disagree, and both follow the
timeline scrubber.

**Order** — severity descending, then newest first. Most serious at the top is
the point of the unit; time breaks the tie.

**Collapsed card**:

- Category colour bar down the left edge, as the incident panel has now
- Description on one line, truncated with an ellipsis
- Severity chip and relative time on the row beneath

**Expanded card** — the current incident panel body, unchanged: what's
happening, what it means, authoritative sources, and the yellow Share button.

**One open at a time.** An accordion, not independent toggles. Twenty expanded
cards is the map-hunting problem again in a different shape.

**Selection from the map** expands that alert's card and scrolls it into view.
Selecting a different pin collapses the previous one. Clicking the open card's
header collapses it.

**Header** — `N alerts in <region>`, with a count per severity beneath it.

**Empty state** — *No active alerts in <region> at this point in the
timeline.* Tied to the scrubber position, because that is what makes it empty.
Never a bare blank panel, which reads as broken rather than as quiet.

**Mobile** — the right panel is already a bottom sheet. Collapsed, its handle
carries the alert count; expanding the sheet shows the list.

## Implementation

1. Split `IncidentPanel.jsx`: the body becomes `AlertCard.jsx`, taking an
   `expanded` prop. The existing panel keeps working for a single incident.
2. New `AlertList.jsx` — header, sorted cards, empty state, accordion state.
3. `App.jsx` — pass the filtered incidents and `selectedIncident` down; a map
   click sets the expanded card rather than opening a standalone panel.
4. Suburb filtering reuses the address parse written for Unit 25. Extract
   `suburbOf()` from `NearbyReport.jsx` into a small shared module rather than
   copying it.
5. Severity rank helper: `high` > `medium` > `low`.

## Depends on / risks

- **`IncidentPanel`'s severity map is keyed `red` / `yellow`, but the data uses
  `high` / `medium` / `low`.** Every incident therefore falls through to
  "Medium — Monitor" today. Sorting a list by severity puts that in plain sight,
  so the map has to be corrected as part of this unit.
- **`incidents.json` addresses and coordinates disagree** for most records — see
  Unit 25. Membership of the list is decided on the address, so a card can name
  a street in the chosen area while its pin sits outside the outline. Fixing the
  source CSV removes the problem for both units.
- Performance: 389 incidents, a handful active at any scrubber position. No
  virtualisation needed.

## Files modified

- `src/AlertList.jsx` (new)
- `src/AlertCard.jsx` (new, extracted from `IncidentPanel.jsx`)
- `src/IncidentPanel.jsx`
- `src/App.jsx`
- `src/suburbs.js` (new — shared `suburbOf()`)

## Status: Planned
