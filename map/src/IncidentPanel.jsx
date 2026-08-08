import { useEffect } from 'react'
import { CATEGORIES } from './incidents.js'

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

const SEVERITY = {
  red:    { label: 'High — Take Action',  bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
  yellow: { label: 'Medium — Monitor',    bg: '#fef9c3', text: '#854d0e', dot: '#ca8a04' },
}

export default function IncidentPanel({ incident, onClose }) {
  useEffect(() => {
    if (!incident) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [incident, onClose])

  if (!incident) return null

  const cat = catMap[incident.type]
  const sev = SEVERITY[incident.severity] ?? SEVERITY.yellow

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 340,
      background: '#fff',
      boxShadow: '-2px 0 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      fontFamily: "'Roboto', sans-serif",
      overflowY: 'auto',
    }}>
      {/* Colour bar */}
      <div style={{ background: cat.colour, height: 6, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: cat.colour, marginBottom: 4 }}>
              {cat.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>
              {incident.description}
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 20, color: '#9ca3af', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0,
          }}>×</button>
        </div>

        {/* Severity badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: sev.bg, color: sev.text,
          borderRadius: 4, padding: '4px 10px', marginTop: 12,
          fontSize: 12, fontWeight: 500,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sev.dot, display: 'inline-block' }} />
          {sev.label}
        </div>
      </div>

      <div style={{ height: 1, background: '#f3f4f6', margin: '16px 0 0' }} />

      {/* Detail */}
      <div style={{ padding: '14px 16px 0' }}>
        <Section label="What's happening">
          <p style={bodyText}>{incident.detail}</p>
        </Section>

        <Section label="What this means for you">
          <p style={bodyText}>{cat.whatThisMeans}</p>
        </Section>

        <Section label="Authoritative sources">
          {cat.sources.map(src => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', fontSize: 13, color: '#1d4ed8',
              textDecoration: 'none', padding: '4px 0', lineHeight: 1.4,
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
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>
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
