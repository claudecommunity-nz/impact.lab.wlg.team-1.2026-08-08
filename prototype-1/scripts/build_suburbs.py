#!/usr/bin/env python3
"""Generate the suburb boundary lookup from Wellington City Council's own layer.

Why this exists
---------------
`src/lib/areas.ts` models the five south coast bays as centre-plus-radius. That
is deliberate and stays: it is what personalisation needs, because "within about
a kilometre of Island Bay" is the precision a resident reasons with.

It cannot, however, tell you what Council would *call* a place. Suburb names in
the interface were coming from our own five hand-drawn circles, which meant a
warning at Red Rocks had no name at all, and anything north of the bays became
"Elsewhere in Wellington". This layer fixes that and only that: it attaches the
official suburb name to a point. Distance stays with `areas.ts`, naming comes
from here, and the two are kept apart on purpose.

The endpoint is not in `catalogue.json` — Council publishes no place-name
boundary in the hackathon set — so it lives in `sources-supplementary.json`
under `extra.wcc_suburbs`, alongside the other researched additions. The rule in
AGENTS.md still holds: no upstream URL is hand-typed outside `vendor/`.

Emits four files, all marked generated and all checked in:

    data/wcc-suburbs.geojson                        the boundaries, for the map
    src/lib/suburbs.generated.ts                    rings for the browser
    supabase/functions/ingest/suburbs.generated.ts  the same, for Deno
    supabase/seed_suburbs.sql                       the same, for the database

Four copies of one dataset is three too many to maintain by hand, which is the
point of generating all of them from a single fetch: they cannot disagree about
where a boundary is. The database needs its own copy because a community report
must not be allowed to state its own suburb — see migration 20260808130100.

Run:  python3 scripts/build_suburbs.py     (or: bun run suburbs:build)

Re-running with no upstream change must produce no diff. That is the test.
"""
from __future__ import annotations

import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SUPPLEMENTARY = json.loads(
    (ROOT / "vendor" / "wcc-gis" / "sources-supplementary.json").read_text()
)
ENDPOINT = SUPPLEMENTARY["extra"]["wcc_suburbs"]["endpoint"]

UA = "Impact Lab Wellington team 1 prototype (suburb boundary build)"

# Douglas-Peucker tolerance in degrees. 0.00012 deg is roughly 13 m at this
# latitude — under a road width, so the outline still reads correctly against
# the basemap, and well under the error we would make anyway by placing a
# warning at a feed's single representative point. Full precision is 900 KB;
# this lands near 200 KB, which matters because the rings are compiled into the
# bundle and shipped to a phone on mobile data during a storm.
TOLERANCE = 0.00012

# Rings smaller than this are dropped. Wellington's suburb polygons carry a
# scatter of offshore slivers (rock stacks, jetty ends) that cannot contain an
# address and only cost bytes. 1e-7 sq deg is about 800 m2.
MIN_RING_AREA = 1e-7


