import streamlit as st
import pydeck as pdk
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import wcc_gis

st.set_page_config(page_title="Landslide", layout="wide")
st.title("⛰️ Landslide Hazards")

LAYERS = {
    "landslide-features": {"color": [139, 90, 43, 160], "label": "Landslide Features"},
    "landslide-process": {"color": [180, 120, 60, 140], "label": "Landslide Process"},
    "landslide-materials": {"color": [200, 150, 80, 130], "label": "Landslide Materials"},
    "landslide-lines": {"color": [100, 50, 0, 200], "label": "Landslide Lines"},
    "slope-failure": {"color": [220, 80, 0, 140], "label": "Slope Failure"},
}

selected = st.sidebar.multiselect(
    "Layers",
    options=list(LAYERS.keys()),
    default=["landslide-features", "slope-failure"],
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
                    get_line_color=[80, 40, 0, 120],
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
