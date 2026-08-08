import { useState } from 'react'
import Map from './Map.jsx'
import Legend from './Legend.jsx'
import useGeolocation from './useGeolocation.js'

export default function App() {
  const locationFeature = useGeolocation()
  const [layers, setLayers] = useState({ location: true })

  function onToggle(layer) {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  return (
    <div id="map-root">
      <Map locationFeature={locationFeature} layers={layers} />
      <Legend layers={layers} onToggle={onToggle} />
    </div>
  )
}
