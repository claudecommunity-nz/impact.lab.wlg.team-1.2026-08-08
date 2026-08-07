/**
 * South coast areas.
 *
 * The problem statement names the south coast specifically, so these are the
 * places the app organises itself around. Each is a centre point and a radius
 * rather than a real boundary polygon — deliberately. It keeps personalisation
 * to a distance comparison with no spatial index, no PostGIS and nothing to go
 * wrong at 16:30, and "within about a kilometre of Island Bay" is exactly the
 * precision a resident actually reasons with.
 *
 * Where a stated boundary matters (flood extent, evacuation zone) we show the
 * publisher's own polygon as a map overlay instead of approximating it here.
 */

export interface Area {
  id: string;
  label: string;
  /** [lng, lat] */
  centre: [number, number];
  /** Rough catchment in metres. */
  radiusM: number;
  blurb: string;
}

export const AREAS: Area[] = [
  {
    id: 'owhiro-bay',
    label: 'Ōwhiro Bay',
    centre: [174.7622, -41.3456],
    radiusM: 1200,
    blurb: 'Ōwhiro Bay Parade, the quarry end, Te Kopahou.',
  },
  {
    id: 'island-bay',
    label: 'Island Bay',
    centre: [174.7756, -41.3399],
    radiusM: 1300,
    blurb: 'The Parade, Shorland Park, the Esplanade.',
  },
  {
    id: 'houghton-bay',
    label: 'Houghton Bay',
    centre: [174.7897, -41.34],
    radiusM: 1000,
    blurb: 'Houghton Bay Road, Te Raekaihau Point.',
  },
  {
    id: 'lyall-bay',
    label: 'Lyall Bay',
    centre: [174.7997, -41.3283],
    radiusM: 1400,
    blurb: 'Lyall Parade, the surf club, Queens Drive.',
  },
  {
    id: 'moa-point',
    label: 'Moa Point',
    centre: [174.8118, -41.3417],
    radiusM: 1100,
    blurb: 'Moa Point Road, the airport south end, Breaker Bay.',
  },
  {
    id: 'wellington-other',
    label: 'Elsewhere in Wellington',
    centre: [174.7762, -41.2865],
    radiusM: 6000,
    blurb: 'The city, the western suburbs and the northern suburbs.',
  },
];

export const AREAS_BY_ID: Record<string, Area> = Object.fromEntries(
  AREAS.map((a) => [a.id, a]),
);

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
 * Nearest named area to a point, or null if it is not close to any of them.
 * Checks the five south coast bays before the catch-all, so a point that is
 * near both resolves to the specific bay rather than "elsewhere".
 */
export function areaFor(lng: number, lat: number): string | null {
  let best: { id: string; d: number } | null = null;
  for (const a of AREAS) {
    if (a.id === 'wellington-other') continue;
    const d = distanceM([lng, lat], a.centre);
    if (d <= a.radiusM && (!best || d < best.d)) best = { id: a.id, d };
  }
  if (best) return best.id;

  const other = AREAS_BY_ID['wellington-other'];
  return distanceM([lng, lat], other.centre) <= other.radiusM
    ? 'wellington-other'
    : null;
}

export function areaLabel(id: string | null | undefined): string {
  return (id && AREAS_BY_ID[id]?.label) || 'Wellington';
}
