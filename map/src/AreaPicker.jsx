import { useEffect, useMemo, useRef, useState } from 'react'
import { AREA_GROUPS, AREAS_BY_ID } from './areas.js'
import { overlay } from './styles.js'

/**
 * Choose a Wellington suburb, by name or postcode.
 *
 * The 57 suburbs come from Council's own boundary layer, generated into
 * areas.js by prototype-1/scripts/build_suburbs.py. Static here on purpose:
 * this app only needs to name an area and move the camera to it, so it carries
 * the centres and not the 109 KB of boundary rings.
 *
 * Typing filters. Text matches the suburb name, case- and macron-insensitive,
 * so "owhiro" finds Ōwhiro Bay — almost nobody types the macron. All digits
 * search postcodes as a prefix, since no Wellington suburb has a number in its
 * name.
 *
 * Postcodes are not unique — 6021 covers eight suburbs and 6022 covers ten — so
 * the code is shown against every row. Otherwise someone who typed 6021 and got
 * eight unfamiliar names would have no idea why.
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
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function AreaPicker({ areaId, onArea }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const current = AREAS_BY_ID[areaId]
  const q = query.trim()
  const isPostcode = /^\d+$/.test(q)

  const groups = useMemo(() => {
    if (!q) return AREA_GROUPS
    const folded = fold(q)
    const match = a => isPostcode
      ? String(a.postcode).startsWith(q)
      : fold(a.label).includes(folded) || fold(a.suburb).includes(folded)
    return AREA_GROUPS
      .map(g => ({ region: g.region, areas: g.areas.filter(match) }))
      .filter(g => g.areas.length > 0)
  }, [q, isPostcode])

  const flat = useMemo(() => groups.flatMap(g => g.areas), [groups])

  useEffect(() => setActive(0), [q])

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return
    // Scroll the LIST, not the page. scrollIntoView walks up to the nearest
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

  function choose(a) {
    onArea(a.id)
    close()
    inputRef.current?.blur()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(i => (flat.length ? (i + step + flat.length) % flat.length : 0))
    } else if (e.key === 'Enter') {
      if (open && flat[active]) { e.preventDefault(); choose(flat[active]) }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); close() }
    }
  }

  return (
    <div ref={wrapRef} style={{ ...card, position: 'relative' }}>
      <label
        htmlFor="map-area-picker"
        style={{
          display: 'block', fontWeight: 700, fontSize: 13,
          marginBottom: 8, color: '#14140f',
        }}
      >
        Which part of Pōneke?
      </label>

      <input
        ref={inputRef}
        id="map-area-picker"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="map-area-picker-list"
        aria-autocomplete="list"
        autoComplete="off"
        // Shows the chosen suburb until opened, then becomes a search field —
        // otherwise the panel would read as an empty box and stop telling you
        // which area you are looking at.
        value={open ? query : (current?.label ?? '')}
        placeholder={open ? 'Suburb or postcode…' : 'Choose an area'}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '7px 10px',
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.14)',
          background: '#fff',
          fontFamily: font, fontSize: 12.5, fontWeight: 600,
          color: '#14140f',
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
            top: '100%', left: 0, right: 0, marginTop: 4,
            maxHeight: 300, overflowY: 'auto',
            listStyle: 'none', margin: 0, padding: '4px 0',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          }}
        >
          {flat.length === 0 && (
            <li style={{ padding: '8px 12px', fontSize: 12, color: '#757570' }}>
              {isPostcode
                ? `No Wellington City suburb has a postcode starting ${q}.`
                : `No Wellington suburb matches “${q}”.`}
            </li>
          )}

          {groups.map(g => (
            <li key={g.region}>
              <div style={{
                padding: '6px 12px 2px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: '#9a9a94',
              }}>
                {g.region}
              </div>
              <ul role="group" aria-label={g.region} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.areas.map(a => {
                  const i = flat.indexOf(a)
                  const isActive = i === active
                  const isCurrent = a.id === areaId
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        data-active={isActive}
                        // mousedown, not click: the input's blur would
                        // otherwise close the list before the click landed.
                        onMouseDown={e => { e.preventDefault(); choose(a) }}
                        onMouseEnter={() => setActive(i)}
                        style={{
                          display: 'flex', alignItems: 'baseline',
                          justifyContent: 'space-between', gap: 8,
                          width: '100%', textAlign: 'left',
                          padding: '5px 12px',
                          border: 'none',
                          background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                          fontFamily: font, fontSize: 12.5,
                          fontWeight: isCurrent ? 700 : 400,
                          color: isCurrent ? '#0b5cad' : '#3a3a36',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{a.label}</span>
                        <span style={{
                          flexShrink: 0, fontSize: 10.5,
                          fontVariantNumeric: 'tabular-nums',
                          color: isPostcode ? '#55554f' : '#a8a8a2',
                          fontWeight: isPostcode ? 700 : 400,
                        }}>
                          {a.postcode}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
