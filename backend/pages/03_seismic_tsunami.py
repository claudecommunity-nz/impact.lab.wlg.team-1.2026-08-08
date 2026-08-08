import streamlit as st
import pydeck as pdk
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import wcc_gis

st.set_page_config(page_title="Seismic & Tsunami", layout="wide")
st.title("🌍 Seismic & Tsunami Hazards")

LAYERS = {
    "active-faults": {"color": [200, 0, 0, 180], "label": "Active Faults"},
    "fault-hazard-overlay": {"color": [255, 60, 0, 140], "label": "Fault Hazard Overlay"},
    "liquefaction-overlay": {"color": [255, 165, 0, 140], "label": "Liquefaction Overlay"},
    "liquefaction-regional": {"color": [255, 200, 0, 120], "label": "Liquefaction (Regional)"},
    "slope-failure": {"color": [180, 80, 0, 130], "label": "Slope Failure"},
    "tsunami-evacuation-zones": {"color": [100, 0, 200, 150], "label": "Tsunami Evacuation Zones"},
    "tsunami-hazard-overlay": {"color": [150, 0, 255, 130], "label": "Tsunami Hazard Overlay"},
    "tsunami-zones-regional": {"color": [180, 60, 255, 120], "label": "Tsunami Zones (Regional)"},
    "earthquake-prone-buildings": {"color": [255, 0, 100, 160], "label": "Earthquake-Prone Buildings"},
}

selected = st.sidebar.multiselect(
    "Layers",
    options=list(LAYERS.keys()),
    default=["tsunami-evacuation-zones", "active-faults", "liquefaction-overlay"],
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
                    get_line_color=[0, 0, 0, 80],
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
