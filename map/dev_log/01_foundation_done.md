# Unit 01: Foundation — Completion Context

## What Was Implemented

Vite 6 + React 19 project scaffolded manually (create-vite blocked on
non-empty directory prompt). maplibre-gl 5 installed and its CSS imported in
`main.jsx`. App shell stripped to a bare `<div id="map-root" />` ready for
Unit 02.

## Key Decisions

- Scaffolded by hand rather than via create-vite — identical output, avoids
  interactive prompt issue in non-TTY environment.
- maplibre-gl 5 (latest) — no breaking changes relevant to this spike.

## Deviations from Plan

None — steps executed as written.

## Files Modified

- `package.json`
- `index.html`
- `vite.config.js`
- `src/main.jsx`
- `src/App.jsx`

## Integration Notes

Unit 02 mounts the map into `#map-root`. That div must fill the viewport —
CSS for that goes in Unit 02, not here.
