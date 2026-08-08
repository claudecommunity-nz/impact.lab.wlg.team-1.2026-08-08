import { CATEGORIES } from './incidents.js'
import { overlay } from './styles.js'

export default function Legend({ layers, onToggle }) {
  return (
    <div style={{
      ...overlay,
      position: 'absolute',
      bottom: 32,
      left: 12,
      padding: '12px 14px',
      zIndex: 1,
      minWidth: 210,
    }}>
      <Row
        colour="#3b82f6"
        label="Your location"
        checked={layers.location}
        onChange={() => onToggle('location')}
      />

      <Divider />

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

function Row({ colour, label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ margin: 0 }} />
      <span style={{
        width: 12, height: 12, borderRadius: '50%',
        background: colour, flexShrink: 0,
        border: '1.5px solid rgba(0,0,0,0.12)',
      }} />
      <span style={{ color: '#1f2937' }}>{label}</span>
    </label>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '8px 0' }} />
}