def fetch() -> dict:
    params = urllib.parse.urlencode({
        "where": "1=1",
        "outFields": "suburb,postcode",
        "returnGeometry": "true",
        # Everything WCC publishes is NZTM2000. Ask for 4326 or the polygons
        # land off the coast of Africa.
        "outSR": "4326",
        "f": "geojson",
    })
    req = urllib.request.Request(f"{ENDPOINT}/query?{params}",
                                 headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


# --------------------------------------------------------------------------
# Which part of the city each suburb belongs to.
#
# Editorial, so it lives here rather than being derived: Council publishes no
# grouping, and a bounding-box guess would put Horokiwi with the northern
# growth suburbs and Makara with the west coast. The order of the groups is the
# order of the picker, and the south coast leads because that is the problem
# statement.
# --------------------------------------------------------------------------
REGIONS: list[tuple[str, list[str]]] = [
    ("South coast", [
        "Owhiro Bay", "Island Bay", "Southgate", "Houghton Bay", "Melrose",
        "Lyall Bay", "Moa Point", "Breaker Bay", "Karaka Bays", "Seatoun",
        "Strathmore Park",
    ]),
    ("Eastern suburbs", [
        "Miramar", "Maupuia", "Rongotai", "Kilbirnie", "Hataitai", "Roseneath",
    ]),
    ("City and inner suburbs", [
        "Wellington Central", "Te Aro", "Pipitea", "Thorndon", "Mount Cook",
        "Mount Victoria", "Oriental Bay", "Aro Valley", "Kelburn", "Highbury",
    ]),
    ("Southern suburbs", [
        "Newtown", "Berhampore", "Vogeltown", "Mornington", "Kingston",
        "Brooklyn",
    ]),
    ("Western suburbs", [
        "Karori", "Northland", "Wilton", "Wadestown", "Makara", "Makara Beach",
        "Ohariu",
    ]),
    ("Onslow and the northern hills", [
        "Ngaio", "Khandallah", "Crofton Downs", "Kaiwharawhara", "Ngauranga",
        "Broadmeadows", "Horokiwi",
    ]),
    ("Northern suburbs and Tawa", [
        "Johnsonville", "Newlands", "Churton Park", "Glenside",
        "Grenada Village", "Grenada North", "Paparangi", "Woodridge",
        "Takapu Valley", "Tawa",
    ]),
]

# Blurbs for the places the problem statement is actually about. The other 52
# suburbs get none rather than a generated one — an invented description of
# Tawa would be filler, and the picker reads fine without it.
BLURBS = {
    "Owhiro Bay": "Ōwhiro Bay Parade, the quarry end, Te Kopahou.",
    "Island Bay": "The Parade, Shorland Park, the Esplanade.",
    "Houghton Bay": "Houghton Bay Road, Te Raekaihau Point.",
    "Lyall Bay": "Lyall Parade, the surf club, Queens Drive.",
    "Moa Point": "Moa Point Road, the airport south end.",
    "Breaker Bay": "Breaker Bay Road, the Pass of Branda.",
    "Seatoun": "Seatoun Wharf, Marine Parade, the tunnel.",
    "Melrose": "The zoo, Melrose Park, Houghton Valley.",
    "Southgate": "The hill between Island Bay and Houghton Bay.",
}

# Macrons Council's own data leaves off. The suburb NAME stays exactly as
# published, because it is the join key everywhere; only the label shown to a
# resident is corrected.
LABELS = {
    "Owhiro Bay": "Ōwhiro Bay",
}

# Hand-set centre and catchment for the five bays, carried over from the
# original areas.ts.
#
# A polygon centroid is the wrong point for these. Ōwhiro Bay's boundary runs
# from the beach over the tops to Te Kopahou, so its centroid lands about 2 km
# inland on a ridge — measure a resident's distance from there and the road
# they actually live on scores as far away. The five bays were tuned by hand
# against where people are, and that beats a derived point. The other 52
# suburbs are compact enough that the centroid is fine.
CENTRE_OVERRIDES = {
    "Owhiro Bay":   ([174.7622, -41.3456], 1200),
    "Island Bay":   ([174.7756, -41.3399], 1300),
    "Houghton Bay": ([174.7897, -41.3400], 1000),
    "Lyall Bay":    ([174.7997, -41.3283], 1400),
    "Moa Point":    ([174.8118, -41.3417], 1100),
}


def slugify(name: str) -> str:
    return name.lower().replace(" ", "-").replace("'", "")


def ring_centroid(ring: list[list[float]]) -> tuple[float, float, float]:
    """Shoelace centroid and signed area of one ring.

    The bounding-box centre is not good enough here: Ōwhiro Bay's box is
    dominated by the empty hill country behind it, and its box centre sits on a
    ridge about 1.5 km from anywhere a person lives.
    """
    cx = cy = a2 = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        cross = x0 * y1 - x1 * y0
        a2 += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if a2 == 0:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys), 0.0
    return cx / (3 * a2), cy / (3 * a2), abs(a2) / 2


