# Unit 20: Share an Alert

## Objective

Let someone pass a single alert on to the people it affects, without retyping
it into a Facebook group and losing the source and the time on the way.

A "Share" button in the incident panel opens a modal showing what would be
shared and where it could go. Static mock-up — the platform tiles are visual
only, nothing is posted anywhere.

## Design

**Share button** (incident panel, on the severity row):

- Sits to the right of the severity badge, `margin-left: auto`
- Outlined, not filled — the panel's own content is the point, not this
- Three-node share glyph, the platform-neutral one, not any brand's

**ShareModal**:

- Fixed backdrop over the whole viewport, click outside to close
- Card carries the category colour bar, same as the panel it came from
- **Preview of what gets shared** — category, headline, `Reported 6:30 am ·
  Wellington conditions map`. The point of the unit is visible here: the source
  and the time travel with the alert
- Six platform tiles in a 3×2 grid: X, Facebook, WhatsApp, Messenger, Email,
  Text. Brand colour, white glyph, hover lifts the tile
- Copy-link row with a mock permalink; the button flips to "Copied" for 1.6s
- Footer: nothing is posted, and a shared alert would stay labelled a community
  report until Council confirms it

## Implementation

1. Create `src/ShareModal.jsx` — backdrop, preview card, platform grid, copy row.
2. Update `src/IncidentPanel.jsx`:
   - `sharing` state, reset whenever `incident` changes
   - Wrap the severity badge in a flex row; add the Share button
   - Render `<ShareModal />` as a sibling of the panel, not a child

## Notes

**Escape unwinds one layer at a time.** The panel already closed on Escape. Its
handler now bails while `sharing` is true, so the first Escape closes the modal
and the second closes the panel. Both listeners are live at once; only the
modal's does anything on the first press.

**The modal is a sibling of the panel, not a child.** The panel is
`position: absolute` with `overflow: hidden` and a scrolling body — a fixed
child inside it is at the mercy of that clipping. Rendering it outside keeps
the backdrop over the full viewport.

**The tiles do nothing on purpose.** Real sharing means either the Web Share
API or six per-platform intent URLs, and neither is worth build time before the
alert has a permanent URL to point at. The mock-up shows the shape of it, and
the footer says plainly that it is a mock-up rather than letting a judge assume
otherwise.

## Files Modified

- `src/ShareModal.jsx` (new)
- `src/IncidentPanel.jsx`

## Status: Complete
