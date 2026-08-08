import { overlay } from './styles.js'

const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

const card = {
  ...overlay,
  fontFamily: font,
  padding: '14px 16px',
  marginBottom: 10,
}

export default function InfoPanel() {
  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      width: 280,
      zIndex: 5,
    }}>
      <SearchBar />
      <ConditionsCard />
      <WeatherCard />
      <StatsRow />
      <SeaTempCard />
    </div>
  )
}

function SearchBar() {
  return (
    <div style={{
      ...card,
      display: 'flex', alignItems: 'center', gap: 8,
      color: '#55554f', fontSize: 13,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
        <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
      </svg>
      Search an address or suburb
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

function WeatherCard() {
  return (
    <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: '#14140f' }}>15°</div>
        <div style={{ fontSize: 12.5, color: '#3a3a36', margin: '6px 0 4px', lineHeight: 1.4, maxWidth: 160 }}>
          Cloudy, breezy showers easing to afternoon spots
        </div>
        <div style={{ fontSize: 11.5, color: '#757570' }}>Feels like 12° · H:16° L:11°</div>
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

function StatsRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
      <StatCard
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.6-8.4A2 2 0 1 1 19 12H2"/></svg>}
        label="Wind"
        value="35 km/h"
        sub="Southerly, gusting 55"
      />
      <StatCard
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.7s6 6.5 6 10.8a6 6 0 1 1-12 0c0-4.3 6-10.8 6-10.8Z"/></svg>}
        label="Rain chance"
        value="70%"
        sub="Heaviest before noon"
      />
    </div>
  )
}

function SeaTempCard() {
  return (
    <StatCard
      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 15c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0M2 19c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0M12 3v9"/></svg>}
      label="Sea temp"
      value="14°"
      sub="Swell 2.5m, south coast"
      full
    />
  )
}

function StatCard({ icon, label, value, sub, full }) {
  return (
    <div style={{ ...card, marginBottom: full ? 0 : undefined, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#55554f', fontSize: 12, fontWeight: 600 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#14140f' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#757570' }}>{sub}</div>
    </div>
  )
}
