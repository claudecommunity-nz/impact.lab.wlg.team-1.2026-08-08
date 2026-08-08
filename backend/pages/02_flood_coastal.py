import streamlit as st
import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import wcc_gis

st.set_page_config(page_title="Flood & Coastal", layout="wide")
st.title("🌊 Flood & Coastal Hazards")

DATASETS = {
    "overland-flowpath": "Overland Flowpaths",
    "ponding-areas": "Ponding Areas",
    "flood-hazard-areas": "Flood Hazard Areas",
    "storm-surge": "Storm Surge",
    "coastal-inundation-medium": "Coastal Inundation (Medium)",
    "coastal-inundation-high": "Coastal Inundation (High)",
    "coastal-inundation-index": "Coastal Inundation Index",
    "beach-exposure": "Beach Exposure",
    "coastal-erosion-index": "Coastal Erosion Index",
}

SKIP_COLS = {"OBJECTID", "Shape", "Shape_Length", "Shape_Area"}

dataset_id = st.sidebar.selectbox(
    "Dataset",
    options=list(DATASETS.keys()),
    format_func=lambda k: DATASETS[k],
)

@st.cache_data(ttl=300)
def load_info(dataset_id):
    try:
        return wcc_gis.info(dataset_id), None
    except wcc_gis.GisError as e:
        return None, str(e)

@st.cache_data(ttl=300)
def load_features(dataset_id, layer=None):
    try:
        kwargs = {"bbox": wcc_gis.WELLINGTON}
        if layer is not None:
            kwargs["layer"] = layer
        data = wcc_gis.geojson(dataset_id, **kwargs)
        features = data.get("features", [])
        exceeded = data.get("exceededTransferLimit", False)
        rows = [f["properties"] for f in features if f.get("properties")]
        return rows, exceeded, None
    except Exception as e:
        return [], False, str(e)

info, info_err = load_info(dataset_id)

layer = None
if info_err and "Pick one with layer=" in info_err:
    sublayers = {}
    for line in info_err.splitlines():
        line = line.strip()
        if line.startswith("layer="):
            parts = line.split(None, 1)
            idx = int(parts[0].split("=")[1])
            name = parts[1] if len(parts) > 1 else str(idx)
            if "is a group" not in name:
                sublayers[idx] = name
    if sublayers:
        layer = st.sidebar.selectbox(
            "Sub-layer",
            options=list(sublayers.keys()),
            format_func=lambda k: sublayers[k],
        )
        info, info_err = None, None
elif info_err:
    st.error(f"Could not load dataset info: {info_err}")

if info:
    with st.expander("Dataset info", expanded=False):
        st.markdown(f"**Name:** {info.get('name', dataset_id)}")
        if info.get("description"):
            st.markdown(f"**Description:** {info['description']}")
        st.markdown(f"**Geometry type:** {info.get('geometry_type', '—')}")
        if info.get("url"):
            st.markdown(f"**Source:** [{info['url']}]({info['url']})")

with st.spinner("Loading features…"):
    rows, exceeded, err = load_features(dataset_id, layer)

if err:
    st.error(f"Could not load features: {err}")
elif not rows:
    st.info("No features returned for this dataset and bounding box.")
else:
    df = pd.DataFrame(rows)
    drop = [c for c in df.columns if c in SKIP_COLS]
    df = df.drop(columns=drop)

    col1, col2 = st.columns(2)
    col1.metric("Features", len(df))
    if exceeded:
        col2.warning("Transfer limit reached — results are partial.")

    search = st.text_input("Filter rows (any column)", placeholder="e.g. Churton Park")
    if search:
        mask = df.apply(lambda col: col.astype(str).str.contains(search, case=False, na=False)).any(axis=1)
        df = df[mask]

    st.dataframe(df, use_container_width=True, hide_index=True)

st.caption("Hazard-planning data only — not an operational emergency source. In an emergency call 111.")