def ring_area(ring: list[list[float]]) -> float:
    """Unsigned shoelace area in square degrees."""
    a = 0.0
    for i in range(len(ring) - 1):
        a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(a) / 2


def simplify(ring: list[list[float]], tol: float) -> list[list[float]]:
    """Douglas-Peucker, iterative so a 3,000-point ring cannot blow the stack."""
    if len(ring) < 4:
        return ring

    keep = [False] * len(ring)
    keep[0] = keep[-1] = True
    stack = [(0, len(ring) - 1)]

    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        x1, y1 = ring[lo]
        x2, y2 = ring[hi]
        dx, dy = x2 - x1, y2 - y1
        denom = dx * dx + dy * dy

        worst, worst_i = 0.0, -1
        for i in range(lo + 1, hi):
            px, py = ring[i]
            if denom == 0:
                d = (px - x1) ** 2 + (py - y1) ** 2
            else:
                # Perpendicular distance, squared, without the sqrt.
                cross = dx * (y1 - py) - dy * (x1 - px)
                d = cross * cross / denom
            if d > worst:
                worst, worst_i = d, i

        if worst > tol * tol:
            keep[worst_i] = True
            stack.append((lo, worst_i))
            stack.append((worst_i, hi))

    out = [p for p, k in zip(ring, keep) if k]
    # A ring must stay closed and stay a ring.
    if out[0] != out[-1]:
        out.append(out[0])
    return out if len(out) >= 4 else ring


def round_ring(ring: list[list[float]]) -> list[list[float]]:
    """Six decimal places is ~0.1 m. Anything beyond it is noise in the file."""
    return [[round(x, 6), round(y, 6)] for x, y in ring]


def rings_of(geom: dict) -> list[list[list[float]]]:
    """Outer rings only.

    Interior rings are discarded. No Wellington suburb is a doughnut around
    another suburb, so a hole here would mean a point falls through to "no
    suburb" rather than to a neighbour — a worse answer than ignoring it.
    """
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    raise ValueError(f"unexpected geometry {geom['type']}")


