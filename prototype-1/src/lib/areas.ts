/**
 * The areas a resident can choose, and how near a signal is to one.
 *
 * Every Wellington City suburb is here, generated from Council's own boundary
 * polygons (`areas.generated.ts`). It used to be five hand-drawn south coast
 * circles plus "Elsewhere in Wellington", which meant two thirds of the city
 * could only describe itself as elsewhere.
 *
 * Each area still carries a centre and a radius, and those are still what
 * personalisation measures against. That has not changed and should not:
 *
 * - **Where is this?** is answered by the polygon, in `suburbs.ts`. Boundaries
 *   are exact and are what the interface names.
 * - **How near is this?** is answered by the centre and radius here. A
 *   distance, because "about a kilometre from Island Bay" is the precision a
 *   resident reasons with, and because ranking on a polygon that is 0.26 km² at
 *   Moa Point and 89 km² at Makara would rank by nothing but suburb size.
 *
 * For the five south coast bays the centre is hand-set rather than derived —
 * their boundaries run from the beach over the tops, so the centroid lands
 * inland on a ridge. See CENTRE_OVERRIDES in scripts/build_suburbs.py.
 */

import { GENERATED_AREAS, REGION_ORDER, type GeneratedArea } from './areas.generated';
import { suburbFor } from './suburbs';

export interface Area {
  id: string;
  label: string;
  /** Council's own spelling, and the join key for `signals.suburb`. */
  suburb: string | null;
  region: string;
  /** [lng, lat] */
  centre: [number, number];
  /** Rough catchment in metres. */
  radiusM: number;
  blurb: string | null;
}

/**
 * The catch-all, kept for two reasons: signals outside Wellington City still
 * need somewhere to land (most of the Wellington Water feed is Lower Hutt), and
 * `area_hint = 'wellington-other'` already exists in the database.
 */
const ELSEWHERE: Area = {
  id: 'wellington-other',
  label: 'Elsewhere in Wellington',
  suburb: null,
  region: 'Anywhere else',
  centre: [174.7762, -41.2865],
  radiusM: 6000,
  blurb: 'Anywhere not listed above, and the wider region.',
};

export const AREAS: Area[] = [
  ...GENERATED_AREAS.map((a: GeneratedArea) => ({
    id: a.id,
    label: a.label,
    suburb: a.suburb,
    region: a.region,
    centre: a.centre,
    radiusM: a.radiusM,
    blurb: a.blurb,
  })),
  ELSEWHERE,
];

export const AREAS_BY_ID: Record<string, Area> = Object.fromEntries(
  AREAS.map((a) => [a.id, a]),
);

/** Council's suburb name -> our area id, for joining a signal to an area. */
const AREA_ID_BY_SUBURB: Record<string, string> = Object.fromEntries(
  AREAS.filter((a) => a.suburb).map((a) => [a.suburb as string, a.id]),
);

/** Areas grouped for the picker, in the generated order. */
export const AREA_GROUPS: { region: string; areas: Area[] }[] = [
  ...REGION_ORDER.map((region) => ({
    region,
    areas: AREAS.filter((a) => a.region === region),
  })),
  { region: ELSEWHERE.region, areas: [ELSEWHERE] },
];

export const DEFAULT_AREA = 'island-bay';

/** Great-circle distance in metres. */
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

/**
 * Which area a point belongs to.
 *
 * The boundary decides, not the nearest centre — a point is in the suburb
 * Council says it is in, even when a different suburb's centre happens to be
 * closer. That is how Houghton Bay Road ends up in Lyall Bay: Council's line,
 * not our arithmetic.
 *
 * Offshore points take the nearest suburb within 3 km, which is what
 * `suburbFor` returns with `exact: false`. A wave buoy belongs to the bay it
 * sits off, for the purpose of "is this near me".
 *
 * Falls back to the Wellington-wide catch-all, then to null for anything
 * outside the region entirely.
 */
export function areaFor(lng: number, lat: number): string | null {
  const m = suburbFor(lng, lat);
  if (m) {
    const id = AREA_ID_BY_SUBURB[m.name];
    if (id) return id;
  }
  return distanceM([lng, lat], ELSEWHERE.centre) <= ELSEWHERE.radiusM
    ? ELSEWHERE.id
    : null;
}

export function areaLabel(id: string | null | undefined): string {
  return (id && AREAS_BY_ID[id]?.label) || 'Wellington';
}
