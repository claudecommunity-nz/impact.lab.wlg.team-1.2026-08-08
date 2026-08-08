const fmt = new Intl.DateTimeFormat('en-NZ', {
  hour: '2-digit', minute: '2-digit', hour12: false,
  timeZone: 'Pacific/Auckland',
})

export default function Timeline({ currentTime, window: win, playing, onSeek, onTogglePlay }) {
  const pct = ((currentTime - win.start) / (win.end - win.start)) * 100

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
        min={win.start}
        max={win.end}
        value={currentTime}
        onChange={e => onSeek(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#fff', cursor: 'pointer', height: 3 }}
      />

      <span style={{
        color: '#fff', fontSize: 12, fontFamily: 'monospace',
        opacity: 0.85, flexShrink: 0, letterSpacing: '0.05em',
      }}>
        {fmt.format(new Date(currentTime))}
      </span>
    </div>
  )
}
