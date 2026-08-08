import { useEffect, useMemo, useRef, useState } from 'react';
import { AREA_GROUPS, AREAS_BY_ID, type Area } from '@/lib/areas';

/**
 * Area chooser with a type-to-filter box.
 *
 * A native select was fine at six options and is not at fifty-eight. Someone in
 * Khandallah should not scroll past the whole south coast to find their own
 * suburb, and on a phone a fifty-eight row native picker is worse again.
 *
 * The grouping stays. It is what makes the list readable when nothing is typed,
 * and it keeps the south coast — the actual subject of this prototype — at the
 * top rather than alphabetised between Rongotai and Southgate.
 *
 * Matching is a plain case- and macron-insensitive substring, over both the
 * label and Council's own spelling. "owhiro" finds Ōwhiro Bay, which matters
 * because almost nobody types the macron, and "khan" finds Khandallah on four
 * keystrokes. Deliberately not fuzzy: with a fixed list of 57 real place names
 * a typo-tolerant match mostly produces confident wrong answers.
 *
 * Digits search the postcode instead, because that is the only thing they can
 * mean here — no Wellington suburb has a number in its name. A postcode is a
 * prefix match, so "60" narrows and "6023" lands on the six south coast
 * suburbs.
 *
 * Postcodes are NOT unique: 6021 covers eight suburbs from Aro Valley to
 * Vogeltown, and 6022 covers ten. So a postcode search returns a short list to
 * choose from rather than jumping straight to one answer, and the code is shown
 * against every row — otherwise a resident who typed 6021 and got eight
 * unfamiliar names would have no idea why.
 */
export function AreaPicker({
  areaId,
  onArea,
  id = 'area-picker',
}: {
  areaId: string;
  onArea: (id: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const current = AREAS_BY_ID[areaId];

  /** Lower case, macrons folded, so "owhiro" matches "Ōwhiro". */
  const fold = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const q = query.trim();
  /** All digits: the only thing a number can mean here is a postcode. */
  const isPostcode = /^\d+$/.test(q);

  const groups = useMemo(() => {
    if (!q) return AREA_GROUPS;
    const folded = fold(q);
    const match = (a: Area) =>
      isPostcode
        ? String(a.postcode ?? '').startsWith(q)
        : fold(a.label).includes(folded) || (a.suburb ? fold(a.suburb).includes(folded) : false);

    return AREA_GROUPS.map((g) => ({
      region: g.region,
      areas: g.areas.filter(match),
    })).filter((g) => g.areas.length > 0);
  }, [q, isPostcode]);

  /** The visible options, flattened, so the arrow keys can walk them. */
  const flat: Area[] = useMemo(() => groups.flatMap((g) => g.areas), [groups]);

  useEffect(() => setActive(0), [q]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    // Scroll the LIST, not the page. scrollIntoView walks up to the nearest
    // scrollable ancestor, and when the dropdown is short enough not to
    // overflow that ancestor is the document — which shunts the whole sidebar
    // down as soon as you press an arrow key.
    const list = listRef.current;
    const el = list?.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!list || !el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function choose(a: Area) {
    onArea(a.id);
    close();
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (flat.length ? (i + step + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      if (open && flat[active]) { e.preventDefault(); choose(flat[active]); }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); close(); }
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        // Shows the chosen area until the box is opened, then becomes a search
        // field. Without this the header would read as an empty text box and
        // stop telling you which area you are looking at.
        value={open ? query : current?.label ?? ''}
        placeholder={open ? 'Suburb or postcode…' : 'Choose an area'}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-44 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900 focus:border-council focus:outline-none focus:ring-1 focus:ring-council"
      />

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          className="absolute right-0 z-30 mt-1 max-h-80 w-64 overflow-y-auto rounded border border-slate-300 bg-white py-1 shadow-lg"
        >
          {flat.length === 0 && (
            <li className="px-2.5 py-2 text-xs text-slate-500">
              {isPostcode
                ? `No Wellington City suburb has a postcode starting ${q}.`
                : `No Wellington suburb matches “${q}”.`}
            </li>
          )}

          {groups.map((g) => (
            <li key={g.region}>
              <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {g.region}
              </div>
              <ul role="group" aria-label={g.region}>
                {g.areas.map((a) => {
                  const i = flat.indexOf(a);
                  const isActive = i === active;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={a.id === areaId}
                        data-active={isActive}
                        // mousedown, not click: the input's blur would otherwise
                        // close the list before the click landed.
                        onMouseDown={(e) => { e.preventDefault(); choose(a); }}
                        onMouseEnter={() => setActive(i)}
                        className={[
                          'flex w-full items-baseline justify-between gap-2 px-2.5 py-1 text-left text-xs',
                          isActive ? 'bg-slate-100' : '',
                          a.id === areaId ? 'font-semibold text-council' : 'text-slate-700',
                        ].join(' ')}
                      >
                        <span>{a.label}</span>
                        {a.postcode !== null && (
                          <span
                            className={[
                              'shrink-0 text-[10px] tabular-nums',
                              isPostcode ? 'font-semibold text-slate-600' : 'text-slate-400',
                            ].join(' ')}
                          >
                            {a.postcode}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
