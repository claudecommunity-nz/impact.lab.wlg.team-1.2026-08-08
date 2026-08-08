import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'

const WELLINGTON = [174.7762, -41.2865]
const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const EMPTY = { type: 'FeatureCollection', features: [] }

function toCollection(feature) {
  return { type: 'FeatureCollection', features: feature ? [feature] : [] }
}

export default function Map({ locationFeature, layers }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const locationRef = useRef(locationFeature)
  const layersRef = useRef(layers)

  locationRef.current = locationFeature
  layersRef.current = layers

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: WELLINGTON,
      zoom: 15,
    })

    map.on('load', () => {
      const img = new Image()
      img.onload = () => {
        map.addImage('person-pin', img)
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
        loadedRef.current = true
      }
      img.src = '/user-pin.svg'
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
    mapRef.current.setLayoutProperty(
      'my-location',
      'visibility',
      layers?.location ? 'visible' : 'none'
    )
  }, [layers])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
