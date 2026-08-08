import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES } from './incidents.js'

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

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

function toGeoJSON(incidents) {
  const pins = {
    type: 'FeatureCollection',
    features: incidents.map((inc, i) => ({
      type: 'Feature',
      id: i,
      geometry: { type: 'Point', coordinates: [inc.lng, inc.lat] },
      properties: {
        type: inc.type,
        severity: inc.severity,
        description: inc.description,
        detail: inc.detail,
        timestamp: inc.timestamp,
      },
    })),
  }

  const radii = {
    type: 'FeatureCollection',
    features: incidents.map((inc, i) => ({
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
}

const EMPTY_GEO = { pins: { type: 'FeatureCollection', features: [] }, radii: { type: 'FeatureCollection', features: [] } }

export default function useIncidents(before) {
  const [allIncidents, setAllIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/incidents.json')
      .then(r => r.json())
      .then(data => { setAllIncidents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return useMemo(() => {
    if (!allIncidents.length) return { ...EMPTY_GEO, loading }
    const filtered = before != null
      ? allIncidents.filter(inc => Date.parse(inc.timestamp) <= before)
      : allIncidents
    return { ...toGeoJSON(filtered), loading }
  }, [allIncidents, before, loading])
}
