import { CATEGORIES } from './incidents.js'

export default function LegendBar({ layers, onToggle }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 72,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
      zIndex: 10,
      maxWidth: '86vw',
    }}>
      <Pill
        colour="#3b82f6"
        label="Your location"
        checked={layers.location}
        onChange={() => onToggle('location')}
      />
      {CATEGORIES.map(cat => (
        <Pill
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

function Pill({ colour, label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,0,0,0.52)',
      borderRadius: 20,
      padding: '5px 12px',
      cursor: 'pointer',
      userSelect: 'none',
      fontFamily: "'Roboto', sans-serif",
      fontSize: 12,
      color: checked ? '#fff' : 'rgba(255,255,255,0.45)',
      transition: 'color 0.15s',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: checked ? colour : 'rgba(255,255,255,0.3)',
        flexShrink: 0,
        transition: 'background 0.15s',
      }} />
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      {label}
    </label>
  )
}
