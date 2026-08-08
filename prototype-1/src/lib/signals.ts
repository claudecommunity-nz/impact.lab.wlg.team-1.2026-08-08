/**
 * The normalised shape every source collapses into, and the direct-from-browser
 * fetchers for the feeds that allow it.
 *
 * CORS was measured for every upstream host on the morning of the build rather
 * than assumed. All but three allow a browser request, which is why this file
 * can exist at all: the map works with no backend running. The three that do
 * not (NZTA delays, NZTA cameras, the EMA RSS) are fetched by the ingest edge
 * function instead and arrive through Supabase.
 */

import type { EvidenceBasis, Tier } from './tiers';
import { areaFor } from './areas';
import { suburbFor } from './suburbs';
import { SOURCES_BY_ID, WELLINGTON } from './catalogue.generated';

export interface Signal {
  id: string;
  sourceId: string;
  sourceName: string;
  publisher: string;
  attribution: string;
  licence: string | null;
  homepage: string | null;

  tier: Tier;
  category: string;
  evidenceBasis: EvidenceBasis;

  headline: string;
  detail: string | null;
  severity: number | null;
  severityLabel: string | null;

  observedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  ingestedAt: string;

  lng: number | null;
  lat: number | null;
  areaHint: string | null;
  /**
   * WCC suburb name for the point. Naming only — proximity ranking stays on
   * `areaHint`, because suburb polygons run from 0.26 km² to 89 km².
   */
  suburb: string | null;
  /** False when the point is offshore and `suburb` is the nearest within 3 km. */
  suburbExact: boolean | null;
  geometry: GeoJSON.Geometry | null;

  value: number | null;
  unit: string | null;
  trend: 'rising' | 'falling' | 'steady' | null;
  sparkline: number[] | null;
  baselineMin: number | null;
  baselineMax: number | null;

  url: string | null;

  /** Community only. */
  status: string | null;
  corroborationCount: number | null;
  simulated?: boolean;
}

const UA_NOTE = 'Impact Lab Wellington team 1 prototype';

