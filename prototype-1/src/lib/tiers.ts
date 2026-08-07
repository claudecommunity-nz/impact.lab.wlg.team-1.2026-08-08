/**
 * The trust and provenance visual language.
 *
 * The failure mode this problem statement is most wary of is an unverified
 * public post being read as confirmed fact. So the rules here are enforced in
 * code rather than left to the person building each component:
 *
 *   * Tier is carried by SHAPE and BORDER STYLE, not colour alone. Colour is a
 *     supporting cue and would survive a projector, a photocopy or colour-blind
 *     vision, but it is never the only signal.
 *   * Community is the only tier with a dashed border and a hollow fill. Solid
 *     is reserved for attributed sources, and that is a visible invariant.
 *   * There is no blended severity across tiers, so there is no function here
 *     that takes a mixed list and returns one number.
 *
 * `tier` answers who said it. `evidenceBasis` answers how they know. They are
 * separate on purpose and both are shown.
 */

export type Tier = 'official' | 'council' | 'measured' | 'community' | 'context';
export type EvidenceBasis =
  | 'observed'
  | 'measured'
  | 'modelled'
  | 'forecast'
  | 'reported';

export interface TierStyle {
  id: Tier;
  /** Shown on the badge. Short enough for a map popup. */
  label: string;
  /** Sentence a resident can act on. */
  meaning: string;
  border: 'solid' | 'dashed' | 'hatched';
  fill: 'solid' | 'hollow' | 'hatched';
  marker: 'shield' | 'hexagon' | 'circle-value' | 'circle-hollow' | 'none';
  /** Tailwind class fragments. */
  text: string;
  bg: string;
  ring: string;
  hex: string;
}

export const TIERS: Record<Tier, TierStyle> = {
  official: {
    id: 'official',
    label: 'OFFICIAL',
    meaning: 'Issued by an official warning authority.',
    border: 'solid',
    fill: 'solid',
    marker: 'shield',
    text: 'text-official',
    bg: 'bg-official-soft',
    ring: 'ring-official',
    hex: '#b42318',
  },
  council: {
    id: 'council',
    label: 'COUNCIL / OPERATOR',
    meaning: 'Reported by the Council or a network operator.',
    border: 'solid',
    fill: 'solid',
    marker: 'hexagon',
    text: 'text-council',
    bg: 'bg-council-soft',
    ring: 'ring-council',
    hex: '#175cd3',
  },
  measured: {
    id: 'measured',
    label: 'MEASURED',
    meaning: 'A reading from an instrument, not an opinion.',
    border: 'solid',
    fill: 'solid',
    marker: 'circle-value',
    text: 'text-measured',
    bg: 'bg-measured-soft',
    ring: 'ring-measured',
    hex: '#107569',
  },
  community: {
    id: 'community',
    label: 'UNVERIFIED',
    meaning: 'Reported by a member of the public. Not checked by Council.',
    border: 'dashed',
    fill: 'hollow',
    marker: 'circle-hollow',
    text: 'text-community',
    bg: 'bg-community-soft',
    ring: 'ring-community',
    hex: '#5925dc',
  },
  context: {
    id: 'context',
    label: 'MODELLED PLANNING LAYER',
    meaning: 'A hazard model, not something happening now.',
    border: 'hatched',
    fill: 'hatched',
    marker: 'none',
    text: 'text-context',
    bg: 'bg-context-soft',
    ring: 'ring-context',
    hex: '#475467',
  },
};

export const EVIDENCE: Record<EvidenceBasis, { label: string; meaning: string }> = {
  observed: { label: 'observed', meaning: 'Someone with authority saw it and recorded it.' },
  measured: { label: 'measured', meaning: 'An instrument recorded a number.' },
  modelled: { label: 'modelled', meaning: 'Produced by a model. Not an observation.' },
  forecast: { label: 'forecast', meaning: 'A prediction of what is expected.' },
  reported: { label: 'reported', meaning: 'Someone said so. Unverified.' },
};

/**
 * Relevance floors and caps.
 *
 * The invariant that matters: a community report can never outrank an official
 * warning, no matter how many people corroborate it. COMMUNITY_MAX sits below
 * OFFICIAL_FLOOR and `scoreFor` clamps to it. One constant, and it is the
 * direct answer to "never present an unverified public post as confirmed fact".
 */
export const OFFICIAL_FLOOR = 45;
export const COMMUNITY_MAX = 35;

/** Anything older than this is shown greyed, with its age spelled out. */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

/**
 * Words the interface must never use about a community report. Checked by a
 * test so it cannot drift back in: each of these implies a verification step
 * that has not happened.
 */
export const BANNED_ABOUT_COMMUNITY = [
  'verified',
  'confirmed',
  'validated',
  'corroborated',
  'authenticated',
];

/** Relative age, always explicit. Never "just now" for something hours old. */
export function ageLabel(iso: string | null | undefined): string {
  if (!iso) return 'no timestamp';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return 'no timestamp';
  if (ms < 0) return 'dated in the future';

  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'less than a minute ago';
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  if (days < 60) return `${days} days ago`;

  const years = Math.floor(days / 365);
  if (years >= 1) return `${years} year${years > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function isStale(iso: string | null | undefined): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) || Date.now() - t > STALE_AFTER_MS;
}

/**
 * How to word a corroboration count.
 *
 * Always a count of REPORTS, never of confirmations, and always immediately
 * followed by the fact that Council has not confirmed it. At five or more we
 * add the organisers' own framing — a signal to investigate, not a finding.
 */
export function corroborationLabel(othersNearby: number): string | null {
  if (othersNearby <= 0) return null;
  const n = othersNearby + 1;
  if (n >= 5) {
    return `${n}+ residents reported something similar nearby. Worth Council checking.`;
  }
  return `${n} residents reported something similar nearby.`;
}
