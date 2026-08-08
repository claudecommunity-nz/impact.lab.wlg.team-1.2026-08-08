import { useEffect, useState } from 'react'
import { CATEGORIES } from './incidents.js'
import ShareModal from './ShareModal.jsx'
import { overlay } from './styles.js'

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

const SEVERITY = {
  red:    { label: 'High — Take Action', bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
  yellow: { label: 'Medium — Monitor',   bg: '#fef9c3', text: '#854d0e', dot: '#ca8a04' },
}

export default function IncidentPanel({ incident, onClose }) {
  const [sharing, setSharing] = useState(false)

  // Escape closes the share modal first, then the panel.
  useEffect(() => {
    if (!incident) return
    function onKey(e) { if (e.key === 'Escape' && !sharing) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [incident, onClose, sharing])

  useEffect(() => { setSharing(false) }, [incident])

  if (!incident) return null

  const cat = catMap[incident.type]
  const sev = SEVERITY[incident.severity] ?? SEVERITY.yellow

  return (
    <>
    <div style={{
      ...overlay,
      position: 'absolute',
      top: 16,
      right: 16,
      width: 320,
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Colour bar — rounded top corners only */}
      <div style={{
        background: cat.colour,
        height: 4,
        borderRadius: '12px 12px 0 0',
        flexShrink: 0,
      }} />

      <div style={{ overflowY: 'auto', padding: '14px 16px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: cat.colour, marginBottom: 4 }}>
              {cat.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>
              {incident.description}
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 18, color: '#9ca3af', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0,
          }}>×</button>
        </div>

        {/* Severity badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: sev.bg, color: sev.text,
          borderRadius: 6, padding: '4px 10px', marginBottom: 12,
          fontSize: 11, fontWeight: 500,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: sev.dot, display: 'inline-block' }} />
          {sev.label}
        </div>

        {/* Share — the primary action on this panel, in WCC yellow */}
        <button
          onClick={() => setSharing(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            width: '100%', marginBottom: 14,
            background: '#FFDD00', border: 'none', borderRadius: 8,
            padding: '10px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: '#14140f',
            fontFamily: 'inherit',
            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#F2CE00'
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.18)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#FFDD00'
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.12)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Share this alert
        </button>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginBottom: 14 }} />

        <Section label="What's happening">
          <p style={bodyText}>{incident.detail}</p>
        </Section>

        <Section label="What this means for you">
          <p style={bodyText}>{cat.whatThisMeans}</p>
        </Section>

        <Section label="Authoritative sources">
          {cat.sources.map(src => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', fontSize: 12, color: '#1d4ed8',
              textDecoration: 'none', padding: '3px 0', lineHeight: 1.4,
            }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              ↗ {src.label}
            </a>
          ))}
          <p style={{ ...bodyText, marginTop: 10, color: '#9ca3af', fontSize: 11 }}>
            Hazard-planning data only — not an operational emergency source.<br />
            In an emergency call <strong>111</strong>.
          </p>
        </Section>
      </div>
    </div>

    {sharing && <ShareModal incident={incident} onClose={() => setSharing(false)} />}
    </>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const bodyText = {
  margin: 0,
  fontSize: 13,
  color: '#374151',
  lineHeight: 1.6,
}
