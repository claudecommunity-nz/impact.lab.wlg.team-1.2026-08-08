import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { CATEGORIES } from './incidents.js'

const WELLINGTON = [174.7762, -41.2865]
const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const EMPTY = { type: 'FeatureCollection', features: [] }

function toCollection(feature) {
  return { type: 'FeatureCollection', features: feature ? [feature] : [] }
}

function makeDotSvg(colour) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="${colour}" stroke="#ffffff" stroke-width="2"/>
    </svg>`
  )}`
}

export default function Map({ locationFeature, incidentPins, incidentRadii, layers, onIncidentClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const locationRef = useRef(locationFeature)
  const layersRef = useRef(layers)
  const incidentPinsRef = useRef(incidentPins)
  const incidentRadiiRef = useRef(incidentRadii)
  const onIncidentClickRef = useRef(onIncidentClick)

  locationRef.current = locationFeature
  layersRef.current = layers
  incidentPinsRef.current = incidentPins
  incidentRadiiRef.current = incidentRadii
  onIncidentClickRef.current = onIncidentClick

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: WELLINGTON,
      zoom: 12,
    })

    map.on('load', () => {
      // Load user-pin image then set up all layers
      const img = new Image()
      img.onload = () => {
        map.addImage('person-pin', img)

        // Location layer
        map.addSource('my-location', { type: 'geojson', data: toCollection(locationRef.current) })
        map.addLayer({
          id: 'my-location',
          type: 'symbol',
          source: 'my-location',
          layout: {
            'icon-image': 'person-pin',
            'icon-size': 0.8,
            'icon-anchor': 'bottom',
            visibility: layersRef.current?.location ? 'visible' : 'none',
          },
        })

        // Incident sources
        map.addSource('incident-pins', { type: 'geojson', data: incidentPinsRef.current || EMPTY })
        map.addSource('incident-radii', { type: 'geojson', data: incidentRadiiRef.current || EMPTY })

        // Load dot icons and add per-category layers
        let pending = CATEGORIES.length
        CATEGORIES.forEach(cat => {
          const dotImg = new Image()
          dotImg.onload = () => {
            map.addImage(`dot-${cat.id}`, dotImg)

            const visible = layersRef.current?.[cat.id] ? 'visible' : 'none'
            const filter = ['==', ['get', 'type'], cat.id]

            map.addLayer({
              id: `incident-radius-${cat.id}`,
              type: 'fill',
              source: 'incident-radii',
              filter,
              layout: { visibility: visible },
              paint: { 'fill-color': cat.colour, 'fill-opacity': 0.15 },
            })
            map.addLayer({
              id: `incident-radius-line-${cat.id}`,
              type: 'line',
              source: 'incident-radii',
              filter,
              layout: { visibility: visible },
              paint: { 'line-color': cat.colour, 'line-width': 1.5, 'line-opacity': 0.6 },
            })
            map.addLayer({
              id: `incident-pin-${cat.id}`,
              type: 'symbol',
              source: 'incident-pins',
              filter,
              layout: {
                'icon-image': `dot-${cat.id}`,
                'icon-size': 1,
                'icon-allow-overlap': true,
                visibility: visible,
              },
            })

            // Click and hover handlers for this category's pin layer
            map.on('click', `incident-pin-${cat.id}`, e => {
              const props = e.features[0]?.properties
              if (props) onIncidentClickRef.current?.(props)
            })
            map.on('mouseenter', `incident-pin-${cat.id}`, () => {
              map.getCanvas().style.cursor = 'pointer'
            })
            map.on('mouseleave', `incident-pin-${cat.id}`, () => {
              map.getCanvas().style.cursor = ''
            })

            pending -= 1
            if (pending === 0) {
              loadedRef.current = true
              // The incidents fetch can resolve before the images finish decoding.
              // Those update effects bail while loadedRef is false and never re-run,
              // so replay whatever data has landed by now.
              if (incidentPinsRef.current) map.getSource('incident-pins').setData(incidentPinsRef.current)
              if (incidentRadiiRef.current) map.getSource('incident-radii').setData(incidentRadiiRef.current)
              map.getSource('my-location').setData(toCollection(locationRef.current))
            }
          }
          dotImg.src = makeDotSvg(cat.colour)
        })
      }
      // BASE_URL keeps this working under the GitHub Pages subpath as well as at /.
      img.src = `${import.meta.env.BASE_URL}user-pin.svg`
    })

    mapRef.current = map
    return () => {
      loadedRef.current = false
      map.remove()
    }
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return
    mapRef.current.getSource('my-location').setData(toCollection(locationFeature))
  }, [locationFeature])

  useEffect(() => {
    if (!loadedRef.current) return
    if (incidentPins) mapRef.current.getSource('incident-pins').setData(incidentPins)
    if (incidentRadii) mapRef.current.getSource('incident-radii').setData(incidentRadii)
  }, [incidentPins, incidentRadii])

  useEffect(() => {
    if (!loadedRef.current) return
    const map = mapRef.current

    map.setLayoutProperty('my-location', 'visibility', layers?.location ? 'visible' : 'none')

    CATEGORIES.forEach(cat => {
      const visible = layers?.[cat.id] ? 'visible' : 'none'
      map.setLayoutProperty(`incident-pin-${cat.id}`, 'visibility', visible)
      map.setLayoutProperty(`incident-radius-${cat.id}`, 'visibility', visible)
      map.setLayoutProperty(`incident-radius-line-${cat.id}`, 'visibility', visible)
    })
  }, [layers])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
