#!/usr/bin/env python3
"""Generate the source registry from the WCC Emergency GIS catalogue.

This is the ONLY place in the repo where an upstream URL is constructed. Every
ArcGIS endpoint the app touches is resolved by `wcc_gis` from `catalogue.json`,
so a wrong layer id is impossible by construction rather than by care.

Emits two files, both marked generated and both checked in:

    src/lib/catalogue.generated.ts   typed registry for the front end + MapLibre
    supabase/seed_sources.sql        `sources` rows for the database

Run:  python3 scripts/build_sources.py     (or: bun run sources:build)

Re-running with no upstream change must produce no diff. That is the test.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "vendor" / "wcc-gis"))

import wcc_gis  # noqa: E402  (needs the path above)

SUPPLEMENTARY = json.loads(
    (ROOT / "vendor" / "wcc-gis" / "sources-supplementary.json").read_text()
)

# --------------------------------------------------------------------------
# Hazard context overlays.
#
# WCC published a purpose-built bundle for this hackathon: 24 layers on one
# FeatureServer, CORS-open, described in sources-supplementary.json as "the
# officially-blessed stack in one call". Using it instead of eight separate
# council services means one host to be polite to and one CORS surface.
# --------------------------------------------------------------------------
HACKATHON_BUNDLE = (
    "https://services1.arcgis.com/CPYspmTk3abe6d7i/arcgis/rest/services"
    "/EM_Hackathon_WCC_Layers/FeatureServer"
)

# (layer id, our id, label, why a resident should care)
BUNDLE_LAYERS = [
    (18, "coastal-inundation-high", "Coastal inundation — high hazard",
     "Modelled worst-case coastal flooding extent."),
    (17, "coastal-inundation-medium", "Coastal inundation — medium hazard",
     "Modelled moderate coastal flooding extent."),
    (14, "inundation-area", "Inundation area",
     "Land the District Plan models as flooding."),
    (15, "overland-flowpath", "Overland flowpath",
     "Where water runs across the surface in heavy rain."),
    (16, "stream-corridor", "Stream corridor",
     "Land beside a stream that floods first."),
    (2, "tsunami-evacuation-zones", "Tsunami evacuation zones",
     "Official evacuation zones. Not weather — shown for orientation."),
    (1, "wind-zone", "Wind zone",
     "Building-standard wind exposure. Explains why some streets gust harder."),
]

# --------------------------------------------------------------------------
# Raster overlays, resolved through the SDK.
#
# `flood-depths` is a whole service; wcc_gis refuses it and lists the sublayers,
# which is how we learned the model is published PER SUBURB. These six are the
# south coast and the suburbs the problem statement names.
# `storm-surge` layer 4 is the present-day case, not a sea-level-rise scenario.
# --------------------------------------------------------------------------
RASTER_LAYERS = [
    ("flood-depths", 5, "flood-depth-island-bay", "Modelled flood depth — Island Bay"),
    ("flood-depths", 12, "flood-depth-owhiro-bay", "Modelled flood depth — Ōwhiro Bay"),
    ("flood-depths", 8, "flood-depth-lyall-houghton", "Modelled flood depth — Lyall & Houghton Bay"),
    ("flood-depths", 3, "flood-depth-hataitai-kilbirnie", "Modelled flood depth — Hataitai & Kilbirnie"),
    ("flood-depths", 9, "flood-depth-miramar", "Modelled flood depth — Miramar"),
    ("flood-depths", 14, "flood-depth-southern-cbd", "Modelled flood depth — Southern CBD"),
    ("storm-surge", 4, "storm-surge-present-day", "Storm surge — 1% AEP, present day"),
]

# --------------------------------------------------------------------------
# Live signal feeds. Endpoints come from sources-supplementary.json's `extra`
# block (each entry carries verified:true and a verification date) or, for
# MetService, from its own docs page. `cors` was measured, not assumed.
# --------------------------------------------------------------------------
SIGNAL_SOURCES = [
    dict(
        id="metservice-alerts", name="MetService severe weather warnings",
        publisher="MetService", tier="official", evidence_default="forecast",
        endpoint="https://services.arcgis.com/XTtANUDT8Va4DLwI/arcgis/rest/services"
                 "/Metservice_Weather_Alerts/FeatureServer/0",
        cors="open", refresh_seconds=300, display_order=10,
        licence="Restricted use — see MetService terms",
        homepage="https://www.metservice.com/warnings/home",
        attribution="Severe weather warnings © MetService, via ArcGIS Online.",
    ),
    dict(
        id="nema-cap-alerts", name="Emergency Mobile Alerts (CAP polygons)",
        publisher="NEMA", tier="official", evidence_default="observed",
        endpoint=SUPPLEMENTARY["extra"]["nema_cap_alerts"]["endpoint"],
        cors="open", refresh_seconds=300, display_order=11,
        licence="CC BY 4.0", homepage="https://getready.govt.nz",
        attribution="Emergency Mobile Alert history © National Emergency Management Agency.",
    ),
    dict(
        id="ema-rss", name="Emergency Mobile Alert feed",
        publisher="National Emergency Management Agency", tier="official",
        evidence_default="observed",
        endpoint=SUPPLEMENTARY["extra"]["civil_defence_ema_feed"].get(
            "endpoint", "https://alerthub.civildefence.govt.nz/rss/pwp"),
        cors="proxy_required", refresh_seconds=300, display_order=12,
        licence="CC BY 4.0", homepage="https://alerthub.civildefence.govt.nz",
        attribution="Emergency Mobile Alert feed © National Emergency Management Agency.",
    ),
    dict(
        id="wcc-road-closures", name="Council road closures and street events",
        publisher="Wellington City Council", tier="council",
        evidence_default="observed",
        endpoint="https://gis.wcc.govt.nz/arcgis/rest/services/Transportation"
                 "/StreetEventsAndRoadClosures/MapServer/1",
        cors="open", refresh_seconds=300, display_order=20,
        licence="Check WCC terms", homepage="https://wellington.govt.nz",
        attribution="Road closures © Wellington City Council.",
    ),
    dict(
        id="nzta-delays", name="State highway delays and hazards",
        publisher="NZ Transport Agency Waka Kotahi", tier="council",
        evidence_default="observed",
        endpoint="https://www.journeys.nzta.govt.nz/assets/map-data-cache/delays.json",
        cors="proxy_required", refresh_seconds=300, display_order=21,
        licence="CC BY 4.0", homepage="https://www.journeys.nzta.govt.nz",
        attribution="Highway conditions © NZ Transport Agency Waka Kotahi. CC BY 4.0.",
    ),
    dict(
        id="ww-faults", name="Water network faults",
        publisher="Wellington Water", tier="council", evidence_default="observed",
        endpoint=SUPPLEMENTARY["extra"]["wellington_water_faults"]["endpoint"],
        cors="open", refresh_seconds=600, display_order=22,
        licence="Check Wellington Water terms",
        homepage="https://www.wellingtonwater.co.nz",
        attribution="Network faults © Wellington Water.",
    ),
    dict(
        id="electricity-outages", name="Electricity outages",
        publisher="NEMA / lines companies", tier="council",
        evidence_default="observed",
        endpoint=SUPPLEMENTARY["extra"]["nema_electricity_outages"]["endpoint"],
        cors="open", refresh_seconds=300, display_order=23,
        licence="CC BY 4.0", homepage="https://getready.govt.nz",
        attribution="Electricity outages © NEMA, aggregated from 18 lines companies.",
    ),
    dict(
        id="geonet-tilde-sea-level", name="Sea level at Wellington Harbour (detided)",
        publisher="GeoNet / GNS Science", tier="measured", evidence_default="measured",
        endpoint="https://tilde.geonet.org.nz/v4/data/coastal/WLGT"
                 "/water-height-detided/40/15s/nil/latest/6h",
        cors="open", refresh_seconds=300, display_order=30,
        licence="CC BY 3.0 NZ", homepage="https://tilde.geonet.org.nz",
        attribution="Sea level © GeoNet / GNS Science. CC BY 3.0 NZ.",
    ),
    dict(
        id="baring-head-waves", name="Significant wave height, Baring Head",
        publisher="Greater Wellington Regional Council", tier="measured",
        evidence_default="measured",
        endpoint="https://hilltop.gw.govt.nz/Data.hts",
        cors="open", refresh_seconds=600, display_order=31,
        licence="Check GWRC terms", homepage="https://graphs.gw.govt.nz",
        attribution="Wave buoy data © Greater Wellington Regional Council.",
    ),
    dict(
        id="hilltop-gauges", name="River level and rainfall gauges",
        publisher="Greater Wellington Regional Council", tier="measured",
        evidence_default="measured",
        endpoint=SUPPLEMENTARY["extra"]["gw_hilltop"]["base_url"],
        cors="open", refresh_seconds=300, display_order=32,
        licence="Check GWRC terms", homepage="https://graphs.gw.govt.nz",
        attribution="River and rainfall telemetry © Greater Wellington Regional Council.",
    ),
    dict(
        id="open-meteo-marine", name="Marine forecast — waves and swell",
        publisher="Open-Meteo", tier="measured", evidence_default="forecast",
        endpoint="https://marine-api.open-meteo.com/v1/marine",
        cors="open", refresh_seconds=900, display_order=33,
        licence="CC BY 4.0", homepage="https://open-meteo.com",
        attribution="Marine forecast © Open-Meteo. CC BY 4.0.",
    ),
    dict(
        id="open-meteo-forecast", name="Wind and rain forecast",
        publisher="Open-Meteo", tier="measured", evidence_default="forecast",
        endpoint="https://api.open-meteo.com/v1/forecast",
        cors="open", refresh_seconds=900, display_order=34,
        licence="CC BY 4.0", homepage="https://open-meteo.com",
        attribution="Weather forecast © Open-Meteo. CC BY 4.0.",
    ),
]

COMMUNITY_SOURCE = dict(
    id="community-reports", name="Community reports",
    publisher="Members of the public", tier="community", evidence_default="reported",
    endpoint=None, cors="open", refresh_seconds=0, display_order=90,
    licence=None, homepage=None,
    attribution="Submitted by members of the public. Not verified by Council.",
)


def host_of(url: str | None) -> str | None:
    if not url:
        return None
    return url.split("/")[2] if "//" in url else None


def build_overlays() -> list[dict]:
    """Resolve every hazard overlay through the catalogue."""
    out: list[dict] = []

    for layer_id, oid, label, why in BUNDLE_LAYERS:
        out.append(dict(
            id=oid, name=label, publisher="Wellington City Council",
            tier="context", evidence_default="modelled", layer_kind="feature_overlay",
            endpoint=f"{HACKATHON_BUNDLE}/{layer_id}",
            tile_url=None, layer_index=layer_id,
            host=host_of(HACKATHON_BUNDLE), cors="open", why=why,
            catalogue_id="em-hackathon-wcc-layers", prepared_by=None, year=None,
            licence="Check WCC terms",
            homepage="https://wellington.govt.nz/climate-change-sustainability-environment",
            attribution="Hazard layers © Wellington City Council, "
                        "published for the Impact Lab hackathon.",
            refresh_seconds=0, display_order=60 + layer_id,
        ))

    for cat_id, layer_id, oid, label in RASTER_LAYERS:
        d = wcc_gis.get(cat_id)
        # image_url() builds the /export request; the SDK knows this is a raster
        # because catalogue.json says raster_only, so we never ask it to /query.
        url = wcc_gis.image_url(cat_id, layer=layer_id, bbox=wcc_gis.WELLINGTON,
                                size=(1024, 1024))
        # The sublayer lives in `layers=show:N` — a QUERY param, not the path.
        # Keep the SDK-derived /export base and swap only the varying params for
        # a MapLibre raster template. Dropping the query would silently collapse
        # all six suburb models into one all-layers image.
        export_base = url.split("?")[0]
        tile_url = (
            f"{export_base}?bbox={{bbox-epsg-3857}}&bboxSR=3857&imageSR=3857"
            f"&size=256,256&layers=show:{layer_id}"
            f"&format=png32&transparent=true&f=image"
        )
        out.append(dict(
            id=oid, name=label, publisher=d["authority"], tier="context",
            evidence_default="modelled", layer_kind="raster_overlay",
            endpoint=export_base, tile_url=tile_url, layer_index=layer_id,
            host=d["host"], cors="open",
            why="Modelled planning layer. Not a live observation.",
            catalogue_id=cat_id, prepared_by=d["prepared_by"], year=d["year"],
            licence=d.get("licence_note") or "Check publisher terms",
            homepage=d["service_root"],
            attribution=f"{d['display_name']} © {d['authority']}"
                        + (f", modelled by {d['prepared_by']}" if d["prepared_by"] else "")
                        + (f" ({d['year']})" if d["year"] else "") + ".",
            refresh_seconds=0, display_order=80,
        ))
    return out


def sql_str(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def main() -> None:
    signals = [dict(s, layer_kind="signal", host=host_of(s["endpoint"]),
                    catalogue_id=None, prepared_by=None, year=None, why=None,
                    tile_url=None, layer_index=None)
               for s in SIGNAL_SOURCES]
    community = dict(COMMUNITY_SOURCE, layer_kind="signal", host=None,
                     catalogue_id=None, prepared_by=None, year=None, why=None,
                     tile_url=None, layer_index=None)
    rows = signals + [community] + build_overlays()

    cols = ["id", "name", "publisher", "tier", "evidence_default", "layer_kind",
            "endpoint", "tile_url", "layer_index", "host", "cors", "licence",
            "attribution", "homepage", "catalogue_id", "refresh_seconds",
            "display_order"]

    # ---- SQL -------------------------------------------------------------
    lines = [
        "-- GENERATED by scripts/build_sources.py — do not edit by hand.",
        "-- Every endpoint below was resolved from vendor/wcc-gis/catalogue.json",
        "-- via the wcc_gis SDK. Re-run the script to regenerate.",
        "",
        "INSERT INTO public.sources (" + ", ".join(cols) + ") VALUES",
    ]
    values = []
    for r in rows:
        values.append("  (" + ", ".join(sql_str(r.get(c)) for c in cols) + ")")
    lines.append(",\n".join(values))
    lines.append("ON CONFLICT (id) DO UPDATE SET")
    lines.append(",\n".join(
        f"  {c} = EXCLUDED.{c}" for c in cols if c != "id"))
    lines.append(";")
    (ROOT / "supabase" / "seed_sources.sql").write_text("\n".join(lines) + "\n")

    # ---- TypeScript ------------------------------------------------------
    ts_rows = [{k: r.get(k) for k in cols + ["why"]} for r in rows]
    ts = f"""// GENERATED by scripts/build_sources.py — do not edit by hand.
