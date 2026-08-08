import useIsMobile from './useIsMobile.js'

const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export default function Header({ notice, onNoticeClick }) {
  const mobile = useIsMobile()

  return (
    <div style={{ fontFamily: font, flexShrink: 0 }}>
      <div style={{
        background: '#000', color: '#fff',
        padding: mobile ? '8px 14px' : '10px 28px',
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        alignItems: mobile ? 'flex-start' : 'center',
        gap: mobile ? 6 : 20,
      }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: mobile ? 26 : 30, height: mobile ? 26 : 30, borderRadius: 5,
            background: '#FFDD00', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: mobile ? 13 : 14, color: '#000',
            flexShrink: 0,
          }}>W</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: mobile ? 13 : 14 }}>Wellington City Council</div>
            <div style={{ fontSize: mobile ? 10.5 : 11, color: '#c9c9c6' }}>Te Kaunihera o Pōneke</div>
          </div>
        </div>

        {/* Divider — the two blocks stack on a phone, so there is nothing to divide */}
        {!mobile && <div style={{ width: 1, height: 28, background: '#3a3a38', flexShrink: 0 }} />}

        {/* Title. The descriptor is the first thing to go on a narrow screen —
            it explains what the page is, which the page itself already shows. */}
        <div>
          <div style={{ fontWeight: 700, fontSize: mobile ? 13.5 : 15 }}>
            Kia ora, local alerts &amp; weather
          </div>
          {!mobile && (
            <div style={{ fontSize: 11, color: '#c9c9c6' }}>
              Live hazard and weather information for your part of Pōneke | Wellington City.
            </div>
          )}
        </div>
      </div>

      {/* Notice bar — the one thing that survives every screen size */}
      {notice && (
        <div
          onClick={onNoticeClick}
          style={{
            background: notice.level === 'clear' ? '#d1fae5' : '#FFDD00',
            color: '#14140f',
            fontSize: mobile ? 11.5 : 12.5, fontWeight: 600, textAlign: 'center',
            padding: mobile ? '6px 12px' : '6px 20px',
            lineHeight: 1.35,
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
