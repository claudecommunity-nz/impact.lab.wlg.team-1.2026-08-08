# Unit 01: Foundation — Test Instructions

## Manual Tests

1. `npm run dev` — browser opens `http://localhost:5173`, page loads without console errors
2. `npm run build` — exits 0, `dist/` contains `index.html` and hashed JS/CSS assets
3. `maplibre-gl` CSS is bundled — confirm `dist/assets/*.css` is non-empty

## Success Criteria

- Dev server responds HTTP 200
- Production build exits 0
- No console errors on page load