//
// Every ArcGIS endpoint here was resolved from vendor/wcc-gis/catalogue.json
// through the wcc_gis SDK, so a wrong layer id is impossible by construction.
// Regenerate with:  bun run sources:build

export type Tier = 'official' | 'council' | 'measured' | 'community' | 'context';
export type LayerKind = 'signal' | 'feature_overlay' | 'raster_overlay';
export type EvidenceBasis = 'observed' | 'measured' | 'modelled' | 'forecast' | 'reported';

export interface SourceDef {{
  id: string;
  name: string;
  publisher: string;
  tier: Tier;
  evidence_default: EvidenceBasis;
  layer_kind: LayerKind;
  endpoint: string | null;
  /** MapLibre raster template with a {{bbox-epsg-3857}} placeholder. Rasters only. */
  tile_url: string | null;
  /** ArcGIS sublayer index. Lives in `layers=show:N`, a query param, not the path. */
  layer_index: number | null;
  host: string | null;
  cors: 'open' | 'proxy_required';
  licence: string | null;
  attribution: string;
  homepage: string | null;
  catalogue_id: string | null;
  refresh_seconds: number;
  display_order: number;
  why: string | null;
}}

export const SOURCES: SourceDef[] = {json.dumps(ts_rows, indent=2, ensure_ascii=False)};

