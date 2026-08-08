export default function Legend({ layers, onToggle }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 32,
      left: 12,
      background: 'white',
      borderRadius: 6,
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      padding: '10px 14px',
      zIndex: 1,
      fontSize: 14,
      fontFamily: "'Roboto', sans-serif",
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={layers.location}
          onChange={() => onToggle('location')}
        />
        Your location
      </label>
    </div>
  )
}
