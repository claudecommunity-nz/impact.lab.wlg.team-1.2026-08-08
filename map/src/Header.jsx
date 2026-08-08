const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export default function Header() {
  return (
    <div style={{ fontFamily: font, flexShrink: 0 }}>
      {/* Black header */}
      <div style={{ background: '#000', color: '#fff', padding: '12px 28px 18px' }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: '#cf2b1e', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0,
          }}>W</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Wellington City Council</div>
            <div style={{ fontSize: 12, color: '#c9c9c6' }}>Te Kaunihera o Pōneke</div>
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px' }}>
          Kia ora, local alerts &amp; weather
        </div>
        <div style={{ fontSize: 13, color: '#c9c9c6' }}>
          Live hazard and weather information for your part of Pōneke | Wellington City.
        </div>
      </div>

      {/* Notice bar */}
      <div style={{
        background: '#FFDD00', color: '#14140f',
        fontSize: 13, fontWeight: 600, textAlign: 'center',
        padding: '8px 20px',
      }}>
        Heavy rain warning in effect —{' '}
        <a href="https://www.metservice.com/warnings/home" target="_blank" rel="noopener noreferrer"
          style={{ color: '#14140f', fontWeight: 700 }}>
          see current watches and warnings
        </a>
      </div>
    </div>
  )
}
