/**
 * Turning signals into "what should I actually do".
 *
 * Two rules govern everything here.
 *
 * It must be transparent. Every score is a sum of named constants, and every
 * card can show the exact arithmetic that produced it. There is no model and no
 * hidden weighting — if the interface tells someone to move their school run,
 * they can see precisely why. The brief asks that inference be visible in the
 * interface, and this is that requirement taken literally.
 *
 * A community report can never outrank an official warning. COMMUNITY_MAX (35)
 * sits below OFFICIAL_FLOOR (45) and community scores are clamped to it, no
 * matter how many people report the same thing. Corroboration raises
 * confidence that something is worth looking at; it does not make it official.
 */

import { AREAS_BY_ID, distanceM } from './areas';
import { COMMUNITY_MAX, OFFICIAL_FLOOR } from './tiers';
import type { Signal } from './signals';

export type Role = 'kids' | 'commute' | 'business' | 'home';
export type Travel = 'foot_bus' | 'car' | 'both';
export type Corridor = 'hutt' | 'porirua_kapiti' | 'wairarapa' | 'south_coast' | 'none';

export interface Profile {
  area: string;
  roles: Role[];
  travel: Travel;
  /** Someone in their care depends on mains power or step-free access. */
  dependency: boolean;
  corridor: Corridor;
}

export const EMPTY_PROFILE: Profile = {
  area: 'island-bay',
  roles: [],
  travel: 'both',
  dependency: false,
  corridor: 'none',
};

/** Every weight, in one place, so the "why" panel can quote them. */
export const WEIGHTS = {
  baseOfficialHigh: 60,
  baseOfficialLow: OFFICIAL_FLOOR,
  baseCouncilAccess: 35,
  baseCouncilOther: 30,
  baseCouncilPlanned: 8,
  baseMeasuredNotable: 30,
  baseMeasuredNormal: 5,
  baseCommunity: 15,
  perCorroboration: 5,
  maxCorroboration: 15,

  proximitySameArea: 25,
  proximityNear: 15,

  roleDirect: 25,
  roleRelevant: 15,
  dependency: 25,
  travelMatch: 15,

  recentUnderHour: 10,
  recentUnderSixHours: 5,
  agingPenalty: -12,
  stalePenalty: -25,
} as const;

export interface Reason {
  text: string;
  points: number;
}

export interface Scored {
  signal: Signal;
  score: number;
  reasons: Reason[];
  actionLine: string | null;
}

const ACCESS_CATEGORIES = new Set([
  'road', 'highway', 'waves_over_road', 'surface_flooding',
  'access_unsafe', 'road_blocked', 'slip', 'debris',
]);

const WATER_CATEGORIES = new Set(['surface_flooding', 'flood', 'water', 'sea_level', 'wave']);

function isNotableMeasurement(s: Signal): boolean {
  if (s.value == null) return false;
  if (s.trend === 'rising') return true;
  if (s.category === 'wave' && s.value >= 3) return true;
  if (s.category === 'wind' && s.value >= 80) return true;
  if (s.category === 'sea_level' && s.value >= 0.15) return true;
  return false;
}

function baseScore(s: Signal, reasons: Reason[]): number {
  switch (s.tier) {
    case 'official': {
      const high = (s.severity ?? 0) >= 3;
      const pts = high ? WEIGHTS.baseOfficialHigh : WEIGHTS.baseOfficialLow;
      reasons.push({
        text: `${s.publisher} ${s.severityLabel ?? 'warning'}`,
        points: pts,
      });
      return pts;
    }
    case 'council': {
      if (s.category === 'road_planned') {
        reasons.push({ text: 'Planned works, not happening now', points: WEIGHTS.baseCouncilPlanned });
        return WEIGHTS.baseCouncilPlanned;
      }
      const access = ACCESS_CATEGORIES.has(s.category);
      const pts = access ? WEIGHTS.baseCouncilAccess : WEIGHTS.baseCouncilOther;
      reasons.push({ text: `${s.publisher} report`, points: pts });
      return pts;
    }
    case 'measured': {
      const notable = isNotableMeasurement(s);
      const pts = notable ? WEIGHTS.baseMeasuredNotable : WEIGHTS.baseMeasuredNormal;
      reasons.push({
        text: notable ? 'Measurement is rising or above normal' : 'Measurement is within normal range',
        points: pts,
      });
      return pts;
    }
    case 'community': {
      const others = s.corroborationCount ?? 0;
      const bump = Math.min(others * WEIGHTS.perCorroboration, WEIGHTS.maxCorroboration);
      reasons.push({ text: 'Reported by a member of the public', points: WEIGHTS.baseCommunity });
      if (bump > 0) {
        reasons.push({ text: `${others} other people reported something similar`, points: bump });
      }
      return WEIGHTS.baseCommunity + bump;
    }
    default:
      return 0;
  }
}

