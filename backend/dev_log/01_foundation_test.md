# Unit 01: Foundation — Test Instructions

## Test Objectives

Confirm the project installs cleanly, the SDK loads all 74 datasets, and the Streamlit app starts without errors.

## Manual Tests

1. `uv sync` — completes without error
2. `uv run python -c "import wcc_gis; print(len(wcc_gis.ids('')))"` — prints `74`
3. `uv run streamlit run app.py` — browser opens to home page showing title and six category links

## Success Criteria

- `uv sync` exits 0
- `wcc_gis.ids('')` returns 74 dataset IDs
- Home page loads in browser with no Python exceptions in terminal
- Sidebar shows pages 02–07 in Streamlit navigation
