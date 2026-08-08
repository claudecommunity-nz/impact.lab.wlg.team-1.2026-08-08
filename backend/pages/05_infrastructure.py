import streamlit as st
import pydeck as pdk
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import wcc_gis

st.set_page_config(page_title="Emergency Infrastructure", layout="wide")
st.title("🏥 Emergency Infrastructure")

LAYERS = {
    "community-emergency-hubs": {"color": [0, 200, 100, 220], "label": "Community Emergency Hubs", "radius": 80},
    "emergency-water-tanks": {"color": [0, 100, 255, 200], "label": "Emergency Water Tanks", "radius": 50},
    "emergency-routes": {"color": [255, 200, 0, 180], "label": "Emergency Routes"},
}

selected = st.sidebar.multiselect(
    "Layers",
    options=list(LAYERS.keys()),
    default=list(LAYERS.keys()),
    format_func=lambda k: LAYERS[k]["label"],
)

pdk_layers = []
for dataset_id in selected:
    cfg = LAYERS[dataset_id]
    with st.spinner(f"Loading {cfg['label']}…"):
        try:
            geojson = wcc_gis.geojson(dataset_id, bbox=wcc_gis.WELLINGTON)
            if dataset_id in ("community-emergency-hubs", "emergency-water-tanks"):
                pdk_layers.append(
                    pdk.Layer(
                        "ScatterplotLayer",
                        data=geojson["features"],
                        get_position="geometry.coordinates",
                        get_fill_color=cfg["color"],
                        get_radius=cfg.get("radius", 60),
                        pickable=True,
                    )
                )
            else:
                pdk_layers.append(
                    pdk.Layer(
                        "GeoJsonLayer",
                        data=geojson,
                        get_line_color=cfg["color"],
                        get_fill_color=[0, 0, 0, 0],
                        line_width_min_pixels=2,
                        pickable=True,
                    )
                )
        except Exception as e:
            st.warning(f"{cfg['label']}: {e}")

st.pydeck_chart(
    pdk.Deck(
        map_style="mapbox://styles/mapbox/light-v9",
        initial_view_state=pdk.ViewState(
            latitude=-41.2865, longitude=174.7762, zoom=12, pitch=0
        ),
        layers=pdk_layers,
        tooltip={"text": "{properties.name}"},
    )
)

st.caption("Hazard-planning data only — not an operational emergency source. In an emergency call 111.")
