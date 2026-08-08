import { useEffect, useRef, useState } from 'react'
import Map from './Map.jsx'
import IncidentPanel from './IncidentPanel.jsx'
import Timeline from './Timeline.jsx'
import Header from './Header.jsx'
import InfoPanel from './InfoPanel.jsx'
import useGeolocation from './useGeolocation.js'
import useIncidents from './useIncidents.js'
import useWeather from './useWeather.js'
import { CATEGORIES, EVENT_WINDOW } from './incidents.js'
import { AREAS_BY_ID } from './areas.js'

const defaultLayers = {
  location: true,
  ...Object.fromEntries(CATEGORIES.map(c => [c.id, true])),
}

const WIN = {
  start: Date.parse(EVENT_WINDOW.start),
  end:   Date.now(),
}

const SPEED = 24 * 60 * 60 * 1000

// Island Bay, matching prototype-1's default — the south coast is the problem
// statement, and an empty-looking map of the northern suburbs is a poor opening
// frame for a four-minute demo.
const DEFAULT_AREA = 'island-bay'

export default function App() {
  const locationFeature = useGeolocation()
  const [layers, setLayers] = useState(defaultLayers)
  const [areaId, setAreaId] = useState(DEFAULT_AREA)
  const [selectedIncident, setSelectedIncident] = useState(null)
const [currentTime, setCurrentTime] = useState(WIN.end)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef(null)
  const lastRef = useRef(null)

  const { pins, radii } = useIncidents(currentTime)
  const weather = useWeather(currentTime)

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
          focusArea={AREAS_BY_ID[areaId]}
          onIncidentClick={setSelectedIncident}
        />
        <InfoPanel
          layers={layers}
          onToggle={onToggle}
          weather={weather}
          areaId={areaId}
          onArea={setAreaId}
        />
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
