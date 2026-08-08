import { useState } from 'react'
import Map from './Map.jsx'
import Legend from './Legend.jsx'
import IncidentPanel from './IncidentPanel.jsx'
import useGeolocation from './useGeolocation.js'
import useIncidents from './useIncidents.js'
import { CATEGORIES } from './incidents.js'

const defaultLayers = {
  location: true,
  ...Object.fromEntries(CATEGORIES.map(c => [c.id, true])),
}

export default function App() {
  const locationFeature = useGeolocation()
  const { pins, radii } = useIncidents()  // loading state available if needed
  const [layers, setLayers] = useState(defaultLayers)
  const [selectedIncident, setSelectedIncident] = useState(null)

  function onToggle(layer) {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  return (
    <div id="map-root">
      <Map
        locationFeature={locationFeature}
        incidentPins={pins}
        incidentRadii={radii}
        layers={layers}
        onIncidentClick={setSelectedIncident}
      />
      <Legend layers={layers} onToggle={onToggle} />
      <IncidentPanel incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
    </div>
  )
}
