/**
 * Mirror of src/lib/suburbs.ts, for the ingest function.
 *
 * Duplicated rather than shared for the same reason areas.ts is: Deno edge
 * functions cannot reliably import from outside supabase/functions. The data
 * both files read is generated once by scripts/build_suburbs.py into two
 * identical files, so the polygons cannot drift; only this logic can. If you
 * change one, change the other.
 */

import { SUBURBS, type SuburbPolygon } from './suburbs.generated.ts';

export type { SuburbPolygon };
export { SUBURBS };

export interface SuburbMatch {
  name: string;
  postcode: number;
  /**
   * True when the point is inside the boundary. False when it is offshore or
   * otherwise outside, and this is the nearest suburb instead — the interface
   * must not present the two the same way.
   */
  exact: boolean;
  /** Metres to the boundary. Zero when `exact`. */
  distanceM: number;
}

/**
 * How far offshore we will still name a suburb. 3 km covers the wave buoy at
 * Baring Head and the harbour sea-level gauge, and stops well short of naming
 * a Cook Strait swell after a street.
 */
const NEAREST_LIMIT_M = 3_000;

const M_PER_DEG_LAT = 111_320;
/** Longitude degrees are shorter this far south; cos(41.3°) ≈ 0.7513. */
const M_PER_DEG_LNG = M_PER_DEG_LAT * 0.7513;

function inRing(lng: number, lat: number, ring: [number, number][]): boolean {
  // Ray casting. `!=` on the two y-comparisons is the standard crossing test:
  // it counts an edge only when the ray passes between its endpoints.
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat) {
      const x = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (lng < x) inside = !inside;
    }
  }
  return inside;
}

/** Metres from a point to a segment, in the local flat approximation. */
function distToSegmentM(
  lng: number,
  lat: number,
  [ax, ay]: [number, number],
  [bx, by]: [number, number],
): number {
  const px = (lng - ax) * M_PER_DEG_LNG;
  const py = (lat - ay) * M_PER_DEG_LAT;
  const vx = (bx - ax) * M_PER_DEG_LNG;
  const vy = (by - ay) * M_PER_DEG_LAT;

  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * vx + py * vy) / len2));
  const dx = px - t * vx;
  const dy = py - t * vy;
  return Math.sqrt(dx * dx + dy * dy);
}

function distToSuburbM(lng: number, lat: number, s: SuburbPolygon): number {
  let best = Infinity;
  for (const ring of s.rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const d = distToSegmentM(lng, lat, ring[i], ring[i + 1]);
      if (d < best) best = d;
    }
  }
  return best;
}

/** Cheap reject: is the point within `padM` of the suburb's bounding box? */
function nearBbox(lng: number, lat: number, s: SuburbPolygon, padM: number): boolean {
  const padLng = padM / M_PER_DEG_LNG;
  const padLat = padM / M_PER_DEG_LAT;
  const [w, sth, e, n] = s.bbox;
  return lng >= w - padLng && lng <= e + padLng && lat >= sth - padLat && lat <= n + padLat;
}

/**
 * The suburb containing this point, or the nearest one within 3 km.
 * Returns null beyond that — a Cook Strait buoy gets no suburb, which is the
 * correct answer.
 */
export function suburbFor(lng: number, lat: number): SuburbMatch | null {
  for (const s of SUBURBS) {
    if (!nearBbox(lng, lat, s, 0)) continue;
    for (const ring of s.rings) {
      if (inRing(lng, lat, ring)) {
        return { name: s.name, postcode: s.postcode, exact: true, distanceM: 0 };
      }
    }
  }

  let best: { s: SuburbPolygon; d: number } | null = null;
  for (const s of SUBURBS) {
    if (!nearBbox(lng, lat, s, NEAREST_LIMIT_M)) continue;
    const d = distToSuburbM(lng, lat, s);
    if (d <= NEAREST_LIMIT_M && (!best || d < best.d)) best = { s, d };
  }

  return best
    ? {
        name: best.s.name,
        postcode: best.s.postcode,
        exact: false,
        distanceM: Math.round(best.d),
      }
    : null;
}

/** Just the name, for the common case. */
export function suburbNameFor(lng: number, lat: number): string | null {
  return suburbFor(lng, lat)?.name ?? null;
}

/**
 * How a suburb should be worded in the interface.
 *
 * An inexact match must never read like a containing one. "Off Lyall Bay" is
 * the difference between telling someone where a wave buoy is and telling them
 * their street is affected.
 */
export function suburbLabel(m: SuburbMatch | null | undefined): string {
  if (!m) return 'Wellington';
  return m.exact ? m.name : `off ${m.name}`;
}

/** Alphabetical suburb names, for pickers. */
export const SUBURB_NAMES: string[] = SUBURBS.map((s) => s.name);
