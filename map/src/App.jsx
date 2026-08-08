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
import { REGIONS_BY_ID } from './areas.js'
import { regionAt } from './suburbLookup.js'

const defaultLayers = {
  location: true,
  ...Object.fromEntries(CATEGORIES.map(c => [c.id, true])),
}

const WIN = {
  start: Date.parse(EVENT_WINDOW.start),
  end:   Date.now(),
}

const SPEED = 24 * 60 * 60 * 1000

// Where the map starts if we cannot work out where the user is: the south
// coast, because that is the problem statement. A real location overrides it —
// see the effect below.
const FALLBACK_AREA = 'region-south-coast'

export default function App() {
  const locationFeature = useGeolocation()
  const [layers, setLayers] = useState(defaultLayers)
  const [areaId, setAreaIdRaw] = useState(FALLBACK_AREA)
  // Which suburbs of the chosen region are drawn. Council's spellings, because
  // that is what the boundary layer is keyed on.
  const [activeSuburbs, setActiveSuburbs] = useState(REGIONS_BY_ID[FALLBACK_AREA].suburbs)
  // True once the user has picked a region themselves. Geolocation can arrive
  // seconds late — on a cold GPS fix, well after someone has started clicking —
  // and moving the map out from under them at that point would be worse than
  // not using their location at all.
  const chosenRef = useRef(false)

  // Changing region turns every suburb in it back on. The checkboxes narrow a
  // region; they are not a selection that should survive leaving it.
  function setArea(id, byUser = true) {
    if (byUser) chosenRef.current = true
    setAreaIdRaw(id)
    setActiveSuburbs(REGIONS_BY_ID[id]?.suburbs ?? [])
  }

  function toggleSuburb(name) {
    setActiveSuburbs(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  function setAllSuburbs(on) {
    setActiveSuburbs(on ? REGIONS_BY_ID[areaId]?.suburbs ?? [] : [])
  }

  // Open on the user's own region, once, if we can tell what it is.
  //
  // Point-in-polygon against Council's boundaries, not the nearest region
  // centre — the regions are large and irregular, and "nearest centre" would
  // put someone in Ngaio into the city. A location outside Wellington City
  // resolves to null and we keep the fallback rather than guessing.
  useEffect(() => {
    const c = locationFeature?.geometry?.coordinates
    if (!c || chosenRef.current) return
    let cancelled = false
    regionAt(c[0], c[1])
      .then(id => { if (id && !cancelled && !chosenRef.current) setArea(id, false) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [locationFeature])
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
          focusArea={REGIONS_BY_ID[areaId]}
          activeSuburbs={activeSuburbs}
          onIncidentClick={setSelectedIncident}
        />
        <InfoPanel
          layers={layers}
          onToggle={onToggle}
          weather={weather}
          areaId={areaId}
          onArea={setArea}
          activeSuburbs={activeSuburbs}
          onToggleSuburb={toggleSuburb}
          onSetAll={setAllSuburbs}
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