export const SOURCES_BY_ID: Record<string, SourceDef> =
  Object.fromEntries(SOURCES.map((s) => [s.id, s]));

export const OVERLAYS = SOURCES.filter((s) => s.layer_kind !== 'signal');
export const FEEDS = SOURCES.filter((s) => s.layer_kind === 'signal');

/** Wellington City bounding box (W, S, E, N) — from wcc_gis.WELLINGTON. */
export const WELLINGTON: [number, number, number, number] = {json.dumps(list(wcc_gis.WELLINGTON))};
"""
    (ROOT / "src" / "lib" / "catalogue.generated.ts").write_text(ts)

    # ---- endpoints for the Deno adapters ---------------------------------
    # Edge functions cannot import from src/, so the same resolved endpoints
    # are emitted here too. Without this the adapters would hand-type URLs and
    # could drift from the catalogue, which is the whole thing this generator
    # exists to prevent.
    endpoints = {
        r["id"]: r["endpoint"] for r in rows
        if r["layer_kind"] == "signal" and r.get("endpoint")
    }
    deno = f"""// GENERATED by scripts/build_sources.py — do not edit by hand.
//
// Resolved from vendor/wcc-gis/catalogue.json through the wcc_gis SDK. The
// adapters import from here so no upstream URL is ever written by hand.
// Regenerate with:  bun run sources:build

export const ENDPOINTS: Record<string, string> = {json.dumps(endpoints, indent=2, ensure_ascii=False)};

/** Wellington City bounding box (W, S, E, N) — from wcc_gis.WELLINGTON. */
export const WELLINGTON_BBOX: [number, number, number, number] = {json.dumps(list(wcc_gis.WELLINGTON))};
"""
    (ROOT / "supabase" / "functions" / "ingest" / "endpoints.generated.ts").write_text(deno)

    print(f"wrote {len(rows)} sources "
          f"({len(signals)} feeds, 1 community, {len(rows)-len(signals)-1} overlays)")
    print("  -> supabase/seed_sources.sql")
    print("  -> src/lib/catalogue.generated.ts")
    print("  -> supabase/functions/ingest/endpoints.generated.ts")


if __name__ == "__main__":
    main()
