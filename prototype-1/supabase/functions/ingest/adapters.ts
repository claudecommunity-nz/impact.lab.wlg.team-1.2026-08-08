/**
 * One adapter per upstream feed.
 *
 * Each is a pure-ish function: fetch, normalise, return rows. None of them
 * touches the database or writes health — the runner in index.ts does that, so
 * a broken adapter can only ever produce an empty list and an error string.
 *
 * Three of these exist specifically because the browser cannot call them: NZTA
 * delays, NZTA cameras and the AlertHub RSS feed send no
 * Access-Control-Allow-Origin header. That was measured, not assumed.
 */
import { USER_AGENT } from '../_shared/cors.ts';
import { areaFor, inWellington } from './areas.ts';
// Endpoints are resolved from the WCC catalogue by scripts/build_sources.py.
// Nothing in this file writes an upstream URL by hand.
import { ENDPOINTS, WELLINGTON_BBOX } from './endpoints.generated.ts';

export interface SignalRow {
  source_id: string;
  external_id: string;
  tier: 'official' | 'council' | 'measured';
  category: string;
  evidence_basis: 'observed' | 'measured' | 'modelled' | 'forecast';
  headline: string;
  detail: string | null;
  severity: number | null;
  severity_label: string | null;
  observed_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  lng: number | null;
  lat: number | null;
  area_hint: string | null;
  /**
   * Filled by stampSuburbs() in index.ts, not by adapters — the suburb is a
   * pure function of the point, so it is derived once for every feed.
   */
  suburb?: string | null;
  /** False means offshore, and `suburb` is the nearest one within 3 km. */
  suburb_exact?: boolean | null;
  geometry: unknown | null;
  value: number | null;
  unit: string | null;
  trend: 'rising' | 'falling' | 'steady' | null;
  sparkline: number[] | null;
  baseline_min: number | null;
  baseline_max: number | null;
  url: string | null;
  raw: unknown | null;
}

export interface Adapter {
  sourceId: string;
  /** Grouping key for the polite per-host queue. */
  host: string;
  run(): Promise<SignalRow[]>;
}

const TIMEOUT_MS = 8000;

async function getJSON(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

async function arcgis(endpoint: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    // Everything upstream publishes NZTM2000. Ask for 4326 or the pins land in
    // the Atlantic.
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '1000',
    ...extra,
  });
  const fc = await getJSON(`${endpoint}/query?${params}`);
  if (fc.error) throw new Error(fc.error.message ?? 'ArcGIS error');
  return fc;
}