function proximity(s: Signal, p: Profile, reasons: Reason[]): number {
  const area = AREAS_BY_ID[p.area];
  if (!area) return 0;

  if (s.areaHint && s.areaHint === p.area) {
    reasons.push({ text: `In ${area.label}, the area you chose`, points: WEIGHTS.proximitySameArea });
    return WEIGHTS.proximitySameArea;
  }
  if (s.lng != null && s.lat != null) {
    const d = distanceM([s.lng, s.lat], area.centre);
    if (d <= area.radiusM) {
      reasons.push({ text: `Within ${Math.round(d / 100) / 10} km of ${area.label}`, points: WEIGHTS.proximitySameArea });
      return WEIGHTS.proximitySameArea;
    }
    if (d <= 5000) {
      reasons.push({ text: `About ${Math.round(d / 1000)} km from ${area.label}`, points: WEIGHTS.proximityNear });
      return WEIGHTS.proximityNear;
    }
  }
  // Region-wide items with no point (a wind warning, an EMA broadcast) still
  // matter to everyone, so they are not penalised for having no location.
  if (s.lng == null && s.tier === 'official') {
    reasons.push({ text: 'Covers the whole Wellington region', points: WEIGHTS.proximityNear });
    return WEIGHTS.proximityNear;
  }
  return 0;
}

function roleBonus(s: Signal, p: Profile, reasons: Reason[]): number {
  let pts = 0;
  const access = ACCESS_CATEGORIES.has(s.category);
  const water = WATER_CATEGORIES.has(s.category);
  const power = s.category === 'power';

  if (p.roles.includes('kids') && access) {
    reasons.push({ text: 'You told us you have kids at school', points: WEIGHTS.roleDirect });
    pts += WEIGHTS.roleDirect;
  }
  if (p.roles.includes('commute') && (s.category === 'highway' || s.category === 'road')) {
    reasons.push({ text: 'You told us you commute', points: WEIGHTS.roleDirect });
    pts += WEIGHTS.roleDirect;
  }
  if (p.roles.includes('business') && (power || access)) {
    reasons.push({ text: 'You told us you run or staff a business here', points: WEIGHTS.roleRelevant });
    pts += WEIGHTS.roleRelevant;
  }
  if (p.roles.includes('home') && (water || power)) {
    reasons.push({ text: 'You told us you are responsible for a home here', points: WEIGHTS.roleRelevant });
    pts += WEIGHTS.roleRelevant;
  }
  if (p.dependency && (power || (s.tier === 'official' && (s.severity ?? 0) >= 3))) {
    reasons.push({
      text: 'You told us someone depends on mains power or step-free access',
      points: WEIGHTS.dependency,
    });
    pts += WEIGHTS.dependency;
  }
  if (p.travel === 'foot_bus' && (s.category === 'access_unsafe' || s.category === 'waves_over_road' || s.category === 'debris')) {
    reasons.push({ text: 'On foot or by bus this is a direct problem', points: WEIGHTS.travelMatch });
    pts += WEIGHTS.travelMatch;
  }
  if (p.travel === 'car' && (s.category === 'road' || s.category === 'highway')) {
    reasons.push({ text: 'You told us you drive', points: WEIGHTS.travelMatch });
    pts += WEIGHTS.travelMatch;
  }
  return pts;
}

function recency(s: Signal, reasons: Reason[]): number {
  if (!s.observedAt) return 0;
  const ms = Date.now() - new Date(s.observedAt).getTime();
  if (ms < 0) return 0;
  const hours = ms / 3_600_000;
  if (hours < 1) {
    reasons.push({ text: 'Reported in the last hour', points: WEIGHTS.recentUnderHour });
    return WEIGHTS.recentUnderHour;
  }
  if (hours < 6) {
    reasons.push({ text: 'Reported in the last six hours', points: WEIGHTS.recentUnderSixHours });
    return WEIGHTS.recentUnderSixHours;
  }
  // An overnight maintenance job is not "what to do now". The penalty has to
  // bite well before 24 hours or a day-old water fault outranks a live gauge.
  if (hours > 24) {
    reasons.push({
      text: `More than a day old (${Math.round(hours / 24)} days)`,
      points: WEIGHTS.stalePenalty,
    });
    return WEIGHTS.stalePenalty;
  }
  reasons.push({
    text: `${Math.round(hours)} hours old`,
    points: WEIGHTS.agingPenalty,
  });
  return WEIGHTS.agingPenalty;
}