def main() -> None:
    fc = fetch()
    feats = fc.get("features", [])
    if not feats:
        sys.exit("no features returned — check the endpoint before committing")

    suburbs = []
    kept_pts = dropped_pts = dropped_rings = 0

    for f in sorted(feats, key=lambda f: f["properties"]["suburb"]):
        name = f["properties"]["suburb"]
        rings = []
        for ring in rings_of(f["geometry"]):
            if ring_area(ring) < MIN_RING_AREA:
                dropped_rings += 1
                continue
            s = round_ring(simplify(ring, TOLERANCE))
            dropped_pts += len(ring) - len(s)
            kept_pts += len(s)
            rings.append(s)
        if not rings:
            continue

        xs = [p[0] for r in rings for p in r]
        ys = [p[1] for r in rings for p in r]
        suburbs.append({
            "name": name,
            "postcode": int(f["properties"]["postcode"]),
            # Precomputed so the lookup rejects 56 of 57 suburbs on four float
            # comparisons before it walks a single ring.
            "bbox": [min(xs), min(ys), max(xs), max(ys)],
            "rings": rings,
        })

    # ---- GeoJSON, for the map and for anyone consuming the repo -----------
    out_fc = {
        "type": "FeatureCollection",
        "_generated_by": "scripts/build_suburbs.py — do not edit by hand",
        "_source": ENDPOINT,
        "_attribution": "Suburb boundaries © Wellington City Council.",
        "features": [
            {
                "type": "Feature",
                "properties": {"suburb": s["name"], "postcode": s["postcode"]},
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [[r] for r in s["rings"]],
                },
            }
            for s in suburbs
        ],
    }
    (ROOT / "data").mkdir(exist_ok=True)
    geojson_text = json.dumps(out_fc, ensure_ascii=False) + "\n"
    (ROOT / "data" / "wcc-suburbs.geojson").write_text(geojson_text)

    # The sibling map/ app draws the selected suburb's outline. It gets the
    # boundaries as a static file rather than a module: MapLibre takes a URL
    # for a geojson source and fetches it itself, so this costs nothing in the
    # bundle and needs no loading code. public/ is served at BASE_URL, which is
    # how that app already resolves user-pin.svg under the Pages subpath.
    map_public = ROOT.parent / "map" / "public"
    if map_public.is_dir():
        (map_public / "wcc-suburbs.geojson").write_text(geojson_text)

    # ---- TypeScript, twice -----------------------------------------------
    # src/ for the browser, supabase/functions/ for Deno. Deno cannot import
    # from outside supabase/functions, which is the same reason areas.ts is
    # mirrored. Both are generated from this one run, so they cannot drift.
    payload = [
        {"name": s["name"], "postcode": s["postcode"],
         "bbox": s["bbox"], "rings": s["rings"]}
        for s in suburbs
    ]
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))

    ts = f"""// GENERATED by scripts/build_suburbs.py — do not edit by hand.
//
// The 57 official Wellington City suburb polygons, from Council's own
// PropertyAndBoundaries service. Simplified to ~{TOLERANCE * 111_000:.0f} m and rounded to six
// decimal places; see the script for why those numbers.
// Regenerate with:  bun run suburbs:build
//
// Suburb boundaries © Wellington City Council.

export interface SuburbPolygon {{
  name: string;
  postcode: number;
  /** [minLng, minLat, maxLng, maxLat] — checked before any ring is walked. */
  bbox: [number, number, number, number];
  /** Outer rings only, closed, [lng, lat]. */
  rings: [number, number][][];
}}

export const SUBURBS: SuburbPolygon[] = {body};
"""
    (ROOT / "src" / "lib" / "suburbs.generated.ts").write_text(ts)
    (ROOT / "supabase" / "functions" / "ingest" / "suburbs.generated.ts").write_text(ts)

    # ---- areas, for the picker and for proximity scoring ------------------
    by_name = {s["name"]: s for s in suburbs}
    listed = {n for _, names in REGIONS for n in names}
    missing = sorted(set(by_name) - listed)
    unknown = sorted(listed - set(by_name))
    if missing or unknown:
        # A suburb absent from REGIONS would vanish from the picker silently,
        # which is exactly the kind of quiet truncation this project is not
        # allowed to do. Fail instead.
        sys.exit(f"REGIONS is out of step with the layer.\n"
                 f"  not in any region: {missing}\n"
                 f"  no such suburb:    {unknown}")

    M_PER_DEG_LAT = 111_320.0
    M_PER_DEG_LNG = M_PER_DEG_LAT * 0.7513

    areas = []
    for region, names in REGIONS:
        for name in names:
            s = by_name[name]
            # Centroid of the largest ring, and total area across all rings.
            biggest = max(s["rings"], key=ring_area)
            cx, cy, _ = ring_centroid(biggest)
            sq_deg = sum(ring_area(r) for r in s["rings"])
            sq_m = sq_deg * M_PER_DEG_LAT * M_PER_DEG_LNG

            # The radius of a circle of the same area, not the distance to the
            # furthest corner. Makara is 89 km2 of hill country and its furthest
            # corner is 11 km out; a catchment that size would call half the
            # city "nearby". Clamped so the smallest suburbs still have a
            # usable catchment and the largest do not swallow their neighbours.
            radius = max(800, min(4000, round((sq_m / 3.14159) ** 0.5)))
            centre = [round(cx, 5), round(cy, 5)]

            override = CENTRE_OVERRIDES.get(name)
            if override:
                centre, radius = override

            areas.append({
                "id": slugify(name),
                "suburb": name,
                "postcode": s["postcode"],
                "label": LABELS.get(name, name),
                "region": region,
                "centre": centre,
                "radiusM": radius,
                "tuned": bool(override),
                "blurb": BLURBS.get(name),
            })

    # Regions as selectable areas in their own right. A single suburb is a
    # small target on a city-wide map, and "the south coast" is how both the
    # problem statement and a resident actually talk about this. The bbox is
    # the union of the member suburbs' boxes, so the camera can frame the whole
    # group rather than a point.
    regions = []
    for region, names in REGIONS:
        xs, ys = [], []
        for n in names:
            b = by_name[n]["bbox"]
            xs += [b[0], b[2]]
            ys += [b[1], b[3]]
        regions.append({
            "id": "region-" + slugify(region),
            "label": region,
            "region": region,
            "suburbs": names,
            # Round the minimums DOWN and the maximums UP. Rounding both to
            # nearest shrinks the box by up to 5e-6 deg and can leave a member
            # suburb's edge fractionally outside its own region's bounds.
            "bbox": [math.floor(min(xs) * 1e5) / 1e5,
                     math.floor(min(ys) * 1e5) / 1e5,
                     math.ceil(max(xs) * 1e5) / 1e5,
                     math.ceil(max(ys) * 1e5) / 1e5],
        })

    ts_areas = f"""// GENERATED by scripts/build_suburbs.py — do not edit by hand.
//
// One entry per Wellington City suburb, derived from Council's own boundary
// polygons: `centre` is the shoelace centroid of the largest ring, `radiusM`
// is the radius of a circle of equal area, clamped to 800–4000 m.
//
// `centre` and `radiusM` are for DISTANCE only — how near a signal is to the
// area a resident chose. Whether a point is *in* a suburb is answered by the
// polygon in suburbs.generated.ts, never by this radius.
// Regenerate with:  bun run suburbs:build
//
// Suburb boundaries © Wellington City Council.

export interface GeneratedArea {{
  id: string;
  /** Council's own spelling. The join key for signals.suburb — do not localise. */
  suburb: string;
  /** What a resident sees. Adds macrons Council's data leaves off. */
  label: string;
  /** Council's postcode for the suburb. Not unique — 6021 covers nine of them. */
  postcode: number;
  region: string;
  /** [lng, lat] */
  centre: [number, number];
  radiusM: number;
  /** True where the centre was set by hand because the centroid misleads. */
  tuned: boolean;
  blurb: string | null;
}}

/** In picker order: south coast first, then outward. */
export const GENERATED_AREAS: GeneratedArea[] = {json.dumps(areas, indent=2, ensure_ascii=False)};

export const REGION_ORDER: string[] = {json.dumps([r for r, _ in REGIONS], ensure_ascii=False)};
"""
    (ROOT / "src" / "lib" / "areas.generated.ts").write_text(ts_areas)

    # ---- the same list, for the sibling map/ app -------------------------
    # map/ is a separate Vite app: plain JSX, no TypeScript, no Tailwind, its
    # own package.json. It cannot import from prototype-1/src, so it gets its
    # own generated copy — written by this same run, from this same fetch, so
    # the two apps cannot disagree about where a suburb is or what it is called.
    #
    # Boundary rings are deliberately NOT included. That app only needs to
    # name an area and fly the camera to it, and the rings are 109 KB it would
    # carry for nothing. If it ever needs to answer "which suburb is this
    # point in", give it suburbs.generated.ts too rather than approximating
    # with the radius.
    map_root = ROOT.parent / "map"
    if map_root.is_dir():
        js_areas = [
            {k: a[k] for k in
             ("id", "suburb", "label", "postcode", "region", "centre", "radiusM")}
            for a in areas
        ]
        js = f"""// GENERATED by prototype-1/scripts/build_suburbs.py — do not edit by hand.
//
// The 57 Wellington City suburbs, from Council's own boundary polygons.
// `centre` is the polygon centroid and `radiusM` the radius of a circle of
// equal area, except for the five south coast bays, whose centres are hand-set
// because their boundaries run from the beach over the tops.
//
// Regenerate from the prototype-1 directory with:  bun run suburbs:build
//
// Suburb boundaries © Wellington City Council.

/** In picker order: south coast first, then outward. */
export const AREAS = {json.dumps(js_areas, indent=2, ensure_ascii=False)}

export const REGION_ORDER = {json.dumps([r for r, _ in REGIONS], ensure_ascii=False)}

export const AREAS_BY_ID = Object.fromEntries(AREAS.map(a => [a.id, a]))

export const AREA_GROUPS = REGION_ORDER.map(region => ({{
  region,
  areas: AREAS.filter(a => a.region === region),
}}))

/**
 * Whole regions, selectable like a suburb. `bbox` is the union of the member
 * suburbs' boxes, for framing the camera; `suburbs` are Council's own spellings,
 * for filtering the boundary layer.
 */
export const REGIONS = {json.dumps(regions, indent=2, ensure_ascii=False)}

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]))

/** Suburbs and regions together — anything the picker can select. */
export const SELECTABLE_BY_ID = {{ ...AREAS_BY_ID, ...REGIONS_BY_ID }}
"""
        (map_root / "src" / "areas.js").write_text(js)

    # ---- SQL seed --------------------------------------------------------
    # Rings go in as parallel float arrays rather than jsonb: the point-in-
    # polygon function walks them element by element on every insert, and
    # array subscripting in plpgsql is an order of magnitude cheaper than
    # jsonb path extraction.
    sql = [
        "-- GENERATED by scripts/build_suburbs.py — do not edit by hand.",
        "-- Wellington City suburb boundaries © Wellington City Council,",
        "-- from the endpoint in vendor/wcc-gis/sources-supplementary.json.",
        "",
        "TRUNCATE public.suburb_rings, public.suburb_boundaries;",
        "",
        "INSERT INTO public.suburb_boundaries "
        "(name, postcode, min_lng, min_lat, max_lng, max_lat) VALUES",
    ]
    sql.append(",\n".join(
        "  ('{}', {}, {}, {}, {}, {})".format(
            s["name"].replace("'", "''"), s["postcode"], *s["bbox"])
        for s in suburbs
    ) + ";")
    sql.append("")
    sql.append("INSERT INTO public.suburb_rings (name, ring_no, lngs, lats) VALUES")
    ring_rows = []
    for s in suburbs:
        for i, ring in enumerate(s["rings"]):
            lngs = ",".join(repr(p[0]) for p in ring)
            lats = ",".join(repr(p[1]) for p in ring)
            ring_rows.append(
                "  ('{}', {}, ARRAY[{}]::double precision[], "
                "ARRAY[{}]::double precision[])".format(
                    s["name"].replace("'", "''"), i, lngs, lats))
    sql.append(",\n".join(ring_rows) + ";")
    (ROOT / "supabase" / "seed_suburbs.sql").write_text("\n".join(sql) + "\n")

    kb = len(body) / 1024
    print(f"wrote {len(suburbs)} suburbs, {kept_pts} points ({kb:.0f} KB)")
    print(f"  simplified away {dropped_pts} points, dropped {dropped_rings} slivers")
    print("  -> data/wcc-suburbs.geojson")
    print("  -> src/lib/suburbs.generated.ts")
    print("  -> supabase/functions/ingest/suburbs.generated.ts")
    print("  -> src/lib/areas.generated.ts")
    if (ROOT.parent / "map" / "src" / "areas.js").exists():
        print("  -> ../map/src/areas.js")
        print("  -> ../map/public/wcc-suburbs.geojson")
    print("  -> supabase/seed_suburbs.sql")


if __name__ == "__main__":
    main()