function bboxQuery() {
  const [w, s, e, n] = WELLINGTON_BBOX;
  return {
    geometry: `${w},${s},${e},${n}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
  };
}

function centroid(geom: any): [number, number] | null {
  if (!geom) return null;
  const pts: [number, number][] = [];
  const walk = (c: any): void => {
    if (typeof c?.[0] === 'number' && typeof c?.[1] === 'number') {
      pts.push([c[0], c[1]]);
      return;
    }
    if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geom.coordinates);
  if (!pts.length) return null;
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

const iso = (v: unknown): string | null => {
  const n = typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
};

function severityRank(word: string | null | undefined): number | null {
  if (!word) return null;
  const w = String(word).toLowerCase();
  if (w.includes('extreme')) return 4;
  if (w.includes('severe') || w.includes('major')) return 3;
  if (w.includes('moderate')) return 2;
  if (w.includes('minor')) return 1;
  return 0;
}

const blank = {
  detail: null, severity: null, severity_label: null,
  valid_from: null, valid_to: null, geometry: null,
  value: null, unit: null, trend: null, sparkline: null,
  baseline_min: null, baseline_max: null, raw: null,
} as const;

// ---------------------------------------------------------------------------

const metservice: Adapter = {
  sourceId: 'metservice-alerts',
  host: 'services.arcgis.com',
  async run() {
    const fc = await arcgis(
      ENDPOINTS['metservice-alerts'],
      bboxQuery(),
    );
    return (fc.features ?? []).map((f: any, i: number) => {
      const p = f.properties ?? {};
      const c = centroid(f.geometry);
      const event = p.info_event ?? 'Weather warning';
      return {
        ...blank,
        source_id: 'metservice-alerts',
        external_id: String(p.identifier ?? p.OBJECTID ?? i),
        tier: 'official' as const,
        category: String(event).toLowerCase(),
        evidence_basis: 'forecast' as const,
        headline: p.info_headline ?? `${event} warning`,
        detail: p.info_area_areaDesc ?? null,
        severity: severityRank(p.info_severity),
        // Always the publisher's own wording. The numeric rank is for sorting
        // and is never rendered.
        severity_label:
          [p.info_severity, p.info_event, p.info_urgency].filter(Boolean).join(' · ') || null,
        observed_at: iso(p.sent) ?? iso(p.onset),
        valid_from: iso(p.onset),
        valid_to: iso(p.validto),
        lng: c?.[0] ?? null,
        lat: c?.[1] ?? null,
        area_hint: c ? areaFor(c[0], c[1]) : null,
        geometry: f.geometry ?? null,
        url: 'https://www.metservice.com/warnings/home',
      } as SignalRow;
    });
  },
};

/**
 * WCC street events and road closures.
 *
 * Mostly PLANNED events — the Thorndon Fair, the Newtown Festival — approved
 * months ahead. Showing a scheduled festival alongside storm damage as though
 * they were the same kind of thing is exactly the blurring this project exists
 * to prevent, so anything finished or more than a week out is dropped, and what
 * remains says plainly whether it is in effect now.
 */
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const wccRoads: Adapter = {
  sourceId: 'wcc-road-closures',
  host: 'gis.wcc.govt.nz',
  async run() {
    const fc = await arcgis(
      ENDPOINTS['wcc-road-closures'],
    );
    const now = Date.now();
    const out: SignalRow[] = [];

    for (const [i, f] of (fc.features ?? []).entries()) {
      const p: any = (f as any).properties ?? {};
      const c = centroid((f as any).geometry);
      const start = typeof p.Start_Date === 'number' ? p.Start_Date : null;
      const end = typeof p.End_Date === 'number' ? p.End_Date : null;

      if (end != null && end < now) continue;
      if (start != null && start > now + SEVEN_DAYS) continue;

      const inEffect = start != null && start <= now && (end == null || end >= now);
      const name = (p.Event_Name ?? '').trim() || 'Street event';

      out.push({
        ...blank,
        source_id: 'wcc-road-closures',
        external_id: String(p.OBJECTID ?? i),
        tier: 'council' as const,
        category: inEffect ? 'road' : 'road_planned',
        evidence_basis: 'observed' as const,
        headline: inEffect ? `Road affected now — ${name}` : `Planned closure — ${name}`,
        detail:
          [
            inEffect
              ? 'In effect now.'
              : start
                ? `Planned. Starts ${new Date(start).toLocaleDateString('en-NZ')}.`
                : 'Planned. No start date given.',
            (p.EventDetails ?? '').trim() || null,
          ]
            .filter(Boolean)
            .join(' ') || null,
        severity: inEffect ? 2 : 0,
        severity_label: inEffect ? 'Road closure in effect' : 'Scheduled street event',
        observed_at: iso(start) ?? new Date().toISOString(),
        valid_from: iso(start),
        valid_to: iso(end),
        lng: c?.[0] ?? null,
        lat: c?.[1] ?? null,
        area_hint: c ? areaFor(c[0], c[1]) : null,
        geometry: (f as any).geometry ?? null,
        url: 'https://wellington.govt.nz/roads-and-transport',
      } as SignalRow);
    }
    return out;
  },
};

/**
 * NZTA state highway delays. CORS-blocked, so this can only run server side —
 * one of the three reasons this function exists at all.
 */
const nztaDelays: Adapter = {
  sourceId: 'nzta-delays',
  host: 'www.journeys.nzta.govt.nz',
  async run() {
    const fc = await getJSON(
      ENDPOINTS['nzta-delays'],
    );
    const out: SignalRow[] = [];

    for (const [i, f] of (fc.features ?? []).entries()) {
      const p = f.properties ?? {};
      const c = centroid(f.geometry);
      // National feed. Keep the Wellington region only.
      if (!c || !inWellington(c[0], c[1])) continue;
      if (String(p.Status ?? '').toLowerCase() !== 'active') continue;

      const impact = String(p.Impact ?? '');
      out.push({
        ...blank,
        source_id: 'nzta-delays',
        external_id: String(p.ExternalId ?? p.TasJourneyId ?? i),
        tier: 'council' as const,
        category: 'highway',
        evidence_basis: 'observed' as const,
        headline: `${p.EventType ?? 'Highway event'} — ${p.LocationArea ?? 'State highway'}`,
        detail:
          [p.EventDescription, p.EventComments, p.ExpectedResolutionText]
            .filter(Boolean)
            .join(' ') || null,
        severity: /clos/i.test(impact) ? 3 : /caution|delay/i.test(impact) ? 2 : 1,
        severity_label: impact || null,
        observed_at: p.StartDate ? new Date(p.StartDate + 'Z').toISOString() : null,
        lng: c[0],
        lat: c[1],
        area_hint: areaFor(c[0], c[1]),
        geometry: f.geometry ?? null,
        url: 'https://www.journeys.nzta.govt.nz',
      } as SignalRow);
    }
    return out;
  },
};

/** Emergency Mobile Alerts actually broadcast. Also CORS-blocked. */
const emaRss: Adapter = {
  sourceId: 'ema-rss',
  host: 'alerthub.civildefence.govt.nz',
  async run() {
    const xml = await getText(ENDPOINTS['ema-rss']);
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const pick = (block: string, tag: string) =>
      block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]
        ?.replace(/<!\[CDATA\[|\]\]>/g, '')
        .trim() ?? null;

    return items.map((m, i) => {
      const b = m[1];
      const pub = pick(b, 'pubDate');
      return {
        ...blank,
        source_id: 'ema-rss',
        external_id: pick(b, 'guid') ?? String(i),
        tier: 'official' as const,
        category: 'emergency_alert',
        evidence_basis: 'observed' as const,
        headline: pick(b, 'title') ?? 'Emergency Mobile Alert',
        detail: pick(b, 'description'),
        severity: 4,
        severity_label: 'Emergency Mobile Alert broadcast',
        observed_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        lng: null, lat: null, area_hint: null,
        url: pick(b, 'link') ?? 'https://alerthub.civildefence.govt.nz',
      } as SignalRow;
    });
  },
};

/**
 * GeoNet Tilde detided sea level. The detided residual is the water level with
 * the predictable tide removed, so a rising number is water being pushed in
 * beyond what the tide explains — a genuine storm-surge indicator.
 */
const seaLevel: Adapter = {
  sourceId: 'geonet-tilde-sea-level',
  host: 'tilde.geonet.org.nz',
  async run() {
    const j = await getJSON(
      ENDPOINTS['geonet-tilde-sea-level'],
    );
    const series: { val: number; ts: string }[] = j?.[0]?.data ?? [];
    if (!series.length) return [];

    const last = series[series.length - 1];
    // ~1,440 points per call at 15-second cadence. Keep 24 for a sparkline.
    const step = Math.max(1, Math.floor(series.length / 24));
    const spark = series.filter((_, i) => i % step === 0).map((d) => d.val);
    const delta = last.val - series[0].val;

    return [{
      ...blank,
      source_id: 'geonet-tilde-sea-level',
      external_id: 'WLGT:water-height-detided',
      tier: 'measured' as const,
      category: 'sea_level',
      evidence_basis: 'measured' as const,
      headline: `Sea level at Wellington Harbour, tide removed: ${last.val.toFixed(2)} m`,
      detail:
        `The part of the water level the tide does not explain. ` +
        `${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(2)} m over 6 hours.`,
      observed_at: last.ts,
      lng: 174.7797, lat: -41.2847,
      area_hint: 'wellington-other',
      geometry: { type: 'Point', coordinates: [174.7797, -41.2847] },
      value: last.val, unit: 'm',
      trend: Math.abs(delta) < 0.02 ? 'steady' : delta > 0 ? 'rising' : 'falling',
      sparkline: spark,
      baseline_min: Math.min(...spark),
      baseline_max: Math.max(...spark),
      url: 'https://tilde.geonet.org.nz',
    } as SignalRow];
  },
};

/**
 * Baring Head wave buoy, via Hilltop.
 *
 * Two traps, both verified the hard way: spaces in the site name must be %20
 * and never '+', because Hilltop does not decode '+' and answers "No data for
 * site"; and errors arrive as HTTP 200 with an <Error> element in the body.
 * URLSearchParams emits '+', so the query string is built by hand.
 */
const baringHead: Adapter = {
  sourceId: 'baring-head-waves',
  host: 'hilltop.gw.govt.nz',
  async run() {
    const site = 'Wellington Harbour at Baring Head Wave Buoy (North (A))';
    const measurement = 'Significant Wave Height (Hsig)';
    const url =
      `${ENDPOINTS['baring-head-waves']}?Service=Hilltop&Request=GetData` +
      `&Site=${encodeURIComponent(site)}` +
      `&Measurement=${encodeURIComponent(measurement)}` +
      '&TimeInterval=PT12H';

    const xml = await getText(url);
    if (/<Error>/i.test(xml)) {
      throw new Error(xml.match(/<Error>([\s\S]*?)<\/Error>/i)?.[1]?.trim() ?? 'Hilltop error');
    }

    const entries = [...xml.matchAll(/<E>\s*<T>([^<]+)<\/T>\s*<I1>([^<]+)<\/I1>\s*<\/E>/g)];
    if (!entries.length) return [];

    const vals = entries.map((m) => Number(m[2])).filter(Number.isFinite);
    const lastT = entries[entries.length - 1][1];
    const last = vals[vals.length - 1];
    const delta = last - vals[0];
    const step = Math.max(1, Math.floor(vals.length / 24));

    return [{
      ...blank,
      source_id: 'baring-head-waves',
      external_id: 'baring-head:hsig',
      tier: 'measured' as const,
      category: 'wave',
      evidence_basis: 'measured' as const,
      headline: `Significant wave height at Baring Head: ${last.toFixed(2)} m`,
      detail:
        'Measured by the Greater Wellington wave buoy at the harbour entrance. ' +
        `${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(2)} m over 12 hours.`,
      observed_at: new Date(lastT + '+12:00').toISOString(),
      lng: 174.8703, lat: -41.4083,
      area_hint: null,
      geometry: { type: 'Point', coordinates: [174.8703, -41.4083] },
      value: last, unit: 'm',
      trend: Math.abs(delta) < 0.05 ? 'steady' : delta > 0 ? 'rising' : 'falling',
      sparkline: vals.filter((_, i) => i % step === 0),
      baseline_min: Math.min(...vals),
      baseline_max: Math.max(...vals),
      url: 'https://graphs.gw.govt.nz',
    } as SignalRow];
  },
};

const marine: Adapter = {
  sourceId: 'open-meteo-marine',
  host: 'marine-api.open-meteo.com',
  async run() {
    const j = await getJSON(
      `${ENDPOINTS['open-meteo-marine']}?latitude=-41.36&longitude=174.77` +
        '&current=wave_height,swell_wave_height,wave_period&timezone=UTC',
    );
    const cur = j?.current;
    if (!cur) return [];
    const h = Number(cur.wave_height);

    return [{
      ...blank,
      source_id: 'open-meteo-marine',
      external_id: 'south-coast:marine',
      tier: 'measured' as const,
      category: 'wave',
      evidence_basis: 'forecast' as const,
      headline: `Forecast wave height off the south coast: ${h.toFixed(1)} m`,
      detail:
        `Swell ${Number(cur.swell_wave_height ?? 0).toFixed(1)} m, ` +
        `period ${Number(cur.wave_period ?? 0).toFixed(0)} s. ` +
        'A model forecast for open water, not a measurement at the shore.',
      severity: h >= 4 ? 3 : h >= 3 ? 2 : h >= 2 ? 1 : 0,
      severity_label: h >= 4 ? 'Large' : h >= 3 ? 'Building' : 'Moderate',
      observed_at: cur.time ? new Date(cur.time + 'Z').toISOString() : new Date().toISOString(),
      lng: 174.77, lat: -41.36,
      area_hint: 'island-bay',
      geometry: { type: 'Point', coordinates: [174.77, -41.36] },
      value: h, unit: 'm',
      url: 'https://open-meteo.com',
    } as SignalRow];
  },
};

const wind: Adapter = {
  sourceId: 'open-meteo-forecast',
  host: 'api.open-meteo.com',
  async run() {
    const j = await getJSON(
      `${ENDPOINTS['open-meteo-forecast']}?latitude=-41.3399&longitude=174.7756` +
        '&current=wind_gusts_10m,wind_speed_10m,precipitation&timezone=UTC',
    );
    const cur = j?.current;
    if (!cur) return [];
    const gust = Number(cur.wind_gusts_10m);

    return [{
      ...blank,
      source_id: 'open-meteo-forecast',
      external_id: 'island-bay:wind',
      tier: 'measured' as const,
      category: 'wind',
      evidence_basis: 'forecast' as const,
      headline: `Wind gusting to ${gust.toFixed(0)} km/h at the south coast`,
      detail:
        `Mean wind ${Number(cur.wind_speed_10m ?? 0).toFixed(0)} km/h, ` +
        `precipitation ${Number(cur.precipitation ?? 0).toFixed(1)} mm. Model forecast.`,
      severity: gust >= 120 ? 3 : gust >= 90 ? 2 : gust >= 60 ? 1 : 0,
      severity_label: gust >= 90 ? 'Damaging gusts possible' : 'Normal for Wellington',
      observed_at: cur.time ? new Date(cur.time + 'Z').toISOString() : new Date().toISOString(),
      lng: 174.7756, lat: -41.3399,
      area_hint: 'island-bay',
      geometry: { type: 'Point', coordinates: [174.7756, -41.3399] },
      value: gust, unit: 'km/h',
      url: 'https://open-meteo.com',
    } as SignalRow];
  },
};

/**
 * Wellington Water open jobs.
 *
 * There are around 1,437 of these open across the region, and many were
 * reported months ago — long-running maintenance, not today's conditions. Left
 * unfiltered they bury every warning, gauge and report under a thousand pins,
 * which is the opposite of "one clear view".
 *
 * So: only jobs reported in the last fortnight, newest first, capped. The cap
 * is stated in the UI rather than hidden, because silently truncating and
 * calling it complete is its own kind of dishonesty.
 */
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
export const WW_FAULT_CAP = 60;

const wwFaults: Adapter = {
  sourceId: 'ww-faults',
  host: 'services7.arcgis.com',
  async run() {
    const fc = await arcgis(
      ENDPOINTS['ww-faults'],
      { ...bboxQuery(), orderByFields: 'reportdate DESC' },
    );
    const cutoff = Date.now() - FOURTEEN_DAYS;

    return (fc.features ?? [])
      .map((f: any, i: number) => {
        const p = f.properties ?? {};
        const c = centroid(f.geometry);
        if (!c) return null;

        const reported = typeof p.reportdate === 'number' ? p.reportdate : null;
        if (reported == null || reported < cutoff) return null;

        // "Blockage - Significant" is far more use to a resident than "REPAIR".
        const kind = p.comm_description ?? p.wtypedesc ?? 'Fault';
        const water = p.watertype ? ` (${p.watertype})` : '';

        return {
          ...blank,
          source_id: 'ww-faults',
          external_id: String(p.wonum ?? p.OBJECTID ?? i),
          tier: 'council' as const,
          category: 'water',
          evidence_basis: 'observed' as const,
          headline: `Water network job — ${kind}${water}`,
          detail:
            [p.description, p.wsadd_formattedaddress, p.StatusDescription]
              .filter(Boolean)
              .join(' · ') || null,
          severity: /significant|urgent|high/i.test(String(p.priority) + kind) ? 2 : 1,
          severity_label: [p.StatusDescription, p.priority].filter(Boolean).join(' · ') || null,
          observed_at: iso(reported),
          lng: c[0], lat: c[1],
          area_hint: areaFor(c[0], c[1]),
          geometry: f.geometry ?? null,
          url: 'https://www.wellingtonwater.co.nz/faults-and-outages',
        } as SignalRow;
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime(),
      )
      .slice(0, WW_FAULT_CAP) as SignalRow[];
  },
};

const outages: Adapter = {
  sourceId: 'electricity-outages',
  host: 'services5.arcgis.com',
  async run() {
    const fc = await arcgis(
      ENDPOINTS['electricity-outages'],
      bboxQuery(),
    );
    return (fc.features ?? [])
      .map((f: any, i: number) => {
        const p = f.properties ?? {};
        const c = centroid(f.geometry);
        if (!c) return null;
        const affected = Number(p.customersaffected ?? p.CustomersAffected ?? 0);
        return {
          ...blank,
          source_id: 'electricity-outages',
          external_id: String(p.OBJECTID ?? p.outageid ?? i),
          tier: 'council' as const,
          category: 'power',
          evidence_basis: 'observed' as const,
          headline: affected
            ? `Power out — about ${affected} properties`
            : 'Power outage reported',
          detail:
            [p.company, p.statusdescription ?? p.status, p.cause, p.suburb]
              .filter(Boolean)
              .join(' · ') || null,
          severity: affected > 500 ? 3 : affected > 100 ? 2 : 1,
          severity_label: p.statusdescription ?? p.status ?? 'Outage',
          observed_at: iso(p.starttime) ?? iso(p.StartTime) ?? null,
          valid_to: iso(p.estimatedrestoration) ?? null,
          lng: c[0], lat: c[1],
          area_hint: areaFor(c[0], c[1]),
          geometry: f.geometry ?? null,
          url: 'https://getready.govt.nz',
        } as SignalRow;
      })
      .filter(Boolean) as SignalRow[];
  },
};

/**
 * NEMA CAP alerts — Emergency Mobile Alert broadcast areas.
 *
 * This layer holds live AND historic records, and the supplementary catalogue
 * warns as much. Left unfiltered it hands you a three-week-old "TSUNAMI —
 * Evacuate Immediately" and a "Nationwide Test 2026" as though both were in
 * force right now. On a project about telling people which information to
 * trust, presenting an expired evacuation order as current would be the single
 * worst thing this app could do.
 *
 * So three filters, all on the publisher's own fields:
 *   status = 'Actual'  drops Test, Exercise, Draft and System messages
 *   historic           drops anything NEMA has already retired
 *   expires >= now     drops alerts that are no longer in force
 */
const nemaCap: Adapter = {
  sourceId: 'nema-cap-alerts',
  host: 'services5.arcgis.com',
  async run() {
    const fc = await arcgis(
      ENDPOINTS['nema-cap-alerts'],
      bboxQuery(),
    );
    const now = Date.now();

    return (fc.features ?? [])
      .map((f: any, i: number) => {
        const p = f.properties ?? {};

        // Real alerts only — never a test or an exercise.
        if (String(p.status ?? '').toLowerCase() !== 'actual') return null;
        if (p.historic === 1 || p.historic === true) return null;
        if (/\btest\b|\bexercise\b/i.test(String(p.headline ?? '') + String(p.event ?? ''))) return null;

        // Still in force. A zero-duration record (expires == sent) has already
        // lapsed and is history, not news.
        const expires = typeof p.expires === 'number' ? p.expires : null;
        const sent = typeof p.sent === 'number' ? p.sent : null;
        if (expires == null || expires <= now) return null;
        if (sent != null && expires <= sent) return null;

        const c = centroid(f.geometry);
        return {
          ...blank,
          source_id: 'nema-cap-alerts',
          external_id: String(p.identifier ?? p.OBJECTID ?? i),
          tier: 'official' as const,
          category: 'emergency_alert',
          evidence_basis: 'observed' as const,
          headline: p.headline ?? p.event ?? 'Emergency Mobile Alert area',
          detail: [p.description, p.sender_name].filter(Boolean).join(' · ') || null,
          severity: severityRank(p.severity),
          severity_label: [p.severity, p.event].filter(Boolean).join(' · ') || null,
          observed_at: iso(sent) ?? iso(p.effective) ?? null,
          valid_to: iso(expires),
          lng: c?.[0] ?? null,
          lat: c?.[1] ?? null,
          area_hint: c ? areaFor(c[0], c[1]) : null,
          geometry: f.geometry ?? null,
          url: 'https://getready.govt.nz',
        } as SignalRow;
      })
      .filter(Boolean) as SignalRow[];
  },
};

export const ADAPTERS: Adapter[] = [
  metservice,
  nemaCap,
  emaRss,
  wccRoads,
  nztaDelays,
  wwFaults,
  outages,
  seaLevel,
  baringHead,
  marine,
  wind,
];
