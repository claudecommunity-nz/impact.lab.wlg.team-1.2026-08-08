# Unit 01: Foundation

## Objective

Scaffold the project with Vite + React + maplibre-gl so there is a working dev
server and a passing build, ready for Unit 02 to drop a map into.

## Implementation

1. Run `npm create vite@latest . -- --template react` in the `map/` directory
2. Install `maplibre-gl` (`npm install maplibre-gl`)
3. Delete the Vite boilerplate (counter, CSS resets, logo) — leave only the
   App shell and `main.jsx` entry point
4. Add `maplibre-gl/dist/maplibre-gl.css` import to `main.jsx`
5. Confirm `npm run dev` starts without errors and `npm run build` succeeds

## AI Interactions

## Files Modified

- `package.json`
- `src/main.jsx`
- `src/App.jsx`
- `index.html`

## Status: Complete
