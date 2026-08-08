import streamlit as st
import altair as alt
import pandas as pd
from datetime import datetime, timezone
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import wcc_gis

st.set_page_config(page_title="Live Telemetry", layout="wide")
st.title("📡 Live Telemetry")

st.warning(
    "Live telemetry — not an operational emergency source. In an emergency call **111**.",
    icon="⚠️",
)

SITES = {
    "Hutt River at Taita Gorge": ["Flow", "Stage"],
    "Porirua Stream at Kenepuru": ["Flow", "Stage"],
    "Karori Stream at Karori Park": ["Flow", "Stage"],
}

site = st.sidebar.selectbox("River site", list(SITES.keys()))
measurement = st.sidebar.selectbox("Measurement", SITES[site])

with st.spinner(f"Fetching {measurement} for {site}…"):
    try:
        readings = wcc_gis.hilltop_data(site, measurement)
        if not readings:
            st.error("No data returned for this site and measurement.")
        else:
            df = pd.DataFrame(readings)
            df.columns = ["time", "value"]
            df["time"] = pd.to_datetime(df["time"])
            df["value"] = pd.to_numeric(df["value"], errors="coerce")

            last = df.dropna().iloc[-1]
            last_time = last["time"]
            age_minutes = (datetime.now(timezone.utc) - last_time.tz_localize("UTC")).seconds // 60 if last_time.tzinfo is None else (datetime.now(timezone.utc) - last_time).seconds // 60

            col1, col2 = st.columns(2)
            col1.metric(f"Latest {measurement}", f"{last['value']:.2f}")
            col2.metric("Last reading", last_time.strftime("%H:%M %d %b"))

            if age_minutes > 60:
                st.warning(f"Data is {age_minutes} minutes old — may be stale.")

            chart = (
                alt.Chart(df.dropna())
                .mark_line(point=True)
                .encode(
                    x=alt.X("time:T", title="Time"),
                    y=alt.Y("value:Q", title=measurement),
                    tooltip=["time:T", "value:Q"],
                )
                .properties(height=400)
                .interactive()
            )
            st.altair_chart(chart, use_container_width=True)
    except Exception as e:
        st.error(f"Could not load telemetry: {e}")
