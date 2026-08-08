# Unit 14: Filter Modal

## Objective

Replace the legend bar and the search bar with a single filter surface:
a "Filters" button in the top-left panel that opens a modal dialog, and
chips in the panel header that show any category currently switched off.

## Design

**FilterBar** (replaces SearchBar in InfoPanel):
- A row with a filter icon button labelled "Filters"
- When any layer is hidden, a chip appears for each hidden category:
  `● Flooding  ×` — click × to re-enable it
- When all layers are on, the row shows only the "Filters" button

**FilterModal**:
- Semi-transparent dark backdrop, click outside to close
- Floating card (same overlay style as other cards)
- Title: "Map layers"
- One row per toggleable item: colour dot + label + checkbox
- Order: Your location, then all 6 incident categories
- "Done" button at the bottom closes the modal

## Implementation

1. Create `src/FilterModal.jsx` — modal with backdrop + card + layer rows + Done button.
2. Update `src/InfoPanel.jsx`:
   - Accept `layers`, `onToggle`, `onOpenFilter` props
   - Replace SearchBar with FilterBar: Filters button + hidden-layer chips
3. Update `src/App.jsx`:
   - Add `filterOpen` state (boolean)
   - Pass `layers`, `onToggle`, `onOpenFilter` to `<InfoPanel />`
   - Render `<FilterModal />` when `filterOpen` is true
   - Remove `<LegendBar />`
4. Delete `src/LegendBar.jsx`

## Files Modified

- `src/FilterModal.jsx` (new)
- `src/InfoPanel.jsx`
- `src/App.jsx`
- `src/LegendBar.jsx` (deleted)

## Status: Complete
