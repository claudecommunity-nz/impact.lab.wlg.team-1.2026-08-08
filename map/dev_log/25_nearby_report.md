# Unit 25: Reported near you

## Objective

Bring Cass's "I saw it" block from `Index2.html` into the working map app, and
make it real: the newest community report in the area on screen, with a
one-tap confirmation.

This is the unverified half of problem statement 01. Everything else in the
panel is forecast or Council data. This card is one person's account of one
street — the thing residents actually want, and the thing no official feed
carries. It is styled apart from the other cards, says it is unverified, and
asks the reader to corroborate rather than treating one report as fact.

## Design

**The card** (`src/NearbyReport.jsx`, in the panel directly under the area
picker, same position Cass had it):

- Warm amber, `#fff4e6` on `#f0c98a`, against the neutral cards around it
- `REPORTED NEAR YOU` tag with a dot in the incident category's colour
- Address as the headline, then `You're viewing <region> · reported <n> hours
  ago · <n> people have confirmed`
- A muted line: *Community report — not verified by Council. In an emergency,
  call 111.* Non-negotiable, per the project's reliability constraint
- `Yes, I saw it` / `No`, 40px tall on a phone

**Which report is shown** — the most recent active incident whose address names
a currently ticked suburb. So the card follows the area picker and the timeline
scrubber, and it disappears when nothing in the window is in view. An empty
"reported near you" would read as "nothing is happening here", which is a
different claim and one this data cannot support.

**After answering** — the buttons are replaced by a thank-you, which fades in,
then the whole card collapses and folds away after 3 seconds. The question has
been asked and answered and the panel is short. It comes back, with fresh
buttons, as soon as a different report is in view.

## Implementation

1. Create `src/NearbyReport.jsx`.
   - Report chosen with a `useMemo` over the active pins.
   - Confirmation count seeded from a hash of the report, so it holds still
     while you look at it. The demo data carries no confirmations.
   - Collapse: measure the card's height, commit it, then transition to zero
     over 380ms. `max-height` cannot animate from `none`, so it needs a real
     number to leave from. A backstop timer covers the case where
     `transitionend` never fires.
2. `src/index.css` — `nearby-thanks-in` keyframes, with a reduced-motion
   opt-out. Inline styles cannot express keyframes.
3. `src/InfoPanel.jsx` — render it under `AreaPicker`, pass `pins` and
   `currentTime` through.
4. `src/App.jsx` — pass `pins` and `currentTime` to `InfoPanel`.

## Known data problem, not fixed here

In `public/incidents.json` the address and the coordinates of a record mostly
do not describe the same place — 275 of 389 disagree. `Weather event — Lambton
Quay, CBD` sits at a point inside Brooklyn. It comes in that way from
`data/synthetic_tickets_1000.csv`, through `data/convert_tickets.py`, which
takes the address text from one column and the lat/lng from two others.

So this card matches on the address, not on point-in-polygon: the address is
what the reader is shown, and matching it keeps the card's own words consistent
with the region on screen. The map pin for the same report is somewhere else.
Worth fixing at source — then both agree and the card can key off geometry.
