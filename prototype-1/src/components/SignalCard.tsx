import { CorroborationDots, EvidenceBadge, TierBadge } from './badges';
import {
  TIERS,
  ageLabel,
  corroborationLabel,
  isStale,
} from '@/lib/tiers';
import type { Signal } from '@/lib/signals';

/**
 * One item in the feed.
 *
 * Every card states its source and its time on its face — that is a literal
 * requirement of the problem statement, not a nicety. Anything older than two
 * hours is greyed and its age is spelled out rather than softened, because a
 * gauge that last reported in 2019 looks identical to a live one unless you
 * say so.
 */
export function SignalCard({
  signal,
  onSelect,
}: {
  signal: Signal;
  onSelect?: (s: Signal) => void;
}) {
  const t = TIERS[signal.tier];
  const stale = isStale(signal.observedAt);
  const isCommunity = signal.tier === 'community';
  const corroboration = isCommunity
    ? corroborationLabel(signal.corroborationCount ?? 0)
    : null;

  return (
    <button
      onClick={() => onSelect?.(signal)}
      className={[
        'w-full border-l-4 bg-white px-3 py-2.5 text-left',
        'border-y border-r border-slate-200',
        'transition hover:bg-slate-50',
        isCommunity ? 'edge-dashed' : '',
        stale ? 'opacity-60' : '',
      ].join(' ')}
      style={{ borderLeftColor: t.hex }}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <TierBadge
          tier={signal.tier}
          publisher={signal.publisher}
          simulated={signal.simulated}
        />
        <EvidenceBadge basis={signal.evidenceBasis} />
      </div>

      <p className="text-sm font-semibold leading-snug text-slate-900">
        {signal.headline}
      </p>

      {signal.severityLabel && !isCommunity && (
        <p className={`mt-0.5 text-xs font-medium ${t.text}`}>{signal.severityLabel}</p>
      )}

      {signal.detail && (
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
          {signal.detail}
        </p>
      )}

      {signal.value != null && (
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-mono text-lg font-semibold text-measured">
            {signal.value.toFixed(2)}
          </span>
          <span className="text-xs text-slate-500">{signal.unit}</span>
          {signal.trend && (
            <span className="text-xs font-medium text-slate-600">
              {signal.trend === 'rising' ? '▲ rising' : signal.trend === 'falling' ? '▼ falling' : '— steady'}
            </span>
          )}
        </div>
      )}

      {/* Corroboration. A count of reports, immediately followed by the fact
          that nobody has checked them. Same size, same block, no ambiguity. */}
      {corroboration && (
        <div className="mt-1.5 rounded bg-community-soft px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <CorroborationDots n={(signal.corroborationCount ?? 0) + 1} />
            <span className="text-xs font-medium text-community">{corroboration}</span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-community">
            Council has not confirmed this.
          </p>
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
        <span className="font-medium">{signal.sourceName}</span>
        <span aria-hidden>·</span>
        <span className={stale ? 'font-semibold text-slate-700' : ''}>
          {ageLabel(signal.observedAt)}
        </span>
        {stale && (
          <span className="rounded bg-slate-100 px-1 font-medium text-slate-700">
            not current
          </span>
        )}
      </div>
    </button>
  );
}
