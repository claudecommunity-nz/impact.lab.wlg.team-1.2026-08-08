import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { MapView } from './components/MapView';
import { SignalCard } from './components/SignalCard';
import { TierBadge } from './components/badges';
import { ProfileWizard } from './components/ProfileWizard';
import { ReportSheet } from './components/ReportSheet';
import { useProfile } from './hooks/useProfile';
import { useSignals, triggerIngest, type SourceHealth } from './hooks/useSignals';
import { OVERLAYS } from './lib/catalogue.generated';
import { AREA_GROUPS, AREAS_BY_ID, DEFAULT_AREA, areaLabel } from './lib/areas';
import { EMPTY_PROFILE, rank, type Profile, type Scored } from './lib/relevance';
import { TIERS, ageLabel, type Tier } from './lib/tiers';
import type { Signal } from './lib/signals';

const TIER_ORDER: Tier[] = ['official', 'council', 'measured', 'community'];
const SCENARIO_ID = 'south-coast-southerly';
/** Enter part-way through so the screen is never empty on arrival. */
const SCENARIO_DEFAULT_AT = 180;
const SCENARIO_MAX = 360;

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const qc = useQueryClient();

  const { profile, saveProfile, loaded } = useProfile();
  const [showWizard, setShowWizard] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const [simulating, setSimulating] = useState(params.get('sim') === SCENARIO_ID);
  const [clock, setClock] = useState(SCENARIO_DEFAULT_AT);

  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
  const [showCommunity, setShowCommunity] = useState(true);
  const [selected, setSelected] = useState<Signal | null>(null);
  const [reporting, setReporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const areaId = profile?.area ?? params.get('area') ?? DEFAULT_AREA;
  const effectiveProfile: Profile = profile ?? { ...EMPTY_PROFILE, area: areaId };

  const { data, isLoading, error } = useSignals(simulating ? SCENARIO_ID : null, clock);

  // Offer the wizard once, on a first visit, unless the URL pre-selects an area
  // for a demo.
  useEffect(() => {
    if (loaded && !profile && !skipped && !params.get('area')) setShowWizard(true);
  }, [loaded, profile, skipped]);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (simulating) u.searchParams.set('sim', SCENARIO_ID);
    else u.searchParams.delete('sim');
    u.searchParams.set('area', areaId);
    window.history.replaceState({}, '', u);
    document.title = simulating
      ? '[SIMULATION] One Clear View'
      : 'One Clear View — Wellington south coast';
  }, [simulating, areaId]);

  const signals = data?.signals ?? [];
  const sources = data?.sources ?? [];

  const scored: Scored[] = useMemo(
    () => rank(signals, effectiveProfile),
    [signals, effectiveProfile],
  );

  const visible = useMemo(
    () => scored.filter((s) => (s.signal.tier === 'community' ? showCommunity : true)),
    [scored, showCommunity],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of signals) c[s.tier] = (c[s.tier] ?? 0) + 1;
    return c;
  }, [signals]);

  // Top three, but never the same advice twice. Six open water jobs on one
  // street produce six identical action lines, and a numbered list that repeats
  // itself reads as broken rather than thorough.
  const topThree = useMemo(() => {
    const seen = new Set<string>();
    const out: Scored[] = [];
    for (const s of visible) {
      if (s.score < 30 || !s.actionLine) continue;
      if (seen.has(s.actionLine)) continue;
      seen.add(s.actionLine);
      out.push(s);
      if (out.length === 3) break;
    }
    return out;
  }, [visible]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const r = await triggerIngest();
      setRefreshNote(
        `${r.sources_ok} of ${r.sources_ok + r.sources_failed} sources responded · ${r.items} items`,
      );
      await qc.invalidateQueries({ queryKey: ['signals'] });
    } catch (e) {
      setRefreshNote(`Refresh failed: ${String((e as Error).message)}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`flex h-full flex-col ${simulating ? 'hatch-sim' : ''}`}>
      {simulating && <SimulationBanner clock={clock} onExit={() => setSimulating(false)} />}

      <Header
        areaId={areaId}
        onArea={(id) => saveProfile({ ...effectiveProfile, area: id })}
        onRefresh={onRefresh}
        refreshing={refreshing}
        simulating={simulating}
        generatedAt={data?.generatedAt}
        onEditProfile={() => setShowWizard(true)}
        hasProfile={Boolean(profile)}
      />

      {refreshNote && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-1 text-[11px] text-slate-600">
          {refreshNote}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 lg:w-[28rem]">
          {topThree.length > 0 && <ActionStrip items={topThree} />}

          <TierLegend counts={counts} />
          <SourceHealthBar sources={sources} simulating={simulating} />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && <Note>Loading…</Note>}
            {error && <Note>Could not reach the feed. {String((error as Error).message)}</Note>}
            {!isLoading && !error && visible.length === 0 && <CalmState area={areaId} />}
            <div className="divide-y divide-slate-100">
              {visible.map((s) => (
                <SignalCard
                  key={s.signal.id}
                  signal={s.signal}
                  scored={s}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>

          <Disclaimer />
        </aside>

        <main className="relative min-h-[24rem] flex-1">
          <MapView
            signals={visible.map((s) => s.signal)}
            activeOverlays={activeOverlays}
            areaId={areaId}
            onSelect={setSelected}
            showCommunity={showCommunity}
            simulated={simulating}
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

          <div className="absolute bottom-6 right-3 z-10 flex flex-col items-end gap-2">
            {!simulating && (
              <button
                onClick={() => setReporting(true)}
                className="rounded-full border-2 border-dashed border-white bg-community px-4 py-2 text-xs font-semibold text-white shadow-lg"
              >
                + Report what you can see
              </button>
            )}
            <button
              onClick={() => {
                setSimulating((s) => !s);
                setClock(SCENARIO_DEFAULT_AT);
              }}
              className={[
                'rounded border px-3 py-1.5 text-xs font-semibold shadow',
                simulating
                  ? 'border-slate-900 bg-white text-slate-900'
                  : 'border-sim bg-sim-soft text-sim',
              ].join(' ')}
            >
              {simulating ? 'Back to live data' : 'Run the storm scenario'}
            </button>
          </div>

          {simulating && <Scrubber clock={clock} onChange={setClock} />}
        </main>
      </div>

      {showWizard && (
        <ProfileWizard
          initial={profile}
          onSave={(p) => {
            saveProfile(p);
            setShowWizard(false);
          }}
          onSkip={() => {
            setShowWizard(false);
            setSkipped(true);
          }}
        />
      )}

      {reporting && (
        <ReportSheet
          areaId={areaId}
          onClose={() => setReporting(false)}
          onSubmitted={() => qc.invalidateQueries({ queryKey: ['signals'] })}
        />
      )}

      {selected && <DetailSheet signal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/**
 * Five simultaneous cues that this is not real: the banner, the hatched page
 * background, the hatched map frame, a SIMULATED chip on every card, and the
 * Refresh button visibly disabled. A live control that stops working is the
 * most convincing proof of all.
 */
function SimulationBanner({ clock, onExit }: { clock: number; onExit: () => void }) {
  const h = Math.floor(clock / 60);
  const m = clock % 60;
  return (
    <div
      className="flex flex-wrap items-center gap-3 border-b-2 border-sim px-4 py-2 text-sim"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(247,144,9,.22) 0 10px, rgba(255,250,235,1) 10px 20px)',
      }}
    >
      <strong className="text-sm font-bold uppercase tracking-wide">
        Simulation — not real conditions
      </strong>
      <span className="text-xs">
        A synthetic south coast southerly, for showing how the app behaves in an
        event. No warning is in force. In an emergency, call 111.
      </span>
      <span className="ml-auto font-mono text-xs font-semibold">
        T+{h}h {String(m).padStart(2, '0')}m
      </span>
      <button onClick={onExit} className="rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
        Exit simulation
      </button>
    </div>
  );
}

function Scrubber({ clock, onChange }: { clock: number; onChange: (v: number) => void }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 rounded border border-sim bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:right-auto sm:w-96">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
        <span>Storm timeline</span>
        <span className="font-mono">T+{Math.floor(clock / 60)}h {String(clock % 60).padStart(2, '0')}m</span>
      </div>
      <input
        type="range"
        min={0}
        max={SCENARIO_MAX}
        step={15}
        value={clock}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sim"
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        <button onClick={() => onChange(0)}>Watch issued</button>
        <button onClick={() => onChange(120)} className="font-medium">Council closes road</button>
        <button onClick={() => onChange(240)} className="font-semibold text-sim">Peak</button>
        <button onClick={() => onChange(SCENARIO_MAX)}>Easing</button>
      </div>
    </div>
  );
}

function Header({
  areaId, onArea, onRefresh, refreshing, simulating, generatedAt, onEditProfile, hasProfile,
}: {
  areaId: string;
  onArea: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  simulating: boolean;
  generatedAt?: string;
  onEditProfile: () => void;
  hasProfile: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="mr-auto">
        <h1 className="text-base font-bold leading-tight text-slate-900">One Clear View</h1>
        <p className="text-[11px] leading-tight text-slate-500">
          Warnings, Council information and community reports for the Wellington south coast
        </p>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <span className="font-medium">Area</span>
        <select
          value={areaId}
          onChange={(e) => onArea(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
        >
          {/*
            All 57 suburbs, grouped, with the south coast first because that is
            the problem statement. Grouped rather than flat: an alphabetical run
            from Aro Valley to Woodridge makes a resident hunt for their own
            suburb, and the five bays this prototype is actually about would be
            scattered through it.
          */}
          {AREA_GROUPS.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <button onClick={onEditProfile} className="text-xs font-medium text-council underline">
        {hasProfile ? 'Edit my answers' : 'Personalise this'}
      </button>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">
          {generatedAt
            ? `data as at ${new Date(generatedAt).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}`
            : '—'}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing || simulating}
          title={simulating ? 'Disabled in simulation' : 'Pull every source again'}
          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {simulating ? 'Disabled in simulation' : refreshing ? 'Refreshing…' : 'Refresh sources'}
        </button>
      </div>
    </header>
  );
}

/**
 * The top of the page.
 *
 * On most days nothing needs doing, and the honest version of this panel says
 * so rather than dressing up three low-relevance items as a to-do list. An app
 * that only ever shouts teaches people to ignore it, which is the opposite of
 * what an emergency information tool is for.
 */
const ACTIONABLE_THRESHOLD = 55;

function ActionStrip({ items }: { items: Scored[] }) {
  const actionable = items.some((s) => s.score >= ACTIONABLE_THRESHOLD);

  return (
    <div className="border-b border-slate-200 bg-slate-900 px-3 py-2.5 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {actionable
          ? 'What to do now — ordered for your answers'
          : 'Nothing needs action right now — here is why'}
      </p>
      <ol className="mt-1 space-y-1.5">
        {items.map((s, i) => (
          <li key={s.signal.id} className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900">
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed">
              {s.actionLine ?? s.signal.headline}
              <span
                className="ml-1 rounded px-1 text-[9px] font-bold uppercase"
                style={{ backgroundColor: TIERS[s.signal.tier].hex }}
              >
                {TIERS[s.signal.tier].label}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

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
      <p className="mt-1 text-[10px] leading-tight text-slate-500">
        Counted separately on purpose — official advice and unverified reports
        are never added together.
      </p>
    </div>
  );
}

function SourceHealthBar({
  sources,
  simulating,
}: {
  sources: SourceHealth[];
  simulating: boolean;
}) {
  const feeds = sources.filter((s) => s.tier !== 'context' && s.id !== 'community-reports');
  if (!feeds.length) return null;
  const failed = feeds.filter((s) => s.last_status === 'error');

  return (
    <div className={`border-b border-slate-200 bg-white px-3 py-2 ${simulating ? 'opacity-40' : ''}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Sources
        </span>
        {feeds.map((s) => {
          const ok = s.last_status === 'ok';
          const never = s.last_status === 'never';
          return (
            <span
              key={s.id}
              title={
                s.last_status === 'error'
                  ? `Failed: ${s.name}`
                  : `${s.name} · ${s.last_item_count ?? 0} items`
              }
              className={[
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : never ? 'border-slate-200 bg-slate-50 text-slate-500'
                  : 'border-red-200 bg-red-50 text-red-800',
              ].join(' ')}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : never ? 'bg-slate-300' : 'bg-red-500'}`} />
              {s.publisher}
            </span>
          );
        })}
      </div>
      {/* A failing feed is shown, not hidden. The brief asks for reliability to
          be visible, and an incomplete picture that looks complete is worse
          than one that admits the gap. */}
      {failed.length > 0 && (
        <p className="mt-1 text-[10px] leading-tight text-red-700">
          {failed.length} source{failed.length > 1 ? 's' : ''} did not respond.
          What you see below is incomplete.
        </p>
      )}
      {simulating && (
        <p className="mt-1 text-[10px] font-medium text-sim">
          Source health is not meaningful in simulation.
        </p>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-xs text-slate-500">{children}</p>;
}

function CalmState({ area }: { area: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">
        Nothing is being reported for {areaLabel(area)}.
      </p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
        No official warnings are in force and no conditions have been reported
        nearby. That is the normal state, and it is worth seeing plainly.
      </p>
      <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-600">
        Turn on a hazard layer to see what this area looks like in a modelled
        event, or run the storm scenario.
      </p>
    </div>
  );
}

function OverlayPanel({
  active, onToggle, showCommunity, onShowCommunity,
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
            <label key={o.id} className="flex items-start gap-2 py-1 text-xs" title={o.why ?? undefined}>
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
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
          <Row
            k="When"
            v={`${ageLabel(signal.observedAt)}${signal.observedAt ? ` (${new Date(signal.observedAt).toLocaleString('en-NZ')})` : ''}`}
          />
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
