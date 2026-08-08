import { useEffect, useMemo, useRef, useState } from 'react'
import { REGIONS, REGIONS_BY_ID, AREAS_BY_ID } from './areas.js'
import { overlay } from './styles.js'
import useIsMobile from './useIsMobile.js'

/**
 * Choose a part of Wellington, then narrow it.
 *
 * Two levels, because they answer different questions. The dropdown offers the
 * seven regions only — "the south coast" is how the problem statement and a
 * resident both talk about this, and a single suburb is a small, easily-missed
 * outline on a city-wide map. Underneath, a checkbox per suburb in the chosen
 * region drops the ones you do not care about. All are on by default, so a
 * region behaves as one area until someone says otherwise.
 *
 * Typing filters the regions. It matches the region's own name, any member
 * suburb, or a postcode prefix — so "khandallah" and "6035" both find Onslow
 * and the northern hills, and the row says which suburb matched. Without that
 * you would need to already know which region your suburb is in, which is
 * exactly what someone searching does not know.
 *
 * The 57 suburbs and 7 regions come from Council's own boundary layer, via
 * prototype-1/scripts/build_suburbs.py. Do not edit areas.js by hand.
 */

const font = "'Public Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

const card = {
  ...overlay,
  fontFamily: font,
  padding: '14px 16px',
  marginBottom: 10,
}

