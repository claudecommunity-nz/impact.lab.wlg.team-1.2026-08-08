/**
 * Mirror of src/lib/areas.ts, for the ingest function.
 *
 * Deno edge functions cannot reliably import from outside supabase/functions,
 * so this is duplicated rather than shared — as suburbs.ts is, and for the same
 * reason. The ids MUST match src/lib/areas.ts exactly, because `area_hint` is
 * written here and read there.
 *
 * They now match by construction rather than by care: both derive the id from
 * the suburb name with the same slug rule, over the same generated boundaries.
 * The old version of this file carried a hand-copied list of five bays and
 * their radii, which is precisely the drift this removes.
 */
import { suburbFor } from './suburbs.ts';

const WELLINGTON_CENTRE: [number, number] = [174.7762, -41.2865];
const WELLINGTON_RADIUS_M = 6000;

export function distanceM(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Must stay identical to slugify() in scripts/build_suburbs.py. */
function slugify(name: string): string {
  return name.toLowerCase().replace(/ /g, '-').replace(/'/g, '');
}

export function areaFor(lng: number, lat: number): string | null {
  const m = suburbFor(lng, lat);
  if (m) return slugify(m.name);

  return distanceM([lng, lat], WELLINGTON_CENTRE) <= WELLINGTON_RADIUS_M
    ? 'wellington-other'
    : null;
}

export const WELLINGTON_BBOX: [number, number, number, number] = [
  174.62, -41.36, 174.94, -41.14,
];

export function inWellington(lng: number, lat: number): boolean {
  const [w, s, e, n] = WELLINGTON_BBOX;
  return lng >= w && lng <= e && lat >= s && lat <= n;
}
