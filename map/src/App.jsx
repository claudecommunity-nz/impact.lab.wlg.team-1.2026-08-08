import { useEffect, useRef, useState } from 'react'
import Map from './Map.jsx'
import IncidentPanel from './IncidentPanel.jsx'
import Timeline from './Timeline.jsx'
import Header from './Header.jsx'
import InfoPanel from './InfoPanel.jsx'
import useGeolocation from './useGeolocation.js'
import useIncidents from './useIncidents.js'
import { CATEGORIES, EVENT_WINDOW } from './incidents.js'

const defaultLayers = {
  location: true,
  ...Object.fromEntries(CATEGORIES.map(c => [c.id, true])),
}

const WIN = {
  start: Date.parse(EVENT_WINDOW.start),
  end:   Date.now(),
}

const SPEED = 15 * 60 * 1000

export default function App() {
  const locationFeature = useGeolocation()
  const [layers, setLayers] = useState(defaultLayers)
  const [selectedIncident, setSelectedIncident] = useState(null)
const [currentTime, setCurrentTime] = useState(WIN.end)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef(null)
  const lastRef = useRef(null)

  const { pins, radii } = useIncidents(currentTime)

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    function tick(now) {
      if (lastRef.current != null) {
        const delta = now - lastRef.current
        setCurrentTime(t => {
          const next = t + delta * SPEED / 1000
          if (next >= WIN.end) { setPlaying(false); return WIN.end }
          return next
        })
      }
      lastRef.current = now
      rafRef.current = requestAnimationFrame(tick)
    }
    lastRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  function onTogglePlay() {
    if (currentTime >= WIN.end) setCurrentTime(WIN.start)
    setPlaying(p => !p)
  }

  function onToggle(layer) {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  return (
    <>
      <Header />
      <div id="map-root">
        <Map
          locationFeature={locationFeature}
          incidentPins={pins}
          incidentRadii={radii}
          layers={layers}
          onIncidentClick={setSelectedIncident}
        />
        <InfoPanel layers={layers} onToggle={onToggle} />
        <IncidentPanel incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
        <Timeline
          currentTime={currentTime}
          window={WIN}
          playing={playing}
          onSeek={t => { setCurrentTime(t); setPlaying(false) }}
          onTogglePlay={onTogglePlay}
        />
      </div>
    </>
  )
}
