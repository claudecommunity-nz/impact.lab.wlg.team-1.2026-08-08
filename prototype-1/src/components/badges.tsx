import { EVIDENCE, TIERS, type EvidenceBasis, type Tier } from '@/lib/tiers';

/**
 * Two badges, never one.
 *
 * TierBadge answers "who is telling me this". EvidenceBadge answers "how do
 * they know". Collapsing them would lose the distinction the brief asks for:
 * a Council road closure and an Open-Meteo forecast are both non-official, but
 * one was seen by someone and the other came out of a model.
 */

export function TierBadge({
  tier,
  publisher,
  simulated,
}: {
  tier: Tier;
  publisher?: string;
  simulated?: boolean;
}) {
  const t = TIERS[tier];
  const dashed = tier === 'community';
  return (
    <span
      title={t.meaning}
      className={[
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide',
        t.text,
        t.bg,
        'border',
        dashed ? 'border-dashed' : 'border-solid',
        'border-current/40',
      ].join(' ')}
    >
      {tier === 'official' && <Shield />}
      {tier === 'community' && <span aria-hidden>?</span>}
      {t.label}
      {publisher && <span className="font-normal normal-case opacity-80">· {publisher}</span>}
      {simulated && <span className="ml-1 rounded bg-sim px-1 text-white">SIMULATED</span>}
    </span>
  );
}

export function EvidenceBadge({ basis }: { basis: EvidenceBasis }) {
  const e = EVIDENCE[basis];
  return (
    <span
      title={e.meaning}
      className="inline-flex items-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium lowercase tracking-wide text-slate-600"
    >
      {e.label}
    </span>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden fill="currentColor">
      <path d="M6 .8 1.6 2.5v3.1c0 2.6 1.9 4.9 4.4 5.6 2.5-.7 4.4-3 4.4-5.6V2.5L6 .8Z" />
    </svg>
  );
}

/**
 * Corroboration, shown as a stack of dots rather than a badge.
 *
 * A badge reads as a certification. A count of dots reads as "several people
 * said this", which is what it is. The wording beside it never uses the words
 * verified, confirmed or validated, and the "Council has not confirmed this"
 * line sits at the same size immediately after — not smaller, not below the
 * fold.
 */
export function CorroborationDots({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} reports`}>
      {Array.from({ length: Math.min(n, 5) }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-community" />
      ))}
      {n > 5 && <span className="text-[10px] font-medium text-community">+</span>}
    </span>
  );
}
