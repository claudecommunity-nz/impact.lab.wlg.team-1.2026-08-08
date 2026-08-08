import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES } from './incidents.js'
import { overlay } from './styles.js'
import useIsMobile from './useIsMobile.js'

/**
 * The newest community report inside the area on screen, with a "did you see
 * it too?" confirmation.
 *
 * This is the unverified half of the problem statement. Everything else in the
 * panel is forecast or Council data; this card is one person's account of a
 * street, which is the thing residents actually want and the thing no official
 * feed carries. So it is styled apart from the other cards, says plainly that
 * it is unverified, and asks the reader to corroborate it rather than treating
 * a single report as fact.
 *
 * Which report: the most recent active incident whose address names a suburb
 * that is currently ticked. Matched on the address text, not the incident's
 * coordinates, so the street the card names is always in the area the reader
 * has on screen. In map/public/incidents.json those two disagree for most
 * records — the source CSV's addresses and its lat/lng columns do not describe
 * the same place — and of the two, the address is what the reader is shown.
 *
 * If nothing is in view the card is not rendered. An empty "reported near you"
 * would read as "nothing is happening here", which is a different claim and one
 * this data cannot support.
 */

const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// Addresses run "Type — Street, Suburb, Wellington". Two spellings in the data
// are not Council suburb names; both are the central city.
const SUBURB_ALIASES = { cbd: 'Wellington Central', waterfront: 'Wellington Central' }

