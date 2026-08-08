import streamlit as st

st.set_page_config(
    page_title="WCC Emergency Data",
    page_icon="🗺️",
    layout="wide",
)

st.title("Wellington Emergency Data Dashboard")
st.markdown(
    """
    Explore Wellington City Council hazard and emergency datasets sourced from the
    [WCC GIS open data catalogue](https://claudecommunity-nz.github.io/wcc-emergency-gis-data/).

    > **Note:** This dashboard shows hazard-planning data, not live emergency information.
    > In an emergency, call **111**.
    """
)

st.subheader("Data categories")

pages = [
    ("🌊 Flood & Coastal", "pages/02_flood_coastal.py", "Flood zones, coastal inundation, sea level rise"),
    ("🌍 Seismic & Tsunami", "pages/03_seismic_tsunami.py", "Earthquake faults, liquefaction, tsunami evacuation zones"),
    ("⛰️ Landslide", "pages/04_landslide.py", "Landslide hazard zones"),
    ("🏥 Emergency Infrastructure", "pages/05_infrastructure.py", "Emergency hubs, water tanks, road reopening order"),
    ("📡 Live Telemetry", "pages/06_telemetry.py", "River levels and rainfall from Hilltop API"),
    ("👥 Social Vulnerability", "pages/07_vulnerability.py", "Deprivation by area and climate layers"),
]

for icon_name, _, description in pages:
    st.markdown(f"**{icon_name}** — {description}")
