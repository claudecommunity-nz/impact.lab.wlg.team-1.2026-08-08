import { useEffect, useState } from 'react'
import { CATEGORIES } from './incidents.js'

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// Static mock only — nothing is posted anywhere. The demo point is that an
// alert is shareable with its source and time attached, not the plumbing.
const PLATFORMS = [
  {
    id: 'x', label: 'X', bg: '#000000',
    icon: <path d="M18.9 2.5H22l-7 8 8.2 11H17l-4.6-6.6L7 21.5H3.9l7.5-8.6L3.5 2.5h6.4l4.2 6.1 4.8-6.1Z" />,
  },
  {
    id: 'facebook', label: 'Facebook', bg: '#1877f2',
    icon: <path d="M13.4 22v-8.9h3l.45-3.5h-3.45V7.4c0-1 .28-1.7 1.72-1.7h1.84V2.6c-.32-.04-1.42-.14-2.7-.14-2.67 0-4.5 1.63-4.5 4.63v2.58H6.7v3.5h3.06V22h3.64Z" />,
  },
  {
    id: 'whatsapp', label: 'WhatsApp', bg: '#25d366',
    icon: <path d="M12 2.6a9.4 9.4 0 0 0-8 14.3L2.7 21.4l4.6-1.2A9.4 9.4 0 1 0 12 2.6Zm5.3 13.1c-.24.66-1.2 1.24-1.9 1.34-.5.07-1.15.12-3.3-.75-2.77-1.13-4.55-3.94-4.7-4.13-.13-.19-1.1-1.47-1.1-2.8 0-1.33.7-1.98.95-2.25a1 1 0 0 1 .72-.34h.5c.17 0 .4-.06.6.46l.83 2c.07.14.11.3.02.48-.32.63-.66.6-.5.9.62 1.06 1.24 1.43 2.18 1.9.16.08.26.07.35-.04l.83-.96c.12-.14.25-.1.4-.05l1.86.88c.2.1.32.14.36.22.05.1.05.58-.19 1.24Z" />,
  },
  {
    id: 'messenger', label: 'Messenger', bg: '#a334fa',
    icon: <path d="M12 2.5C6.6 2.5 2.5 6.45 2.5 11.4c0 2.6 1.14 4.86 3 6.42v3.68l3.13-1.72c.83.23 1.72.35 2.65.35 5.4 0 9.5-3.95 9.5-8.9S17.4 2.5 12 2.5Zm5.35 6.85-4.7 4.85-2.4-2.5-4.5 2.5 4.9-5.1 2.4 2.5 4.3-2.25Z" />,
  },
  {
    id: 'email', label: 'Email', bg: '#4b5563',
    icon: <path d="M3 5.5h18c.55 0 1 .45 1 1v11c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1v-11c0-.55.45-1 1-1Zm1.6 2L12 12.7l7.4-5.2H4.6Z" />,
  },
  {
    id: 'sms', label: 'Text', bg: '#0ea5e9',
    icon: <path d="M4 3h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H9.4L4.8 20.6A.6.6 0 0 1 4 20v-3H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2Zm3.5 8a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm4.5 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm4.5 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" />,
  },
]

export default function ShareModal({ incident, onClose }) {
  const [hovered, setHovered] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!incident) return null

  const cat = catMap[incident.type]
  const when = new Date(incident.timestamp).toLocaleTimeString('en-NZ', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
  const link = `https://wlg-conditions.nz/alert/${incident.type}-${Math.round(-incident.lat * 1e4)}${Math.round(incident.lng * 1e4)}`

  function copyLink() {
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 14,
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 380, maxWidth: '100%',
          // A short landscape phone cannot fit the card; let it scroll rather
          // than clipping the copy-link row off the bottom.
          maxHeight: '100%', overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ background: cat.colour, height: 4 }} />

        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Share this alert</div>
            <button onClick={onClose} style={{
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 20, color: '#9ca3af', lineHeight: 1, padding: 0,
            }}>×</button>
          </div>

          {/* Preview of what gets shared */}
          <div style={{
            border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10,
            padding: '11px 12px', marginBottom: 16, background: '#fafafa',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: cat.colour, marginBottom: 4,
            }}>{cat.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>
              {incident.description}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
              Reported {when} · Wellington conditions map
            </div>
          </div>

          {/* Platform tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  border: 'none', background: 'none', cursor: 'pointer',
                  padding: '8px 0', borderRadius: 8,
                  fontFamily: 'inherit',
                  transform: hovered === p.id ? 'translateY(-2px)' : 'none',
                  transition: 'transform 0.12s',
                }}
              >
                <span style={{
                  width: 42, height: 42, borderRadius: '50%', background: p.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: hovered === p.id ? '0 4px 12px rgba(0,0,0,0.22)' : '0 1px 3px rgba(0,0,0,0.15)',
                  transition: 'box-shadow 0.12s',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">{p.icon}</svg>
                </span>
                <span style={{ fontSize: 11, color: '#4b5563' }}>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Copy link */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
            padding: '6px 6px 6px 11px',
          }}>
            <span style={{
              flex: 1, fontSize: 11.5, color: '#6b7280',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{link}</span>
            <button onClick={copyLink} style={{
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: copied ? '#dcfce7' : '#111827',
              color: copied ? '#166534' : '#fff',
              fontSize: 11.5, fontWeight: 500, padding: '6px 12px',
              fontFamily: 'inherit', flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}>{copied ? 'Copied' : 'Copy link'}</button>
          </div>

          <p style={{ margin: '12px 0 0', fontSize: 10.5, color: '#9ca3af', lineHeight: 1.5 }}>
            Mock-up — nothing is posted. Shared alerts would carry their source and
            time, and stay labelled as a community report until Council confirms it.
          </p>
        </div>
      </div>
    </div>
  )
}
