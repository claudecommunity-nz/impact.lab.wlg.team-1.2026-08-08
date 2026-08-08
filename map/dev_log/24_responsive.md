# Unit 24: Responsive on Mobile

## Objective

Make the map usable on a phone. The people this prototype is for are standing
on Ōwhiro Bay Road in the rain, checking whether they can get home — not sitting
at a 1440px browser. Right now the 280px sidebar covers most of a phone screen,
the timeline is a fixed 50vw pill, and the incident panel sits over the map it
is describing.

Breakpoint: **720px**. Below it, the interface moves from "overlays around a
map" to "map with sheets under it".

## Design

**A `useIsMobile()` hook, not a CSS file.** Every component in this project
styles inline. A stylesheet with media queries would mean two places to look for
any given rule. One `matchMedia` hook returning a boolean keeps all the styling
in the component, next to the thing it styles.

**Header** — stacks. The wordmark and the title sit on two rows, the vertical
divider goes, and the descriptor line ("Live hazard and weather information…")
is dropped. The notice bar stays: a heavy rain warning is the one thing that
must survive every screen size.

**InfoPanel becomes a bottom sheet.** Collapsed it is a 46px handle showing the
chosen region and the current temperature — enough to know what you are looking
at. Tap to expand to 70vh of scrollable cards, exactly the desktop cards, no
redesign. Collapsed by default, because on a phone the map is the thing.

**IncidentPanel becomes a bottom sheet too** — full width, anchored bottom,
72vh cap, rounded top corners, above the info sheet in the stack. The pin you
tapped stays visible in the top half of the map.

**The timeline is left alone.** This unit originally made the old floating pill
edge-to-edge on a phone. Unit 22 landed first and replaced that component with a
full-width bar anchored to the foot of the map, which is already the right shape
at any width. Both sheets now sit at `bottom: 26` to clear it.

**Camera padding follows the layout.** `flyToArea` reserves 340px on the left
for the sidebar. On a phone there is no left sidebar — the reserve moves to the
bottom, sized as a fraction of map height so `fitBounds` can never be handed
more padding than viewport.

**Tap targets and iOS quirks:**

- Suburb checkboxes 14 → 18px, rows given vertical padding
- The area search input goes to 16px — below that iOS Safari zooms the whole
  page on focus and never zooms back
- `100dvh` on the root, so the map is not cut off by the address bar
- `overscroll-behavior: none`, so dragging the map does not pull-to-refresh

## Implementation

1. `src/useIsMobile.js` — `matchMedia('(max-width: 720px)')` with a change listener.
2. `src/index.css` — `100dvh`, `overscroll-behavior`, text-size-adjust.
3. `src/Header.jsx` — stacked compact variant.
4. `src/InfoPanel.jsx` — sheet wrapper with a handle; cards unchanged.
5. `src/AreaPicker.jsx` — dropdown repositioned, larger controls.
6. `src/IncidentPanel.jsx` — bottom sheet geometry.
7. `src/ShareModal.jsx` — scroll cap so the card fits a short screen.
8. `src/Map.jsx` — responsive `fitBounds` padding.

## Notes

**The dropdown's magic `top: 68` is gone.** It was measured against a 12.5px
input; a 16px input on mobile pushes the input's bottom edge past it and the
list overlapped. The input now lives in its own relative wrapper and the list
hangs off `top: 100%`, so it is correct at any font size.

**The info sheet starts collapsed and the incident sheet outranks it.** Two
sheets fighting for the bottom of a phone screen is the obvious failure here.
The incident panel is a response to a deliberate tap, so it wins.

**Not done: gesture-dragging the sheets.** A drag handle that responds to touch
is the right end state, but tap-to-toggle demos identically and costs a fraction
of the build time.

## Files Modified

- `src/useIsMobile.js` (new)
- `src/index.css`
- `src/Header.jsx`
- `src/InfoPanel.jsx`
- `src/AreaPicker.jsx`
- `src/IncidentPanel.jsx`
- `src/ShareModal.jsx`
- `src/Map.jsx`

## Status: Complete
