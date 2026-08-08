import { useMemo } from 'react'
import { CATEGORIES, INCIDENTS } from './incidents.js'

function circlePolygon(lng, lat, radiusMetres) {
  const steps = 64
  const R = 6371000
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dLat = (radiusMetres / R) * Math.cos(angle) * (180 / Math.PI)
    const dLng = (radiusMetres / R) * Math.sin(angle) / Math.cos(lat * Math.PI / 180) * (180 / Math.PI)
    coords.push([lng + dLng, lat + dLat])
  }
  return coords
}

export default function useIncidents() {
  return useMemo(() => {
    const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

    const pins = {
      type: 'FeatureCollection',
      features: INCIDENTS.map((inc, i) => ({
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: [inc.lng, inc.lat] },
        properties: { type: inc.type, description: inc.description },
      })),
    }

    const radii = {
      type: 'FeatureCollection',
      features: INCIDENTS.map((inc, i) => ({
        type: 'Feature',
        id: i,
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon(inc.lng, inc.lat, catMap[inc.type].radiusMetres)],
        },
        properties: { type: inc.type },
      })),
    }

    return { pins, radii }
  }, [])
}
