import { overlay } from './styles.js'
import { CATEGORIES } from './incidents.js'

const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export default function AlertModal({ weather, pins, onClose }) {
  const counts = {}
  if (pins?.features) {
    for (const f of pins.features) {
      const t = f.properties.type
      counts[t] = (counts[t] || 0) + 1
    }
  }
  const activeCategories = CATEGORIES.filter(c => counts[c.id])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          fontFamily: font,
          background: '#fff',
          borderRadius: 12,
          width: 560,
          maxWidth: '90vw',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Title + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#14140f' }}>Current situation</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#757570', padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {/* Weather */}
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#757570', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Current conditions</div>
          {weather ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#14140f', lineHeight: 1 }}>{weather.tempC}°</div>
              <div style={{ fontSize: 13, color: '#3a3a36', margin: '6px 0 4px' }}>{weather.condition}</div>
              <div style={{ fontSize: 12, color: '#757570' }}>
                Wind {weather.windKph} km/h {weather.windDir}, gusting {weather.windGustKph}<br />
                Rain chance {weather.rainChancePct}% · Sea {weather.seaTempC}°
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#757570' }}>No data</div>
          )}
        </div>

        {/* Active incidents */}
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#757570', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active on map</div>
          {activeCategories.length === 0 ? (
            <div style={{ fontSize: 13, color: '#757570' }}>No active incidents</div>
          ) : activeCategories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.colour, flexShrink: 0 }} />
              <span style={{ color: '#3a3a36' }}>{c.label}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#14140f' }}>{counts[c.id]}</span>
            </div>
          ))}
        </div>

        {/* Sources */}
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#757570', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Official sources</div>
          {[
            { label: 'MetService warnings', url: 'https://www.metservice.com/warnings/home' },
            { label: 'WREMO emergency info', url: 'https://www.wremo.nz' },
            { label: 'WCC emergency updates', url: 'https://wellington.govt.nz/emergency' },
          ].map(s => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', fontSize: 12, color: '#1d4ed8',
              marginBottom: 5, textDecoration: 'none',
            }}>
              {s.label} ↗
            </a>
          ))}
        </div>

      </div>
    </div>
  )
}
