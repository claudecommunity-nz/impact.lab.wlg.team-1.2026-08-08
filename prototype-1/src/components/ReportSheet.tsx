import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deviceId } from '@/hooks/useProfile';
import { AREAS_BY_ID } from '@/lib/areas';

/**
 * Submitting a report.
 *
 * The form is explicit that what gets posted is unverified and public, before
 * the person posts it rather than after. Nothing here asks for a name, contact
 * detail or address, and the form says so — a prototype that quietly collected
 * personal information while lecturing about trust would be a poor showing.
 */

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'waves_over_road', label: 'Waves over the road' },
  { id: 'surface_flooding', label: 'Surface flooding' },
  { id: 'road_blocked', label: 'Road blocked' },
  { id: 'slip', label: 'Slip or bank collapse' },
  { id: 'debris', label: 'Debris on the road' },
  { id: 'access_unsafe', label: 'Access unsafe on foot' },
  { id: 'wind_damage', label: 'Wind damage' },
  { id: 'power_out', label: 'Power out' },
  { id: 'all_clear', label: 'All clear again' },
];

export function ReportSheet({
  areaId,
  onClose,
  onSubmitted,
}: {
  areaId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const area = AREAS_BY_ID[areaId] ?? AREAS_BY_ID['island-bay'];
  const [category, setCategory] = useState('waves_over_road');
  const [headline, setHeadline] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    const { error: err } = await supabase.from('community_reports').insert({
      device_id: deviceId(),
      category,
      headline: headline.trim(),
      detail: detail.trim() || null,
      // Centred on the chosen area. A draggable pin is the obvious next step;
      // for now the area is the resolution the personalisation uses anyway.
      lng: area.centre[0],
      lat: area.centre[1],
      area_hint: area.id,
      // status and is_seed are deliberately absent — anon holds no column
      // privilege on them, so a report cannot be born as anything but
      // unverified. Sending them would be rejected by Postgres.
    });

    setBusy(false);
    if (err) {
      setError(
        err.message.includes('Too many reports')
          ? 'That is five reports in ten minutes from this browser. Give it a few minutes.'
          : err.message,
      );
      return;
    }
    onSubmitted();
    onClose();
  };

  const valid = headline.trim().length >= 3 && headline.trim().length <= 120;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-lg bg-white p-4 shadow-2xl sm:rounded-lg">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Report what you can see
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {/* Said before they post, not after. */}
        <div className="mt-2 rounded border border-dashed border-community bg-community-soft p-2">
          <p className="text-xs font-semibold text-community">
            This will appear publicly, marked UNVERIFIED.
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700">
            Council will not have checked it. It will never be shown as official
            advice, and it cannot outrank an official warning. Please do not
            include names, addresses or anything identifying.
          </p>
        </div>

        <label className="mt-3 block text-xs font-semibold text-slate-700">
          What are you seeing?
        </label>
        <div className="mt-1 flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={[
                'rounded border px-2 py-1 text-[11px] transition',
                category === c.id
                  ? 'border-community bg-community text-white'
                  : 'border-slate-300 bg-white text-slate-700',
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-semibold text-slate-700">
          In a sentence
        </label>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={120}
          placeholder="Waves crossing the road by the surf club"
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        />

        <label className="mt-2 block text-xs font-semibold text-slate-700">
          Anything else? <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Passable in a car, not on foot."
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        />

        <p className="mt-2 text-[11px] text-slate-500">
          Location: <span className="font-medium text-slate-700">{area.label}</span>.
          No name, contact detail or exact address is collected.
        </p>

        {error && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-800">{error}</p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="rounded bg-community px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Posting…' : 'Post as unverified'}
          </button>
          <button onClick={onClose} className="text-xs font-medium text-slate-500 underline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