/**
 * Plain-English next step.
 *
 * Deliberately conservative in tone. This is a prototype reading public feeds,
 * not an emergency instruction, so the wording suggests and explains rather
 * than commands, and it never implies an unverified report has been checked.
 */
function actionFor(s: Signal, p: Profile): string | null {
  const where = s.areaHint ? AREAS_BY_ID[s.areaHint]?.label ?? 'your area' : 'your area';

  if (s.tier === 'community') {
    return `Residents are reporting this in ${where}. Council has not confirmed it — ` +
      `treat it as a reason to check before you travel, not as fact.`;
  }

  if (p.dependency && s.category === 'power') {
    return 'You told us someone depends on mains power. Charge phones and any ' +
      'medical equipment now, and check your backup plan.';
  }

  // Official warnings carry no numeric value, so they must be handled before
  // the category branches below, which reason about readings. Without this a
  // Red Severe Wind Warning falls through to the wind case, finds no number,
  // and is described as "normal for Wellington, nothing to do" — advice that
  // is not merely unhelpful but the opposite of what the publisher issued.
  if (s.tier === 'official') {
    const severe = (s.severity ?? 0) >= 3 || /severe|red|extreme/i.test(s.severityLabel ?? '');
    if (s.category === 'emergency_alert') {
      return 'This is an official emergency broadcast. Follow the instruction it contains.';
    }
    return severe
      ? `${s.publisher} has issued a severe warning covering ${where}. ` +
        'Secure anything loose, avoid exposed routes, and read the full text on ' +
        'the publisher’s site.'
      : `${s.publisher} has a warning in force for ${where}. ` +
        'Worth reading before you travel.';
  }

  switch (s.category) {
    case 'road':
    case 'road_blocked':
      return p.roles.includes('kids')
        ? `This affects a route through ${where}. If you are collecting from school, allow extra time or agree another pickup point.`
        : `Access through ${where} is affected. Check before you set out.`;
    case 'road_planned':
      return 'Planned work, not weather. Worth knowing about, nothing to do today.';
    case 'highway':
      return p.corridor === 'hutt'
        ? 'This is on the Hutt route you told us you use. Allow extra time or travel earlier.'
        : 'State highway conditions have changed. Check before you travel.';
    case 'power':
      return 'Power is affected nearby. Charge devices while you can and check on neighbours who may need help.';
    case 'water':
      return 'A water network job is open nearby. If your supply is affected, fill containers now.';
    case 'waves_over_road':
    case 'access_unsafe':
      return `Conditions on the seaward side at ${where} are unsafe. Stay off the sea wall and the seaward footpath.`;
    case 'surface_flooding':
      return 'Surface water is being reported. Clear your gutters and drains, and move vehicles off low ground.';
    case 'wave':
      return s.value != null && s.value >= 3
        ? 'Swell is large enough to break over the south coast road. Avoid the coast road and the sea wall.'
        : 'Swell is unremarkable for the south coast. Nothing to do.';
    case 'wind':
      return s.value != null && s.value >= 90
        ? 'Gusts are strong enough to move unsecured items. Bring in bins and anything loose.'
        : 'Wind is normal for Wellington. Nothing to do.';
    case 'sea_level':
      return s.trend === 'rising'
        ? 'Water level is running above what the tide explains, which is what a surge looks like. Worth watching if you are near the coast.'
        : 'Water level is close to what the tide predicts. Nothing unusual.';
    case 'emergency_alert':
      return 'This is an official emergency broadcast. Follow the instruction it contains.';
    default:
      // Official items never reach here — they return above, before any branch
      // that reasons about a numeric reading.
      return null;
  }
}

export function score(signal: Signal, profile: Profile): Scored {
  const reasons: Reason[] = [];

  let total =
    baseScore(signal, reasons) +
    proximity(signal, profile, reasons) +
    roleBonus(signal, profile, reasons) +
    recency(signal, reasons);

  // The invariant. An unverified report cannot be made to outrank an official
  // warning by piling on corroboration, proximity or role matches.
  if (signal.tier === 'community' && total > COMMUNITY_MAX) {
    reasons.push({
      text: `Capped at ${COMMUNITY_MAX} — an unverified report never outranks an official warning`,
      points: COMMUNITY_MAX - total,
    });
    total = COMMUNITY_MAX;
  }

  return {
    signal,
    score: Math.max(0, Math.min(100, Math.round(total))),
    reasons,
    actionLine: actionFor(signal, profile),
  };
}

export function rank(signals: Signal[], profile: Profile): Scored[] {
  return signals
    .map((s) => score(s, profile))
    .sort((a, b) => b.score - a.score);
}
