import { useState } from 'react'
import { CATEGORIES } from './incidents.js'
import { REGIONS_BY_ID } from './areas.js'
import AreaPicker from './AreaPicker.jsx'
import NearbyReport from './NearbyReport.jsx'
import { overlay } from './styles.js'
import useIsMobile from './useIsMobile.js'

const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

/** Height of the timeline bar the sheets must sit above — see Timeline.jsx. */
const TIMELINE_H = 26

const card = {
  ...overlay,
  fontFamily: font,
  padding: '14px 16px',
  marginBottom: 10,
}

const ALL_ITEMS = [
  { id: 'location', label: 'Your location', colour: '#3b82f6' },
  ...CATEGORIES.map(c => ({ id: c.id, label: c.label, colour: c.colour })),
]

export default function InfoPanel({
  layers, onToggle, weather, areaId, onArea, activeSuburbs, onToggleSuburb, onSetAll,
  pins, currentTime, locationStatus, locationError, outsideCity,
}) {
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const cards = (
    <>
      <AreaPicker
        areaId={areaId}
        onArea={onArea}
        activeSuburbs={activeSuburbs}
        onToggleSuburb={onToggleSuburb}
        onSetAll={onSetAll}
        locationStatus={locationStatus}
        locationError={locationError}
        outsideCity={outsideCity}
      />
      <NearbyReport
        pins={pins}
        activeSuburbs={activeSuburbs}
        regionLabel={REGIONS_BY_ID[areaId]?.label ?? 'Wellington'}
        currentTime={currentTime}
      />
      <ConditionsCard />
      <WeatherCard weather={weather} />
      <StatsRow weather={weather} />
      <SeaTempCard weather={weather} />
      <FilterBar layers={layers} onToggle={onToggle} />
    </>
  )

  // On a phone the panel is a bottom sheet: collapsed to a handle by default,
  // because the map is what someone opened this for. The handle still says
  // which area is loaded and what the temperature is.
  if (mobile) {
    return (
      <div style={{
        position: 'absolute',
        // Clear of the timeline bar, which owns the bottom 26px of the map.
        left: 0, right: 0, bottom: TIMELINE_H,
        zIndex: 15,
        background: '#fff',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.16)',
        fontFamily: font,
      }}>
        <SheetHandle
          open={open}
          onClick={() => setOpen(o => !o)}
          areaId={areaId}
          weather={weather}
        />
        {open && (
          <div style={{
            maxHeight: '70vh', overflowY: 'auto',
            padding: '0 12px 12px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {cards}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      bottom: 42,
      width: 280,
      zIndex: 5,
      overflowY: 'auto',
    }}>
      {cards}
    </div>
  )
}

function SheetHandle({ open, onClick, areaId, weather }) {
  const region = REGIONS_BY_ID[areaId]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, width: '100%', minHeight: 46,
        border: 'none', background: 'none', cursor: 'pointer',
        padding: '10px 14px', fontFamily: font, textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 11, color: '#757570', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s', display: 'inline-block',
        }}>▲</span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#14140f',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {region?.label ?? 'Choose an area'}
        </span>
      </span>
      <span style={{ fontSize: 12.5, color: '#55554f', flexShrink: 0 }}>
        {weather ? `${weather.tempC}° · ${weather.windKph} km/h` : 'Conditions'}
      </span>
    </button>
  )
}

function FilterBar({ layers, onToggle }) {
  return (
    <div style={{
      ...card,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
      minHeight: 44,
    }}>
      {ALL_ITEMS.map(item => {
        const on = layers && layers[item.id]
        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: on ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)',
              border: 'none', borderRadius: 20,
              padding: '3px 10px 3px 7px',
              fontSize: 11,
              color: on ? '#3a3a36' : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              transition: 'color 0.15s, background 0.15s',
              fontFamily: font,
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: on ? item.colour : 'rgba(0,0,0,0.18)',
              transition: 'background 0.15s',
            }} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function ConditionsCard() {
  const rows = [
    { label: 'Drinking water',   pill: 'Safe',             safe: true  },
    { label: 'Washing clothes',  pill: 'Wait until 2pm',   safe: false },
    { label: 'Walking the dog',  pill: 'Fine outside',     safe: true  },
  ]
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#14140f' }}>
        What does this mean for your day?
      </div>
      {rows.map(r => (
        <div key={r.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12.5, padding: '7px 0',
          borderTop: '1px solid rgba(0,0,0,0.07)',
        }}>
          <span style={{ color: '#3a3a36' }}>{r.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 3,
            background: r.safe ? '#e7f2e5' : '#fdeee0',
            color:      r.safe ? '#1e5e17' : '#a3450c',
          }}>{r.pill}</span>
        </div>
      ))}
    </div>
  )
}

function WeatherCard({ weather }) {
  const temp = weather ? `${weather.tempC}°` : '—'
  const condition = weather ? weather.condition : '—'
  const sub = weather
    ? `Feels like ${weather.feelsLikeC}° · H:${weather.highC}° L:${weather.lowC}°`
    : ''
  return (
    <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: '#14140f' }}>{temp}</div>
        <div style={{ fontSize: 12.5, color: '#3a3a36', margin: '6px 0 4px', lineHeight: 1.4, maxWidth: 160 }}>
          {condition}
        </div>
        <div style={{ fontSize: 11.5, color: '#757570' }}>{sub}</div>
      </div>
      <div style={{
        width: 38, height: 38, borderRadius: 4,
        background: '#000', color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17.5 19a4.5 4.5 0 0 0 0-9h-1.8a6.5 6.5 0 0 0-12.4 2.6A4 4 0 0 0 4 19h13.5Z"/>
        </svg>
      </div>
    </div>
  )
}

function StatsRow({ weather }) {
  const windVal = weather ? `${weather.windKph} km/h` : '—'
  const windSub = weather ? `${weather.windDir}, gusting ${weather.windGustKph}` : ''
  const rainVal = weather ? `${weather.rainChancePct}%` : '—'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
      <StatCard
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.6-8.4A2 2 0 1 1 19 12H2"/></svg>}
        label="Wind"
        value={windVal}
        sub={windSub}
      />
      <StatCard
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.7s6 6.5 6 10.8a6 6 0 1 1-12 0c0-4.3 6-10.8 6-10.8Z"/></svg>}
        label="Rain chance"
        value={rainVal}
        sub=""
      />
    </div>
  )
}

function SeaTempCard({ weather }) {
  const value = weather ? `${weather.seaTempC}°` : '—'
  return (
    <StatCard
      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 15c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0M2 19c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0M12 3v9"/></svg>}
      label="Sea temp"
      value={value}
      sub="Swell 2.5m, south coast"
      full
    />
  )
}

function StatCard({ icon, label, value, sub, full }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#55554f', fontSize: 12, fontWeight: 600 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#14140f' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#757570' }}>{sub}</div>
    </div>
  )
}