/** Wellington bbox as an ArcGIS envelope query fragment. */
function bboxParams(): Record<string, string> {
  const [w, s, e, n] = WELLINGTON;
  return {
    geometry: `${w},${s},${e},${n}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
  };
}

async function arcgisGeoJSON(
  endpoint: string,
  extra: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    // Everything upstream is published in NZTM2000. Ask for 4326 or the pins
    // land off the coast of Africa.
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '1000',
    ...extra,
  });
  const res = await fetch(`${endpoint}/query?${params}`, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'ArcGIS error');
  // A silent cap at 2,000 is the documented trap. We request 1,000 and say so
  // rather than pretending the result is complete.
  if (json.exceededTransferLimit) {
    console.warn(`${endpoint} exceeded transfer limit — result is truncated`);
  }
  return json as GeoJSON.FeatureCollection;
}

function centroidOf(geom: GeoJSON.Geometry | null): [number, number] | null {
  if (!geom) return null;
  const pts: [number, number][] = [];
  const walk = (c: any): void => {
    if (typeof c?.[0] === 'number' && typeof c?.[1] === 'number') {
      pts.push([c[0], c[1]]);
      return;
    }
    if (Array.isArray(c)) c.forEach(walk);
  };
  walk((geom as any).coordinates);
  if (!pts.length) return null;
  const n = pts.length;
  return [
    pts.reduce((s, p) => s + p[0], 0) / n,
    pts.reduce((s, p) => s + p[1], 0) / n,
  ];
}

function base(sourceId: string) {
  const s = SOURCES_BY_ID[sourceId];
  return {
    sourceId,
    sourceName: s.name,
    publisher: s.publisher,
    attribution: s.attribution,
    licence: s.licence,
    homepage: s.homepage,
    tier: s.tier as Tier,
    evidenceBasis: s.evidence_default as EvidenceBasis,
    ingestedAt: new Date().toISOString(),
    status: null,
    corroborationCount: null,
  };
}

/** MetService severity words -> a rank we can sort on. Never rendered. */
function severityRank(word: string | null): number | null {
  if (!word) return null;
  const w = word.toLowerCase();
  if (w.includes('extreme')) return 4;
  if (w.includes('severe') || w.includes('major')) return 3;
  if (w.includes('moderate')) return 2;
  if (w.includes('minor')) return 1;
  return 0;
}

function ms(v: unknown): string | null {
  const n = typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
}

// ---------------------------------------------------------------------------
// MetService severe weather warnings. Official tier, forecast evidence.
// ---------------------------------------------------------------------------
export async function fetchMetService(signal?: AbortSignal): Promise<Signal[]> {
  const src = SOURCES_BY_ID['metservice-alerts'];
  const fc = await arcgisGeoJSON(src.endpoint!, bboxParams(), signal);

  return (fc.features ?? []).map((f, i) => {
    const p: any = f.properties ?? {};
    const c = centroidOf(f.geometry as GeoJSON.Geometry);
    const event = p.info_event ?? 'Weather warning';
    return {
      ...base('metservice-alerts'),
      id: `metservice-alerts:${p.identifier ?? p.OBJECTID ?? i}`,
      category: String(event).toLowerCase(),
      headline: p.info_headline ?? `${event} warning`,
      detail: p.info_area_areaDesc ?? null,
      severity: severityRank(p.info_severity),
      // The publisher's own wording, always shown in preference to the rank.
      severityLabel: [p.info_severity, p.info_event, p.info_urgency]
        .filter(Boolean)
        .join(' · ') || null,
      observedAt: ms(p.sent) ?? ms(p.onset),
      validFrom: ms(p.onset),
      validTo: ms(p.validto),
      lng: c?.[0] ?? null,
      lat: c?.[1] ?? null,
      areaHint: c ? areaFor(c[0], c[1]) : null,
      suburb: null, suburbExact: null,  // filled by stamp() in fetchAllDirect
      geometry: (f.geometry as GeoJSON.Geometry) ?? null,
      value: null, unit: null, trend: null, sparkline: null,
      baselineMin: null, baselineMax: null,
      url: 'https://www.metservice.com/warnings/home',
    } as Signal;
  });
}

// ---------------------------------------------------------------------------
// WCC street events and road closures. Council tier, observed evidence.
//
// Worth being precise about what this layer actually is, because the name
// oversells it. Most of the 60 features are PLANNED street events — the
// Thorndon Fair, the Newtown Festival — approved months ahead, not closures
// caused by weather. Presenting a scheduled festival as an emerging condition
// would be exactly the kind of blurring this project is meant to prevent.
//
// So: drop anything already finished, keep the next seven days, and label each
// one either "in effect now" or "planned, starts <date>". A resident can then
// tell at a glance which road is shut right now and which is shut in November.
// ---------------------------------------------------------------------------
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function fetchRoadClosures(signal?: AbortSignal): Promise<Signal[]> {
  const src = SOURCES_BY_ID['wcc-road-closures'];
  const fc = await arcgisGeoJSON(src.endpoint!, {}, signal);
  const now = Date.now();

  return (fc.features ?? [])
    .map((f, i) => {
      const p: any = f.properties ?? {};
      const c = centroidOf(f.geometry as GeoJSON.Geometry);

      const startMs = typeof p.Start_Date === 'number' ? p.Start_Date : null;
      const endMs = typeof p.End_Date === 'number' ? p.End_Date : null;

      // Finished, or too far out to be actionable today.
      if (endMs != null && endMs < now) return null;
      if (startMs != null && startMs > now + SEVEN_DAYS_MS) return null;

      const inEffect =
        startMs != null && startMs <= now && (endMs == null || endMs >= now);
      const name = p.Event_Name?.trim() || 'Street event';
      const detail = p.EventDetails?.trim() || null;

      return {
        ...base('wcc-road-closures'),
        id: `wcc-road-closures:${p.OBJECTID ?? i}`,
        category: inEffect ? 'road' : 'road_planned',
        headline: inEffect
          ? `Road affected now — ${name}`
          : `Planned closure — ${name}`,
        detail: [
          inEffect
            ? 'In effect now.'
            : startMs
              ? `Planned. Starts ${new Date(startMs).toLocaleDateString('en-NZ', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}.`
              : 'Planned. No start date given.',
          detail,
        ]
          .filter(Boolean)
          .join(' ') || null,
        // A planned event should never sort above something happening now.
        severity: inEffect ? 2 : 0,
        severityLabel: inEffect ? 'Road closure in effect' : 'Scheduled street event',
        // For a planned event, the meaningful time is when it starts, not when
        // the Council keyed it in.
        observedAt: inEffect ? ms(startMs) : ms(startMs) ?? new Date().toISOString(),
        validFrom: ms(startMs),
        validTo: ms(endMs),
        lng: c?.[0] ?? null,
        lat: c?.[1] ?? null,
        areaHint: c ? areaFor(c[0], c[1]) : null,
        suburb: null, suburbExact: null,  // filled by stamp() in fetchAllDirect
        geometry: (f.geometry as GeoJSON.Geometry) ?? null,
        value: null, unit: null, trend: null, sparkline: null,
        baselineMin: null, baselineMax: null,
        url: 'https://wellington.govt.nz/roads-and-transport',
      } as Signal;
    })
    .filter((s): s is Signal => s !== null);
}

// ---------------------------------------------------------------------------
// GeoNet Tilde detided sea level at Wellington Harbour, 15-second cadence.
// The detided residual is the interesting part: it is the storm surge with the
// predictable tide removed, so a rising number means water is being pushed in
// beyond what the tide explains.
// ---------------------------------------------------------------------------
export async function fetchSeaLevel(signal?: AbortSignal): Promise<Signal[]> {
  const src = SOURCES_BY_ID['geonet-tilde-sea-level'];
  const res = await fetch(src.endpoint!, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();

  const series: { val: number; ts: string }[] = json?.[0]?.data ?? [];
  if (!series.length) return [];

  const last = series[series.length - 1];
  // ~1,440 points per 6 h call. Keep 24 for a sparkline and drop the rest.
  const step = Math.max(1, Math.floor(series.length / 24));
  const spark = series.filter((_, i) => i % step === 0).map((d) => d.val);
  const first = series[0].val;
  const delta = last.val - first;

  return [{
    ...base('geonet-tilde-sea-level'),
    id: 'geonet-tilde-sea-level:WLGT:water-height-detided',
    category: 'sea_level',
    headline: `Sea level at Wellington Harbour, tide removed: ${last.val.toFixed(2)} m`,
    detail:
      `Detided residual — the part of the water level the tide does not explain. ` +
      `${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(2)} m over the last 6 hours.`,
    severity: null,
    severityLabel: null,
    observedAt: last.ts,
    validFrom: null, validTo: null,
    lng: 174.7797, lat: -41.2847,
    areaHint: 'wellington-other',
    suburb: null, suburbExact: null,  // filled by stamp() in fetchAllDirect
    geometry: { type: 'Point', coordinates: [174.7797, -41.2847] },
    value: last.val,
    unit: 'm',
    trend: Math.abs(delta) < 0.02 ? 'steady' : delta > 0 ? 'rising' : 'falling',
    sparkline: spark,
    baselineMin: Math.min(...spark),
    baselineMax: Math.max(...spark),
    url: 'https://tilde.geonet.org.nz',
  } as Signal];
}

// ---------------------------------------------------------------------------
// Marine forecast for the south coast — wave and swell height off Island Bay.
// ---------------------------------------------------------------------------
export async function fetchMarine(signal?: AbortSignal): Promise<Signal[]> {
  const src = SOURCES_BY_ID['open-meteo-marine'];
  const url =
    `${src.endpoint}?latitude=-41.36&longitude=174.77` +
    `&current=wave_height,swell_wave_height,wave_period&timezone=UTC`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const j = await res.json();
  const cur = j?.current;
  if (!cur) return [];

  const h = Number(cur.wave_height);
  return [{
    ...base('open-meteo-marine'),
    id: 'open-meteo-marine:south-coast',
    category: 'wave',
    headline: `Forecast wave height off the south coast: ${h.toFixed(1)} m`,
    detail:
      `Swell ${Number(cur.swell_wave_height ?? 0).toFixed(1)} m, ` +
      `period ${Number(cur.wave_period ?? 0).toFixed(0)} s. ` +
      `A model forecast for open water, not a measurement at the shore.`,
    severity: h >= 4 ? 3 : h >= 3 ? 2 : h >= 2 ? 1 : 0,
    severityLabel: h >= 4 ? 'Large' : h >= 3 ? 'Building' : 'Moderate',
    observedAt: cur.time ? new Date(cur.time + 'Z').toISOString() : new Date().toISOString(),
    validFrom: null, validTo: null,
    lng: 174.77, lat: -41.36,
    areaHint: 'island-bay',
    suburb: null, suburbExact: null,  // filled by stamp() in fetchAllDirect
    geometry: { type: 'Point', coordinates: [174.77, -41.36] },
    value: h, unit: 'm', trend: null, sparkline: null,
    baselineMin: null, baselineMax: null,
    url: 'https://open-meteo.com',
  } as Signal];
}

export interface FetchOutcome {
  sourceId: string;
  status: 'ok' | 'error';
  count: number;
  error?: string;
  at: string;
}

/**
 * Run every browser-safe fetcher. One dead feed must never take the map with
 * it, so failures are captured per source and reported, not thrown. The health
 * strip renders whatever comes back here — including the failures, which is the
 * point.
 */
export async function fetchAllDirect(
  signal?: AbortSignal,
): Promise<{ signals: Signal[]; outcomes: FetchOutcome[] }> {
  const jobs: [string, () => Promise<Signal[]>][] = [
    ['metservice-alerts', () => fetchMetService(signal)],
    ['wcc-road-closures', () => fetchRoadClosures(signal)],
    ['geonet-tilde-sea-level', () => fetchSeaLevel(signal)],
    ['open-meteo-marine', () => fetchMarine(signal)],
  ];

  const settled = await Promise.allSettled(jobs.map(([, fn]) => fn()));
  const signals: Signal[] = [];
  // Mirrors stampSuburbs() in the ingest function: the suburb is derived from
  // the point in one place, so the no-backend path and the database path can
  // never name the same coordinate differently.
  const stamp = (list: Signal[]) => {
    for (const s of list) {
      if (s.lng == null || s.lat == null) continue;
      const m = suburbFor(s.lng, s.lat);
      s.suburb = m?.name ?? null;
      s.suburbExact = m ? m.exact : null;
    }
    return list;
  };
  const outcomes: FetchOutcome[] = [];
  const at = new Date().toISOString();

  settled.forEach((r, i) => {
    const sourceId = jobs[i][0];
    if (r.status === 'fulfilled') {
      signals.push(...stamp(r.value));
      outcomes.push({ sourceId, status: 'ok', count: r.value.length, at });
    } else {
      outcomes.push({
        sourceId,
        status: 'error',
        count: 0,
        error: String(r.reason?.message ?? r.reason).slice(0, 200),
        at,
      });
    }
  });

  return { signals, outcomes };
}

export { UA_NOTE };
