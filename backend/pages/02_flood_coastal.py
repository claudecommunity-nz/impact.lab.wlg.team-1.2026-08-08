import streamlit as st
import pydeck as pdk
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import wcc_gis

st.set_page_config(page_title="Flood & Coastal", layout="wide")
st.title("🌊 Flood & Coastal Hazards")

LAYERS = {
    "flood-hazard-areas": {"color": [0, 100, 255, 120], "label": "Flood Hazard Areas"},
    "overland-flowpath": {"color": [0, 180, 255, 160], "label": "Overland Flowpaths"},
    "ponding-areas": {"color": [0, 60, 200, 140], "label": "Ponding Areas"},
    "storm-surge": {"color": [255, 140, 0, 140], "label": "Storm Surge"},
    "coastal-inundation-medium": {"color": [255, 200, 0, 130], "label": "Coastal Inundation (Medium)"},
    "coastal-inundation-high": {"color": [255, 80, 0, 140], "label": "Coastal Inundation (High)"},
    "coastal-inundation-index": {"color": [200, 0, 0, 130], "label": "Coastal Inundation Index"},
    "beach-exposure": {"color": [100, 200, 150, 120], "label": "Beach Exposure"},
    "coastal-erosion-index": {"color": [180, 100, 0, 130], "label": "Coastal Erosion Index"},
}

selected = st.sidebar.multiselect(
    "Layers",
    options=list(LAYERS.keys()),
    default=["flood-hazard-areas", "coastal-inundation-high"],
    format_func=lambda k: LAYERS[k]["label"],
)

pdk_layers = []
for dataset_id in selected:
    cfg = LAYERS[dataset_id]
    with st.spinner(f"Loading {cfg['label']}…"):
        try:
            geojson = wcc_gis.geojson(dataset_id, bbox=wcc_gis.WELLINGTON)
            pdk_layers.append(
                pdk.Layer(
                    "GeoJsonLayer",
                    data=geojson,
                    get_fill_color=cfg["color"],
                    get_line_color=[0, 0, 0, 60],
                    line_width_min_pixels=1,
                    pickable=True,
                )
            )
        except Exception as e:
            st.warning(f"{cfg['label']}: {e}")

st.pydeck_chart(
    pdk.Deck(
        map_style="mapbox://styles/mapbox/light-v9",
        initial_view_state=pdk.ViewState(
            latitude=-41.2865, longitude=174.7762, zoom=11, pitch=0
        ),
        layers=pdk_layers,
        tooltip={"text": "{name}"},
    )
)

st.caption("Hazard-planning data only — not an operational emergency source. In an emergency call 111.")
