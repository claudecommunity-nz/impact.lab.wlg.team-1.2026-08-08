# Unit 03: Location — Test Instructions

## Manual Tests

1. Open `http://localhost:5173` — browser prompts for location permission
2. Allow — a blue circle pin appears at your current position
3. Legend panel visible bottom-left: "Your location" checkbox checked
4. Uncheck — pin disappears from map
5. Re-check — pin reappears
6. Deny permission (or test in private window) — no pin, no error, legend still visible

## Success Criteria

- Pin renders at current position when permission granted
- Toggle hides and shows pin without reloading the map
- No console errors in any scenario
