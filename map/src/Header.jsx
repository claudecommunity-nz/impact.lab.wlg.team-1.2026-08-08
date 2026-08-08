const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export default function Header({ notice, onNoticeClick }) {
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
      {notice && (
        <div
          onClick={onNoticeClick}
          style={{
            background: notice.level === 'clear' ? '#d1fae5' : '#FFDD00',
            color: '#14140f',
            fontSize: 12.5, fontWeight: 600, textAlign: 'center',
            padding: '6px 20px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {notice.text} — <span style={{ fontWeight: 700, textDecoration: 'underline' }}>see details</span>
        </div>
      )}

    </div>
  )
}
