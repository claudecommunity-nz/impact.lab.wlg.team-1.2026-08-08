import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { CATEGORIES } from './incidents.js'

const WELLINGTON = [174.7762, -41.2865]
const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const EMPTY = { type: 'FeatureCollection', features: [] }
/** Matches no feature — the outline's resting state. */
const NO_SUBURB = ['==', ['get', 'suburb'], '\u0000']

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

/**
 * Frame a suburb.
 *
 * Zoom is derived from the suburb's own catchment rather than fixed, because
 * these vary enormously — Moa Point is 0.26 km2 and Makara is 89 km2, and no
 * single zoom level frames both. This is the Web Mercator metres-per-pixel
 * relation solved for zoom, sized to put roughly two radii across the viewport.
 */
function flyToArea(map, area) {
  // A whole region is framed by its bounding box. Deriving a centre and radius
  // for it would be wrong twice over: the western suburbs run from Makara Beach
  // to Wadestown, and a circle around that covers most of the harbour.
  if (area.bbox) {
    const [w, s, e, n] = area.bbox
    map.fitBounds([[w, s], [e, n]], {
      // Room for the sidebar, which sits over the left of the map.
      padding: { top: 40, right: 40, bottom: 60, left: 340 },
      duration: 900,
      essential: true,
    })
    return
  }

  const width = map.getContainer().clientWidth || 800
  const metresPerPixel = (area.radiusM * 2.4) / width
  const latRad = area.centre[1] * Math.PI / 180
  const zoom = Math.log2(156543.03392 * Math.cos(latRad) / metresPerPixel)

  map.flyTo({
    center: area.centre,
    zoom: Math.max(11, Math.min(15, zoom)),
    duration: 900,
    essential: true,
  })
}

/**
 * Show only the chosen suburb's boundary.
 *
 * Matched on Council's own `suburb` spelling, not the display label — the
 * label carries macrons ("Ōwhiro Bay") that the boundary data does not. The
 * catch-all area has no suburb, so it correctly outlines nothing.
 */
/**
 * Outline exactly the suburbs that are ticked.
 *
 * Keyed on Council's own spelling, never the display label — the data says
 * "Owhiro Bay" and the interface shows "Ōwhiro Bay". An empty list outlines
 * nothing, which is the honest result of unticking everything.
 */
function setSuburbFilter(map, names) {
  const filter = names?.length
    ? ['in', ['get', 'suburb'], ['literal', names]]
    : NO_SUBURB
  map.setFilter('suburb-fill', filter)
  map.setFilter('suburb-outline', filter)
}

export default function Map({ locationFeature, incidentPins, incidentRadii, layers, focusArea, activeSuburbs, onIncidentClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const pendingFocusRef = useRef(null)
  const pendingOutlineRef = useRef(null)
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

        // Selected suburb outline.
        //
        // Underneath everything else on purpose — it is context for the pins,
        // not a thing to click. MapLibre fetches the file itself from a URL, so
        // there is no loading code here and nothing in the bundle.
        //
        // The filter starts matching nothing. Council's own `suburb` spelling
        // is the key, which is why areas.js carries it alongside the display
        // label: the label has macrons the boundary data does not.
        map.addSource('suburb-boundaries', {
          type: 'geojson',
          data: `${import.meta.env.BASE_URL}wcc-suburbs.geojson`,
        })
        map.addLayer({
          id: 'suburb-fill',
          type: 'fill',
          source: 'suburb-boundaries',
          filter: NO_SUBURB,
          paint: { 'fill-color': '#0b5cad', 'fill-opacity': 0.06 },
        })
        map.addLayer({
          id: 'suburb-outline',
          type: 'line',
          source: 'suburb-boundaries',
          filter: NO_SUBURB,
          paint: {
            'line-color': '#0b5cad',
            'line-width': 2,
            'line-opacity': 0.75,
          },
        })

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
              if (pendingFocusRef.current) {
                flyToArea(map, pendingFocusRef.current)
                pendingFocusRef.current = null
              }
              setSuburbFilter(map, pendingOutlineRef.current)
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

  // Move the camera when the chosen suburb changes.
  //
  // Skipped on the very first render. The map deliberately opens on the whole
  // city at zoom 12, which is the right opening frame for a common operating
  // picture; flying to a suburb before the user has asked would throw that away
  // and animate from a frame nobody has seen yet.
  //
  // A choice made while the style is still loading is held and replayed on
  // load, the same way the incident data is below. Without that, picking a
  // suburb in the first second does nothing at all and the effect never re-runs
  // to correct it.
  const firstFocusRef = useRef(true)
  useEffect(() => {
    if (!focusArea) return
    if (firstFocusRef.current) { firstFocusRef.current = false; return }
    if (!loadedRef.current) { pendingFocusRef.current = focusArea; return }
    flyToArea(mapRef.current, focusArea)
  }, [focusArea])

  // Outline the chosen suburb.
  //
  // Separate from the camera effect because it must run on the FIRST render
  // too: the opening frame should already show which suburb is selected, even
  // though the camera deliberately stays on the whole city.
  useEffect(() => {
    if (!loadedRef.current) { pendingOutlineRef.current = activeSuburbs ?? []; return }
    setSuburbFilter(mapRef.current, activeSuburbs)
  }, [activeSuburbs])

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
