import { REGIONS } from './areas.js'

/**
 * Which suburb — and therefore which region — is a point in?
 *
 * Uses the same boundary file MapLibre draws from, so the answer always agrees
 * with the outline on screen. Fetched once and cached; the browser serves it
 * from cache anyway because the map has already asked for it.
 *
 * Only used to pick the opening region from the user's location. Everything
 * else works off the region lists in areas.js and needs no geometry.
 */

let boundaries = null

export function loadBoundaries() {
  if (!boundaries) {
    boundaries = fetch(`${import.meta.env.BASE_URL}wcc-suburbs.geojson`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch(err => {
        // Let a later call retry rather than caching the failure forever.
        boundaries = null
        throw err
      })
  }
  return boundaries
}

/** Ray casting. Mirrors inRing() in prototype-1/src/lib/suburbs.ts. */
function inRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat)) {
      const x = ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (lng < x) inside = !inside
    }
  }
  return inside
}

/** Council's suburb name for a point, or null if outside Wellington City. */
export async function suburbAt(lng, lat) {
  const fc = await loadBoundaries()
  for (const f of fc.features) {
    for (const poly of f.geometry.coordinates) {
      if (inRing(lng, lat, poly[0])) return f.properties.suburb
    }
  }
  return null
}

const REGION_BY_SUBURB = Object.fromEntries(
  REGIONS.flatMap(r => r.suburbs.map(s => [s, r.id])),
)

/**
 * The region containing a point, or null.
 *
 * Null is the honest answer for Lower Hutt or a spoofed location, and the
 * caller falls back to the south coast rather than guessing a nearest region.
 */
export async function regionAt(lng, lat) {
  const suburb = await suburbAt(lng, lat)
  return suburb ? REGION_BY_SUBURB[suburb] ?? null : null
}
