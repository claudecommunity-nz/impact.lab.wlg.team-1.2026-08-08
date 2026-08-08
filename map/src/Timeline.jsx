function formatOffset(ms) {
  if (ms >= 0) return 'now'
  const abs = Math.abs(ms)
  const d = Math.floor(abs / 86400000)
  const h = Math.floor((abs % 86400000) / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  if (d > 0) return h > 0 ? `${d}d ${h}h ago` : `${d}d ago`
  if (h > 0) return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
  return `${m}m ago`
}

export default function Timeline({ currentTime, window: win, playing, onSeek, onTogglePlay }) {
  const offsetMs = currentTime - win.end   // 0 = now, negative = past
  const rangeMs  = win.end - win.start     // total span in ms

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(0,0,0,0.52)',
      borderRadius: 20,
      padding: '7px 14px',
      zIndex: 10,
      minWidth: 320,
      maxWidth: 520,
      width: '50vw',
      fontFamily: "'Roboto', sans-serif",
    }}>
      <button onClick={onTogglePlay} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#fff', fontSize: 14, lineHeight: 1,
        padding: 0, flexShrink: 0, opacity: 0.9,
      }}>
        {playing ? '⏸' : '▶'}
      </button>

      <input
        type="range"
        min={-rangeMs}
        max={0}
        value={offsetMs}
        onChange={e => onSeek(win.end + Number(e.target.value))}
        style={{ flex: 1, accentColor: '#fff', cursor: 'pointer', height: 3 }}
      />

      <span style={{
        color: '#fff', fontSize: 12, fontFamily: 'monospace',
        opacity: 0.85, flexShrink: 0, letterSpacing: '0.04em', width: 84, textAlign: 'right', whiteSpace: 'nowrap',
      }}>
        {formatOffset(offsetMs)}
      </span>
    </div>
  )
}