/** Lower case, macrons folded, so "owhiro" matches "Ōwhiro". */
function fold(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Council's spelling -> the display label, which restores macrons. */
function areaOf(suburb) {
  return AREAS_BY_ID[suburb.toLowerCase().replace(/ /g, '-')]
}
function labelOf(suburb) {
  return areaOf(suburb)?.label ?? suburb
}

export default function AreaPicker({
  areaId, onArea, activeSuburbs, onToggleSuburb, onSetAll,
  locationStatus, locationError, outsideCity,
}) {
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const region = REGIONS_BY_ID[areaId]
  const q = query.trim()
  const isPostcode = /^\d+$/.test(q)

  // Each result is a region, plus the member suburb that matched — so a search
  // for "tawa" offers the northern suburbs and says why.
  const results = useMemo(() => {
    if (!q) return REGIONS.map(r => ({ region: r, via: null }))
    const folded = fold(q)

    return REGIONS.map(r => {
      if (!isPostcode && fold(r.label).includes(folded)) return { region: r, via: null }
      const hit = r.suburbs.find(s => {
        const a = areaOf(s)
        return isPostcode
          ? String(a?.postcode ?? '').startsWith(q)
          : fold(s).includes(folded) || (a ? fold(a.label).includes(folded) : false)
      })
      return hit ? { region: r, via: hit } : null
    }).filter(Boolean)
  }, [q, isPostcode])

  useEffect(() => setActive(0), [q])

  useEffect(() => {
    if (!open) return
    // Scroll the list, not the page. scrollIntoView walks up to the nearest
    // scrollable ancestor, and when the dropdown is short enough not to
    // overflow that ancestor is the document — which shunts the whole sidebar
    // down as soon as you press an arrow key.
    const list = listRef.current
    const el = list?.querySelector('[data-active="true"]')
    if (!list || !el) return
    const top = el.offsetTop
    const bottom = top + el.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight
    }
  }, [active, open])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!wrapRef.current?.contains(e.target)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function choose(r) {
    onArea(r.id)
    close()
    inputRef.current?.blur()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(i => (results.length ? (i + step + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      if (open && results[active]) { e.preventDefault(); choose(results[active].region) }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); close() }
    }
  }

  const suburbs = region?.suburbs ?? []
  const allOn = suburbs.length > 0 && suburbs.every(s => activeSuburbs.includes(s))

  return (
    <div ref={wrapRef} style={{ ...card, position: 'relative' }}>
      <label
        htmlFor="map-area-picker"
        style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#14140f' }}
      >
        Which part of Pōneke?
      </label>

      {/* The list hangs off this wrapper, not off the card, so it stays glued
          to the input's bottom edge whatever font size the input is using. */}
      <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        id="map-area-picker"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="map-area-picker-list"
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? query : (region?.label ?? '')}
        placeholder={open ? 'Region, suburb or postcode…' : 'Select region'}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: mobile ? '9px 10px' : '7px 10px', borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.14)', background: '#fff',
          fontFamily: font,
          // 16px on a phone. Anything smaller and iOS Safari zooms the page in
          // on focus, and never zooms it back out.
          fontSize: mobile ? 16 : 12.5,
          fontWeight: 600, color: '#14140f',
          outline: 'none',
        }}
      />

      {open && (
        <ul
          ref={listRef}
          id="map-area-picker-list"
          role="listbox"
          style={{
            position: 'absolute', zIndex: 20,
            top: 'calc(100% + 4px)', left: 0, right: 0,
            maxHeight: mobile ? 240 : 300, overflowY: 'auto',
            listStyle: 'none', margin: 0, padding: '4px 0',
            background: '#fff', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          }}
        >
          {results.length === 0 && (
            <li style={{ padding: '8px 12px', fontSize: 12, color: '#757570' }}>
              {isPostcode
                ? `No Wellington City suburb has a postcode starting ${q}.`
                : `Nothing in Wellington matches “${q}”.`}
            </li>
          )}

          {results.map(({ region: r, via }, i) => {
            const isActive = i === active
            const isCurrent = r.id === areaId
            return (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  data-active={isActive}
                  // mousedown, not click: the input's blur would otherwise close
                  // the list before the click landed.
                  onMouseDown={e => { e.preventDefault(); choose(r) }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: mobile ? '10px 12px' : '6px 12px', border: 'none',
                    background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                    fontFamily: font, cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'flex', justifyContent: 'space-between', gap: 8,
                    fontSize: 12.5,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#0b5cad' : '#3a3a36',
                  }}>
                    <span>{r.label}</span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, color: '#a8a8a2', fontWeight: 600 }}>
                      {r.suburbs.length}
                    </span>
                  </span>
                  {via && (
                    <span style={{ display: 'block', fontSize: 10.5, color: '#757570', marginTop: 1 }}>
                      matches {labelOf(via)}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      </div>

      {/*
        With no region chosen, say what we are doing about it. The picker used
        to open on the south coast whether or not we had located anyone, so a
        refused or failed lookup looked exactly like a correct answer. Saying
        "still looking" or naming the reason is the difference between the map
        knowing where you are and the map guessing.
      */}
      {!region && (
        <p style={{
          margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.35,
          color: locationStatus === 'failed' || outsideCity ? '#a3450c' : '#757570',
        }}>
          {outsideCity
            ? 'You appear to be outside Wellington City. Choose a region above.'
            : locationStatus === 'locating'
              ? 'Finding your region…'
              : locationStatus === 'failed'
                ? `${locationError} Choose a region above.`
                : 'Choose a region above.'}
        </p>
      )}

      {/*
        The suburbs inside the chosen region. Unchecking removes one from the
        outline but does not move the camera — the view stays framed on the
        region so the map does not lurch while you are ticking boxes.
      */}
      {region && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 4,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: '#9a9a94',
            }}>
              {activeSuburbs.length} of {suburbs.length} shown
            </span>
            <button
              type="button"
              onClick={() => onSetAll(!allOn)}
              style={{
                border: 'none', background: 'none', padding: 0,
                fontFamily: font, fontSize: 10.5, fontWeight: 600,
                color: '#0b5cad', cursor: 'pointer',
              }}
            >
              {allOn ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
            {suburbs.map(s => {
              const on = activeSuburbs.includes(s)
              return (
                <label
                  key={s}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    // Long names wrap in a 2-up column at this width
                    // ("Strathmore Park"), so keep wrapped rows tight.
                    fontSize: mobile ? 13.5 : 13, lineHeight: 1.25, cursor: 'pointer',
                    padding: mobile ? '5px 0' : 0,
                    color: on ? '#3a3a36' : 'rgba(0,0,0,0.35)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleSuburb(s)}
                    style={{
                      width: mobile ? 18 : 14, height: mobile ? 18 : 14,
                      margin: 0, flexShrink: 0, accentColor: '#0b5cad', cursor: 'pointer',
                    }}
                  />
                  {labelOf(s)}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
