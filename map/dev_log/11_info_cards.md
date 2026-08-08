# Unit 11: Info Cards

## Objective

Port the left-panel cards from `index.html` into the React app as floating
overlays on the map. Add the WCC branded header above the map. All data
stays hardcoded — real data sources come in a future unit.

## Layout

```
┌─────────────────────────────────────────┐
│  Header (WCC wordmark + title + notice) │
├─────────────────────────────────────────┤
│  Map (fills remaining height)           │
│  ┌──────────────┐   ┌────────────────┐  │
│  │ Search       │   │ Incident panel │  │
│  │ Conditions   │   │ (existing)     │  │
│  │ Weather      │   └────────────────┘  │
│  │ Wind / Rain  │                       │
│  │ Sea temp     │  [Legend bottom-left] │
│  └──────────────┘                       │
│         [Timeline bottom-centre]        │
└─────────────────────────────────────────┘
```

## Components

### `src/Header.jsx`
- Black topbar with WCC wordmark (crest + "Wellington City Council /
  Te Kaunihera o Pōneke")
- `h1` "Kia ora, local alerts & weather" + subtitle
- Yellow notice bar "Heavy rain warning in effect"
- All hardcoded, Public Sans font (add to `index.html`)
- No WCC logo image — use the red square crest with "W" as in the HTML

### `src/InfoPanel.jsx`
Floating card stack, `position: absolute`, top-left, uses `overlay` tokens
from `styles.js`. Contains:

1. **Search bar** — static, non-functional placeholder
2. **Conditions card** — "What does this mean for your day?" with three rows
   (Drinking water / Safe, Washing clothes / Wait until 2pm, Walking the dog
   / Fine outside) using green/amber pills
3. **Weather card** — 15°, description, cloud icon, feels-like / H / L
4. **Stat row** — Wind (35 km/h, southerly gusting 55) + Rain chance (70%)
   side by side
5. **Sea temp card** — 14°, swell 2.5m south coast

## App changes

- Wrap map + overlays in a flex column: `Header` on top, map container
  (`flex: 1, position: relative`) below.
- Move `#map-root` CSS to fill the map container, not the full viewport.
- Render `<InfoPanel />` inside the map container (so it positions relative
  to the map, not the whole page).

## Files Modified

- `src/Header.jsx` (new)
- `src/InfoPanel.jsx` (new)
- `src/App.jsx`
- `src/index.css`
- `index.html` (add Public Sans font)

## Status: Complete
