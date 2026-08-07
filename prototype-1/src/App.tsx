import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { MapView } from './components/MapView';
import { SignalCard } from './components/SignalCard';
import { TierBadge } from './components/badges';
import { fetchAllDirect, type FetchOutcome, type Signal } from './lib/signals';
import { OVERLAYS, SOURCES_BY_ID } from './lib/catalogue.generated';
import { AREAS, AREAS_BY_ID, DEFAULT_AREA, areaLabel, distanceM } from './lib/areas';
import { TIERS, ageLabel, type Tier } from './lib/tiers';

const TIER_ORDER: Tier[] = ['official', 'council', 'measured', 'community'];

export default function App() {
  // ?area=island-bay bypasses any onboarding, so a demo never starts on a
  // permission prompt or an empty screen.
  const params = new URLSearchParams(window.location.search);
  const [areaId, setAreaId] = useState(params.get('area') ?? DEFAULT_AREA);
  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
  const [showCommunity, setShowCommunity] = useState(true);
  const [selected, setSelected] = useState<Signal | null>(null);

  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['signals', 'direct'],
    queryFn: ({ signal }) => fetchAllDirect(signal),
  });

  const signals = data?.signals ?? [];
  const outcomes = data?.outcomes ?? [];

  const area = AREAS_BY_ID[areaId] ?? AREAS_BY_ID[DEFAULT_AREA];

  // Nearest first. Real relevance scoring arrives with the profile wizard;
  // distance is the honest interim ordering.
  const ordered = useMemo(() => {
    return [...signals].sort((a, b) => {
      const rank = (s: Signal) => TIER_ORDER.indexOf(s.tier);
      const da =
        a.lng != null && a.lat != null ? distanceM([a.lng, a.lat], area.centre) : 1e9;
      const db =
        b.lng != null && b.lat != null ? distanceM([b.lng, b.lat], area.centre) : 1e9;
      const near = (d: number) => (d <= area.radiusM ? 0 : d <= 5000 ? 1 : 2);
      return near(da) - near(db) || rank(a) - rank(b) || da - db;
    });
  }, [signals, area]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of signals) c[s.tier] = (c[s.tier] ?? 0) + 1;
    return c;
  }, [signals]);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set('area', areaId);
    window.history.replaceState({}, '', u);
  }, [areaId]);

  return (
    <div className="flex h-full flex-col">
      <Header
        areaId={areaId}
        onArea={setAreaId}
        onRefresh={() => refetch()}
        isFetching={isFetching}
        updatedAt={dataUpdatedAt}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 lg:w-[27rem]">
          <TierLegend counts={counts} />

          <SourceHealth outcomes={outcomes} />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {ordered.length === 0 && !isFetching && <CalmState area={areaId} />}
            <div className="divide-y divide-slate-100">
              {ordered.map((s) => (
                <SignalCard key={s.id} signal={s} onSelect={setSelected} />
              ))}
            </div>
          </div>

          <Disclaimer />
        </aside>

        <main className="relative min-h-[24rem] flex-1">
          <MapView
            signals={signals}
            activeOverlays={activeOverlays}
            areaId={areaId}
            onSelect={setSelected}
            showCommunity={showCommunity}
            simulated={false}
          />
          <OverlayPanel
            active={activeOverlays}
            onToggle={(id) =>
              setActiveOverlays((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
            showCommunity={showCommunity}
            onShowCommunity={setShowCommunity}
          />
        </main>
      </div>

      {selected && <DetailSheet signal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Header({
  areaId,
  onArea,
  onRefresh,
  isFetching,
  updatedAt,
}: {
  areaId: string;
  onArea: (id: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
  updatedAt: number;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="mr-auto">
        <h1 className="text-base font-bold leading-tight text-slate-900">
          One Clear View
        </h1>
        <p className="text-[11px] leading-tight text-slate-500">
          Warnings, Council information and community reports for the Wellington
          south coast
        </p>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <span className="font-medium">Area</span>
        <select
          value={areaId}
          onChange={(e) => onArea(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">
          {updatedAt ? `data as at ${new Date(updatedAt).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}` : '—'}
        </span>
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh sources'}
        </button>
      </div>
    </header>
  );
}

/**
 * Always-visible legend. Not a hidden control — if the four tiers are the whole
 * point, they belong on screen at all times.
 */
function TierLegend({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap gap-1.5">
        {TIER_ORDER.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <TierBadge tier={t} />
            <span className="text-[11px] font-semibold tabular-nums text-slate-600">
              {counts[t] ?? 0}
            </span>
          </span>
        ))}
      </div>
      {/* Counts are always per tier. They are never added together, because a
          warning and a resident's report are not the same kind of thing. */}
      <p className="mt-1 text-[10px] leading-tight text-slate-500">
        Counted separately on purpose — official advice and unverified reports
        are never added together.
      </p>
    </div>
  );
}

function SourceHealth({ outcomes }: { outcomes: FetchOutcome[] }) {
  if (!outcomes.length) return null;
  const failed = outcomes.filter((o) => o.status === 'error');
  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Sources
        </span>
        {outcomes.map((o) => {
          const name = SOURCES_BY_ID[o.sourceId]?.publisher ?? o.sourceId;
          const ok = o.status === 'ok';
          return (
            <span
              key={o.sourceId}
              title={ok ? `${o.count} items` : o.error}
              className={[
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800',
              ].join(' ')}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {name}
            </span>
          );
        })}
      </div>
      {failed.length > 0 && (
        <p className="mt-1 text-[10px] leading-tight text-red-700">
          {failed.length} source{failed.length > 1 ? 's' : ''} did not respond.
          What you see below is incomplete.
        </p>
      )}
    </div>
  );
}

/** An empty map is good news, and should read that way. */
function CalmState({ area }: { area: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">
        Nothing is being reported for {areaLabel(area)}.
      </p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
        No official warnings are in force and no conditions have been reported
        nearby. Turn on a hazard layer to see what this area looks like in a
        modelled event.
      </p>
    </div>
  );
}

function OverlayPanel({
  active,
  onToggle,
  showCommunity,
  onShowCommunity,
}: {
  active: string[];
  onToggle: (id: string) => void;
  showCommunity: boolean;
  onShowCommunity: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute left-2 top-2 z-10 w-64">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded border border-slate-300 bg-white/95 px-2.5 py-1.5 text-left text-xs font-semibold shadow-sm backdrop-blur"
      >
        Map layers {active.length > 0 && `(${active.length})`}
        <span className="float-right text-slate-400">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-1 max-h-[26rem] overflow-y-auto rounded border border-slate-300 bg-white/97 p-2 shadow-lg backdrop-blur">
          {/* Proving the two are structurally separate: you can switch the
              unverified layer off entirely and the official picture is intact. */}
          <label className="mb-2 flex items-start gap-2 rounded bg-community-soft p-1.5 text-xs">
            <input
              type="checkbox"
              checked={showCommunity}
              onChange={(e) => onShowCommunity(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-community">
                Show unverified community reports
              </span>
              <span className="block text-[10px] text-slate-600">
                A separate layer. Switch it off and only attributed sources remain.
              </span>
            </span>
          </label>

          <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Hazard planning layers
          </p>
          <p className="mb-1.5 text-[10px] leading-tight text-slate-500">
            Models of what could happen, not what is happening. Shown hatched.
          </p>
          {OVERLAYS.map((o) => (
            <label
              key={o.id}
              className="flex items-start gap-2 py-1 text-xs"
              title={o.why ?? undefined}
            >
              <input
                type="checkbox"
                checked={active.includes(o.id)}
                onChange={() => onToggle(o.id)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-800">{o.name}</span>
                <span className="block text-[10px] text-slate-500">{o.publisher}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailSheet({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const t = TIERS[signal.tier];
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-white p-4 shadow-xl sm:rounded-lg">
        <div className="mb-2 flex items-start justify-between gap-3">
          <TierBadge tier={signal.tier} publisher={signal.publisher} simulated={signal.simulated} />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <h2 className="text-base font-bold leading-snug">{signal.headline}</h2>
        {signal.severityLabel && (
          <p className={`mt-0.5 text-sm font-medium ${t.text}`}>{signal.severityLabel}</p>
        )}
        {signal.detail && (
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{signal.detail}</p>
        )}

        <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs">
          <Row k="Source" v={signal.sourceName} />
          <Row k="Published by" v={signal.publisher} />
          <Row k="When" v={`${ageLabel(signal.observedAt)}${signal.observedAt ? ` (${new Date(signal.observedAt).toLocaleString('en-NZ')})` : ''}`} />
          <Row k="How it is known" v={signal.evidenceBasis} />
          {signal.licence && <Row k="Licence" v={signal.licence} />}
        </dl>

        <p className="mt-3 rounded bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
          {signal.attribution}
        </p>

        {signal.url && (
          <a
            href={signal.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open the authoritative source ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-800">{v}</dd>
    </div>
  );
}

/**
 * Not dismissible, and repeated in the GeoJSON payload and the README. The
 * organisers asked for this to be said; saying it once in a modal that gets
 * clicked away is not saying it.
 */
function Disclaimer() {
  return (
    <div className="border-t border-slate-200 bg-slate-900 px-3 py-2 text-[11px] leading-snug text-slate-100">
      <strong className="font-semibold">
        Prototype. Hazard-planning and public feed data, not an operational
        emergency source.
      </strong>{' '}
      In an emergency, call 111. Built at the Impact Lab with Wellington City
      Council Emergency Management, 8 August 2026.
    </div>
  );
}
