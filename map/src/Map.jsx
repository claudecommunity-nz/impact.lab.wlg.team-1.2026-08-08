import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'

const WELLINGTON = [174.7762, -41.2865]
const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export default function Map() {
  const containerRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: WELLINGTON,
      zoom: 12,
    })
    return () => map.remove()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
