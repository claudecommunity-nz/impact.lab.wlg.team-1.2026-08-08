import { useState } from 'react';
import { AREA_GROUPS, areaFor } from '@/lib/areas';
import { EMPTY_PROFILE, type Corridor, type Profile, type Role, type Travel } from '@/lib/relevance';

const SOUTH_COAST = AREA_GROUPS.find((g) => g.region === 'South coast')?.areas ?? [];
const ELSEWHERE_GROUPS = AREA_GROUPS.filter((g) => g.region !== 'South coast');

/**
 * Four questions, no login, skippable.
 *
 * Question one offers a "use my location" button but never calls geolocation on
 * load — an unexpected permission prompt is both rude and, on a projector at
 * half past four, a lost twenty seconds.
 */

const ROLE_OPTIONS: { id: Role; label: string; hint: string }[] = [
  { id: 'kids', label: 'Kids at school or childcare', hint: 'School runs and pickups' },
  { id: 'commute', label: 'I commute', hint: 'Across the region or into town' },
  { id: 'business', label: 'A business, staff or stock', hint: 'Premises and deliveries' },
  { id: 'home', label: 'A home here', hint: 'Yours or someone else’s' },
];

const CORRIDORS: { id: Corridor; label: string }[] = [
  { id: 'none', label: 'I stay local' },
  { id: 'hutt', label: 'Hutt Valley' },
  { id: 'porirua_kapiti', label: 'Porirua or Kāpiti' },
  { id: 'wairarapa', label: 'Wairarapa' },
  { id: 'south_coast', label: 'Around the south coast' },
];

const TRAVEL: { id: Travel; label: string }[] = [
  { id: 'foot_bus', label: 'On foot or by bus' },
  { id: 'car', label: 'By car' },
  { id: 'both', label: 'Both' },
];

export function ProfileWizard({
  initial,
  onSave,
  onSkip,
}: {
  initial: Profile | null;
  onSave: (p: Profile) => void;
  onSkip: () => void;
}) {
  const [p, setP] = useState<Profile>(initial ?? EMPTY_PROFILE);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const toggleRole = (r: Role) =>
    setP((prev) => ({
      ...prev,
      roles: prev.roles.includes(r) ? prev.roles.filter((x) => x !== r) : [...prev.roles, r],
    }));

  const useMyLocation = () => {
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // The area whose BOUNDARY contains the point, not the nearest centre.
        // With every suburb listed, nearest-centre gets this wrong often: a
        // point can sit well inside Brooklyn and still be closer to the centre
        // of small, dense Vogeltown next door.
        //
        // The coordinates are used here and discarded. Only the area id is
        // ever stored, and it never leaves this browser.
        const { latitude, longitude } = pos.coords;
        const id = areaFor(longitude, latitude);
        if (id) {
          setP((prev) => ({ ...prev, area: id }));
          setLocating(false);
        } else {
          setLocateError(
            'That looks like it is outside Wellington. Pick an area from the list instead.',
          );
          setLocating(false);
        }
      },
      (err) => {
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'No problem — pick an area from the list instead.'
            : 'Could not get a location. Pick an area from the list instead.',
        );
        setLocating(false);
      },
      { timeout: 8000, maximumAge: 300_000 },
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-3">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">
          Four questions, so this shows you what matters
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Your answers stay in this browser. Nothing here is sent to a server —
          there is no account and nothing to sign in to.
        </p>

        {/* 1 */}
        <Section n={1} title="Which part of the coast matters most to you today?">
          {/*
            The south coast as chips, because that is what this prototype is
            about and a resident of Ōwhiro Bay should not have to open a menu.
            The other 46 suburbs sit behind the select below — as chips they
            would make this modal several screens tall and bury the question.
          */}
          <div className="grid grid-cols-2 gap-1.5">
            {SOUTH_COAST.map((a) => (
              <button
                key={a.id}
                onClick={() => setP({ ...p, area: a.id })}
                className={chip(p.area === a.id)}
              >
                <span className="font-semibold">{a.label}</span>
                {a.blurb && (
                  <span className="block text-[10px] font-normal opacity-70">{a.blurb}</span>
                )}
              </button>
            ))}
          </div>

          <label className="mt-2 block text-[11px] text-slate-600">
            <span className="font-medium">Somewhere else in Wellington</span>
            <select
              value={SOUTH_COAST.some((a) => a.id === p.area) ? '' : p.area}
              onChange={(e) => e.target.value && setP({ ...p, area: e.target.value })}
              className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="">Choose a suburb…</option>
              {ELSEWHERE_GROUPS.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="mt-2 text-xs font-medium text-council underline disabled:opacity-50"
          >
            {locating ? 'Finding you…' : 'Or use my location'}
          </button>
          {locateError && <p className="mt-1 text-xs text-slate-600">{locateError}</p>}
        </Section>

        {/* 2 */}
        <Section n={2} title="What are you responsible for today?">
          <div className="grid grid-cols-2 gap-1.5">
            {ROLE_OPTIONS.map((r) => (
              <button key={r.id} onClick={() => toggleRole(r.id)} className={chip(p.roles.includes(r.id))}>
                <span className="font-semibold">{r.label}</span>
                <span className="block text-[10px] font-normal opacity-70">{r.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Choose as many as apply, or none.</p>
        </Section>

        {/* 3 — only worth asking if they said they commute */}
        {p.roles.includes('commute') && (
          <Section n={3} title="Where do you travel on a normal day?">
            <div className="flex flex-wrap gap-1.5">
              {CORRIDORS.map((c) => (
                <button key={c.id} onClick={() => setP({ ...p, corridor: c.id })} className={chip(p.corridor === c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section n={p.roles.includes('commute') ? 4 : 3} title="How will you get around?">
          <div className="flex flex-wrap gap-1.5">
            {TRAVEL.map((t) => (
              <button key={t.id} onClick={() => setP({ ...p, travel: t.id })} className={chip(p.travel === t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        {/* The one that changes the most */}
        <Section
          n={p.roles.includes('commute') ? 5 : 4}
          title="Does anyone you are responsible for need mains power, or step-free access?"
        >
          <div className="flex gap-1.5">
            <button onClick={() => setP({ ...p, dependency: true })} className={chip(p.dependency)}>
              Yes
            </button>
            <button onClick={() => setP({ ...p, dependency: false })} className={chip(!p.dependency)}>
              No
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            If yes, power cuts and severe warnings are moved to the top and you
            get the nearest emergency hub.
          </p>
        </Section>

        <div className="mt-5 flex items-center gap-2 border-t border-slate-200 pt-3">
          <button
            onClick={() => onSave(p)}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Show me what matters
          </button>
          <button onClick={onSkip} className="text-xs font-medium text-slate-500 underline">
            Skip — show me everything
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-sm font-semibold text-slate-900">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">
          {n}
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}

function chip(active: boolean): string {
  return [
    'rounded border px-2.5 py-1.5 text-left text-xs transition',
    active
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
  ].join(' ');
}