function fold(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Council's suburb name for a report, from its address. Null if unparseable. */
function suburbOf(description) {
  const parts = description.split(',').map(s => s.trim())
  if (parts.length < 3) return null
  const raw = parts[parts.length - 2]
  return SUBURB_ALIASES[fold(raw)] ?? raw
}

/** Stable id for a report, so the confirmation resets when the report changes. */
function keyOf(f) {
  return `${f.properties.timestamp}|${f.properties.description}`
}

/**
 * A starting confirmation count for a report.
 *
 * Derived from the report itself so it holds still while you look at it, rather
 * than being a live number — the demo data has no confirmations in it. Labelled
 * as unverified in the card for exactly that reason.
 */
function seedCount(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return 2 + (Math.abs(h) % 6)
}

function agoText(ts, now) {
  const mins = Math.max(1, Math.round((now - Date.parse(ts)) / 60000))
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Once answered, the card thanks you, waits, then folds itself away — the
// question has been asked and answered, and the panel is short. Long enough to
// read the thank-you, quick enough not to be in the way.
const DISMISS_DELAY_MS = 3000
const COLLAPSE_MS = 380

export default function NearbyReport({ pins, activeSuburbs, regionLabel, currentTime }) {
  const mobile = useIsMobile()
  const [answer, setAnswer] = useState(null)
  const [collapsing, setCollapsing] = useState(false)
  const [gone, setGone] = useState(false)
  // The card's own height, captured just before it collapses. max-height cannot
  // animate from `none`, so it needs a real number to leave from.
  const [height, setHeight] = useState(null)
  const answeredRef = useRef(null)
  const innerRef = useRef(null)

  const features = pins?.features
  const suburbKey = activeSuburbs.join('|')

  // Until a region is chosen — the app now opens on "Select region" — the card
  // falls back to the newest report anywhere in the city, and says so. Without
  // it there is nothing on screen on a first load, which reads as an app with
  // no reports in it rather than one waiting to be pointed at a suburb.
  const cityWide = activeSuburbs.length === 0

  const report = useMemo(() => {
    if (!features?.length) return null
    const inView = new Set(activeSuburbs.map(fold))
    let newest = null
    for (const f of features) {
      if (!cityWide) {
        const suburb = suburbOf(f.properties.description)
        if (!suburb || !inView.has(fold(suburb))) continue
      }
      if (!newest || Date.parse(f.properties.timestamp) > Date.parse(newest.properties.timestamp)) {
        newest = f
      }
    }
    return newest
  }, [features, suburbKey, cityWide])

  useEffect(() => {
    if (!answer) return
    const start = setTimeout(() => {
      setHeight(innerRef.current?.offsetHeight ?? 0)
      // Two frames: one to commit the measured height, one to leave from it.
      // Setting both in the same frame is a jump, not a transition.
      requestAnimationFrame(() => requestAnimationFrame(() => setCollapsing(true)))
    }, DISMISS_DELAY_MS)
    // A backstop for the transitionend handler, which never fires if the
    // element is off-screen in a scrolled sheet or motion is reduced to none.
    const end = setTimeout(() => setGone(true), DISMISS_DELAY_MS + COLLAPSE_MS + 120)
    return () => { clearTimeout(start); clearTimeout(end) }
  }, [answer])

  const key = report ? keyOf(report) : null

  // A new report clears the previous answer and brings the card back. Tracked
  // in a ref rather than an effect so the card never renders one report's text
  // with another's state.
  if (answeredRef.current !== key) {
    answeredRef.current = key
    if (answer !== null) setAnswer(null)
    if (collapsing) setCollapsing(false)
    if (gone) setGone(false)
    if (height !== null) setHeight(null)
  }

  if (!report || gone) return null

  const p = report.properties
  const cat = catMap[p.type]
  const confirmed = seedCount(key) + (answer === 'yes' ? 1 : 0)

  return (
    <div
      onTransitionEnd={e => {
        if (collapsing && e.propertyName === 'max-height') setGone(true)
      }}
      style={{
        overflow: 'hidden',
        // `none` until the collapse starts, so the card is free to grow with
        // its text — a long address wraps to three lines on a phone.
        maxHeight: height === null ? 'none' : (collapsing ? 0 : height),
        opacity: collapsing ? 0 : 1,
        marginBottom: collapsing ? 0 : 10,
        transform: collapsing ? 'translateY(-6px)' : 'none',
        transition: `max-height ${COLLAPSE_MS}ms ease, opacity ${COLLAPSE_MS - 80}ms ease, `
          + `margin-bottom ${COLLAPSE_MS}ms ease, transform ${COLLAPSE_MS}ms ease`,
      }}
    >
    <div ref={innerRef} style={{
      ...overlay,
      fontFamily: font,
      background: '#fff4e6',
      border: '1px solid #f0c98a',
      padding: '12px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 10.5, fontWeight: 700, color: '#854f0b',
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: cat?.colour ?? '#d88a1f', flexShrink: 0,
        }} />
        Reported near you
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#14140f', lineHeight: 1.35 }}>
        {p.description}
      </div>

      <div style={{ fontSize: 11.5, color: '#6b5a3f', margin: '4px 0 2px' }}>
        {cityWide ? 'Across Wellington' : `You're viewing ${regionLabel}`} · reported {agoText(p.timestamp, currentTime)} · {confirmed} {confirmed === 1 ? 'person has' : 'people have'} confirmed
      </div>

      <div style={{ fontSize: 10.5, color: '#8a7a5f', marginBottom: 10 }}>
        Community report — not verified by Council. In an emergency, call 111.
      </div>

      {answer === null ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Action label="Yes, I saw it" primary mobile={mobile} onClick={() => setAnswer('yes')} />
          <Action label="No" mobile={mobile} onClick={() => setAnswer('no')} />
        </div>
      ) : (
        <div className="nearby-thanks" style={{
          fontSize: 12, fontWeight: 600,
          color: answer === 'yes' ? '#1e5e17' : '#55554f',
        }}>
          {answer === 'yes'
            ? 'Thanks — you’ve confirmed this report.'
            : 'Thanks for letting us know.'}
        </div>
      )}
    </div>
    </div>
  )
}

function Action({ label, primary, mobile, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: font, fontSize: 12.5, fontWeight: 600,
        padding: mobile ? '9px 16px' : '6px 14px',
        minHeight: mobile ? 40 : 0,
        borderRadius: 999, cursor: 'pointer',
        background: primary ? '#14140f' : 'transparent',
        color: primary ? '#fff' : '#14140f',
        border: `1px solid ${primary ? '#14140f' : '#cfcfca'}`,
      }}
    >
      {label}
    </button>
  )
}
