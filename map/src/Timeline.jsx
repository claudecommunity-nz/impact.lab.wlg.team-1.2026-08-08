import { useEffect, useRef } from 'react'

const BAR_H   = 26

const DAY_MS  = 86400000
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function drawBar(canvas, win) {
  const W = canvas.width
  const H = canvas.height
  if (!W || !H) return
  const ctx   = canvas.getContext('2d')
  const dpr   = window.devicePixelRatio || 1
  const range = win.end - win.start
  const midY  = H / 2

  // background
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillRect(0, 0, W, H)

  const SIX_H = DAY_MS / 4
  let t = Math.ceil(win.start / SIX_H) * SIX_H

  // first pass — draw all tick lines
  while (t <= win.end) {
    const x    = Math.round((t - win.start) / range * W)
    const date = new Date(t)
    const hour = date.getUTCHours()
    const dom  = date.getUTCDate()
    const isMidnight = hour === 0
    const isNoon     = hour === 12
    const isMajorDay = isMidnight && (dom % 5 === 0 || dom === 1)

    if (isMidnight) {
      ctx.fillStyle = isMajorDay ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'
      ctx.fillRect(x, 0, dpr, H)
    } else if (isNoon) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.fillRect(x, H * 0.35, dpr, H * 0.65)
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(x, H * 0.65, dpr, H * 0.35)
    }
    t += SIX_H
  }

}

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

const PLAY_W = 52

function buildLabels(win) {
  const labels = []
  const range  = win.end - win.start
  const SIX_H  = DAY_MS / 4
  let t = Math.ceil(win.start / SIX_H) * SIX_H
  while (t <= win.end) {
    const date = new Date(t)
    const hour = date.getUTCHours()
    const dom  = date.getUTCDate()
    const pct  = (t - win.start) / range
    if (hour === 0 && (dom % 5 === 0 || dom === 1)) {
      const text = dom === 1
        ? MONTHS[date.getUTCMonth()]
        : `${dom} ${MONTHS[date.getUTCMonth()]}`
      labels.push({ pct, text, major: true })
    }
    t += SIX_H
  }
  return labels
}

export default function Timeline({ currentTime, window: win, playing, onSeek, onTogglePlay }) {
  const canvasRef = useRef(null)
  const wrapRef   = useRef(null)
  const offsetMs  = currentTime - win.end
  const rangeMs   = win.end - win.start
  const pct       = (offsetMs + rangeMs) / rangeMs
  const labels    = buildLabels(win)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const W   = wrap.offsetWidth
    canvas.width        = W * dpr
    canvas.height       = BAR_H * dpr
    canvas.style.width  = `${W}px`
    canvas.style.height = `${BAR_H}px`
    drawBar(canvas, win)
  }, [win])

  return (
    <>
      <style>{`
        .tl-range{-webkit-appearance:none;appearance:none;width:100%;height:${BAR_H}px;background:transparent;cursor:pointer;margin:0;position:absolute;top:0;left:0;}
        .tl-range::-webkit-slider-thumb{-webkit-appearance:none;width:3px;height:${BAR_H}px;background:rgba(0,0,0,0.5);border-radius:1px;cursor:pointer;}
        .tl-range::-moz-range-thumb{width:3px;height:${BAR_H}px;background:rgba(0,0,0,0.5);border-radius:1px;border:none;cursor:pointer;}
        .tl-range::-webkit-slider-runnable-track{background:transparent;height:${BAR_H}px;}
        .tl-range::-moz-range-track{background:transparent;}
      `}</style>

      <div ref={wrapRef} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: BAR_H, zIndex: 10,
        borderTop: '1px solid rgba(0,0,0,0.1)',
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />

        {/* Play button */}
        <button onClick={onTogglePlay} style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: PLAY_W,
          background: 'rgba(255,255,255,0.95)', border: 'none',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          color: '#1f2937', fontSize: 13, cursor: 'pointer', zIndex: 2,
        }}>
          {playing ? '⏸' : '▶'}
        </button>

        {/* Date labels above the bar */}
        <div style={{ position: 'absolute', left: PLAY_W, right: 0, bottom: BAR_H + 2, height: 18, pointerEvents: 'none' }}>
          {labels.map(l => (
            <span key={l.pct} style={{
              position: 'absolute',
              left: `${l.pct * 100}%`,
              fontSize: l.major ? 10 : 9,
              fontFamily: '"Public Sans", system-ui, sans-serif',
              color: l.major ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
              transform: 'translateX(2px)',
            }}>{l.text}</span>
          ))}
        </div>

        {/* Scrubber */}
        <div style={{ position: 'absolute', left: PLAY_W, right: 0, top: 0, bottom: 0, overflow: 'visible' }}>
          <input
            className="tl-range"
            type="range"
            min={-rangeMs} max={0} value={offsetMs}
            onChange={e => onSeek(win.end + Number(e.target.value))}
          />
          {/* Label above thumb */}
          <span style={{
            position: 'absolute',
            left: `${pct * 100}%`,
            bottom: BAR_H + 6,
            transform: pct > 0.85 ? 'translateX(-100%)' : pct > 0.1 ? 'translateX(-50%)' : 'none',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(0,0,0,0.12)',
            color: '#1f2937', fontSize: 11,
            fontFamily: '"Public Sans", system-ui, sans-serif',
            padding: '2px 7px', borderRadius: 4,
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            {formatOffset(offsetMs)}
          </span>
        </div>
      </div>
    </>
  )
}
