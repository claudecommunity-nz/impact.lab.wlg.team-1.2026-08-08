# Unit 23: Dynamic Notice Bar

## Objective

Replace the hardcoded "Heavy rain warning in effect" notice bar with a
dynamic alert derived from current data. Text updates as the timeline
scrubs. Clicking the bar opens a modal summarising current conditions.

## Notice bar text logic

Pick the most urgent signal at `currentTime`:
- If wind gusts > 70 km/h → "Gale warning in effect — {windDir} gusting {gust} km/h"
- Else if rain chance > 85% → "Heavy rain warning in effect — {condition}"
- Else if any high-severity incident is active → "Active incident alert — {N} high-severity reports on the map"
- Else → "No active warnings — conditions normal"

Bar background stays WCC yellow for warnings, light green for no warnings.

## Modal content (on click)

- Current weather snapshot: temp, condition, wind, rain chance
- Active incident count by category (flooding: 3, slips: 2, …)
- Link to MetService warnings
- Link to WREMO

## Implementation

1. `src/AlertModal.jsx` — modal overlay with weather + incident summary + links.
2. `src/Header.jsx` — accept `notice` (text + level) and `onNoticeClick` props;
   render dynamic bar, pointer cursor.
3. `src/App.jsx` — compute notice from `weather` + active `pins`; manage
   `alertOpen` state; pass to `<Header />` and render `<AlertModal />`.

## Files Modified

- `src/AlertModal.jsx` (new)
- `src/Header.jsx`
- `src/App.jsx`

## Status: Complete
