/**
 * Mirror of src/lib/areas.ts. Duplicated rather than shared because Deno edge
 * functions cannot reliably import from outside supabase/functions, and a
 * six-line distance calculation is cheaper to duplicate than to plumb.
 * If you change one, change the other — the ids must match exactly.
 */
const AREAS: { id: string; centre: [number, number]; radiusM: number }[] = [
  { id: 'owhiro-bay', centre: [174.7622, -41.3456], radiusM: 1200 },
  { id: 'island-bay', centre: [174.7756, -41.3399], radiusM: 1300 },
  { id: 'houghton-bay', centre: [174.7897, -41.34], radiusM: 1000 },
  { id: 'lyall-bay', centre: [174.7997, -41.3283], radiusM: 1400 },
  { id: 'moa-point', centre: [174.8118, -41.3417], radiusM: 1100 },
];

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

export function areaFor(lng: number, lat: number): string | null {
  let best: { id: string; d: number } | null = null;
  for (const a of AREAS) {
    const d = distanceM([lng, lat], a.centre);
    if (d <= a.radiusM && (!best || d < best.d)) best = { id: a.id, d };
  }
  if (best) return best.id;
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
