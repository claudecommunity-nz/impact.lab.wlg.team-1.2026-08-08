import { CATEGORIES } from './incidents.js'

export default function Legend({ layers, onToggle }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 32,
      left: 12,
      background: 'white',
      borderRadius: 6,
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      padding: '12px 14px',
      zIndex: 1,
      fontSize: 13,
      fontFamily: "'Roboto', sans-serif",
      minWidth: 210,
    }}>
      <Row
        colour="#3b82f6"
        label="Your location"
        checked={layers.location}
        onChange={() => onToggle('location')}
        dot={false}
      />

      <Divider label="Incidents" />

      {CATEGORIES.map(cat => (
        <Row
          key={cat.id}
          colour={cat.colour}
          label={cat.label}
          checked={layers[cat.id]}
          onChange={() => onToggle(cat.id)}
        />
      ))}
    </div>
  )
}

function Row({ colour, label, checked, onChange, dot = true }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ margin: 0 }} />
      <span style={{
        width: 12, height: 12, borderRadius: '50%',
        background: colour, flexShrink: 0,
        border: '1.5px solid rgba(0,0,0,0.15)',
      }} />
      <span style={{ color: '#1f2937' }}>{label}</span>
    </label>
  )
}

function Divider({ label }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#9ca3af',
      margin: '8px 0 4px',
    }}>
      {label}
    </div>
  )
}
