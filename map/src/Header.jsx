const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export default function Header() {
  return (
    <div style={{ fontFamily: font, flexShrink: 0 }}>
      <div style={{
        background: '#000', color: '#fff',
        padding: '10px 28px',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 5,
            background: '#FFDD00', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#000',
          }}>W</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Wellington City Council</div>
            <div style={{ fontSize: 11, color: '#c9c9c6' }}>Te Kaunihera o Pōneke</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: '#3a3a38', flexShrink: 0 }} />

        {/* Title */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Kia ora, local alerts &amp; weather</div>
          <div style={{ fontSize: 11, color: '#c9c9c6' }}>
            Live hazard and weather information for your part of Pōneke | Wellington City.
          </div>
        </div>
      </div>

      {/* Notice bar */}
      <div style={{
        background: '#FFDD00', color: '#14140f',
        fontSize: 12.5, fontWeight: 600, textAlign: 'center',
        padding: '6px 20px',
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
