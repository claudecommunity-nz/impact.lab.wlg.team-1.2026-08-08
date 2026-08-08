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
    (ROOT / "data" / "wcc-suburbs.geojson").write_text(
        json.dumps(out_fc, ensure_ascii=False) + "\n")

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
    print("  -> supabase/seed_suburbs.sql")


if __name__ == "__main__":
    main()
