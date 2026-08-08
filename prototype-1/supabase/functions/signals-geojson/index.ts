/**
 * The composable output.
 *
 * Every prototype at this Impact Lab is meant to be a module in a shared common
 * operating picture. This endpoint is our half of that contract: an open,
 * keyless GeoJSON FeatureCollection that any other team's map can consume, with
 * provenance travelling on every single feature.
 *
 *   GET /functions/v1/signals-geojson
 *       ?tier=official,council,measured,community
 *       &bbox=174.62,-41.36,174.94,-41.14
 *       &area=island-bay
 *       &since=2026-08-08T00:00:00Z
 *       &scenario=south-coast-southerly     <- simulated data, opt-in ONLY
 *
 * The scenario parameter is the only way to reach simulated rows. They live in
 * a different table that this query never joins by default, so a consumer that
 * does not ask for them cannot receive them by accident.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS_HEADERS, DISCLAIMER, json, preflight } from '../_shared/cors.ts';

const VALID_TIERS = ['official', 'council', 'measured', 'community'];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const scenarioId = url.searchParams.get('scenario');
  const tiers = (url.searchParams.get('tier') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => VALID_TIERS.includes(t));

  try {
    const features = scenarioId
      ? await scenarioFeatures(supabase, scenarioId, url)
      : await liveFeatures(supabase, tiers, url);

    // Which sources contributed, and how healthy each was at the time. A
    // consumer should be able to tell that our MetService adapter was failing
    // without having to ask us.
    const { data: sources } = await supabase
      .from('sources')
      .select('id,name,publisher,tier,licence,attribution,homepage,last_status,last_success_at,last_item_count')
      .order('display_order');

    return new Response(
      JSON.stringify({
        type: 'FeatureCollection',
        properties: {
          generated_at: new Date().toISOString(),
          simulation: Boolean(scenarioId),
          scenario_id: scenarioId ?? null,
          feature_count: features.length,
          disclaimer: DISCLAIMER,
          tier_meaning: {
            official: 'Issued by an official warning authority.',
            council: 'Reported by the Council or a network operator.',
            measured: 'A reading from an instrument.',
            community: 'Reported by a member of the public. NOT verified by Council.',
          },
          sources: sources ?? [],
        },
        features,
      }),
      {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/geo+json; charset=utf-8',
          // Be kind to whoever polls this, and to the council servers behind it.
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  } catch (err) {
    return json({ error: String((err as Error).message ?? err) }, { status: 500 });
  }
});

async function liveFeatures(
  supabase: ReturnType<typeof createClient>,
  tiers: string[],
  url: URL,
) {
  let q = supabase.from('signals_public').select('*');

  if (tiers.length) q = q.in('tier', tiers);

  const area = url.searchParams.get('area');
  if (area) q = q.eq('area_hint', area);

  const since = url.searchParams.get('since');
  if (since) q = q.gte('observed_at', since);

  const bbox = parseBbox(url.searchParams.get('bbox'));
  if (bbox) {
    const [w, s, e, n] = bbox;
    q = q.gte('lng', w).lte('lng', e).gte('lat', s).lte('lat', n);
  }

  const { data, error } = await q.order('observed_at', { ascending: false }).limit(2000);
  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => toFeature(r, false));
}

async function scenarioFeatures(
  supabase: ReturnType<typeof createClient>,
  scenarioId: string,
  url: URL,
) {
  // Playback position. Everything at or before this offset has "happened".
  const at = Number(url.searchParams.get('at') ?? '360');

  const clock = Number.isFinite(at) ? at : 360;

  const { data, error } = await supabase
    .from('scenario_signals')
    .select('*')
    .eq('scenario_id', scenarioId)
    .lte('offset_minutes', clock)
    .order('offset_minutes', { ascending: true });
  if (error) throw error;

  // Give each row a timestamp relative to the playback position, so "now" in
  // the scenario is the scrubber position. Without this every card reads "no
  // timestamp" and greys out as stale, which hides the very thing the scenario
  // exists to show — an event unfolding, with recent items ranked above old
  // ones exactly as they would be in live data.
  const nowMs = Date.now();
  return (data ?? []).map((r: Record<string, any>) => {
    const minutesAgo = clock - Number(r.offset_minutes ?? 0);
    return toFeature(
      { ...r, observed_at: new Date(nowMs - minutesAgo * 60_000).toISOString() },
      true,
    );
  });
}

function parseBbox(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  return parts.length === 4 && parts.every(Number.isFinite)
    ? (parts as [number, number, number, number])
    : null;
}

function toFeature(r: Record<string, any>, simulated: boolean): GeoJSON.Feature {
  const geometry =
    r.geometry ??
    (r.lng != null && r.lat != null
      ? { type: 'Point', coordinates: [r.lng, r.lat] }
      : null);

  const observedAt = r.observed_at ?? null;
  const ageSeconds = observedAt
    ? Math.round((Date.now() - new Date(observedAt).getTime()) / 1000)
    : null;

  return {
    type: 'Feature',
    geometry,
    properties: {
      id: r.id,
      source_id: r.source_id,
      source_name: r.source_name,
      publisher: r.publisher,
      attribution: r.attribution,
      licence: r.licence ?? null,
      homepage: r.homepage ?? null,

      tier: r.tier,
      category: r.category,
      // Who said it (tier) and how they know (evidence_basis) are different
      // questions, and a consumer needs both to render this responsibly.
      evidence_basis: r.evidence_basis,

      headline: r.headline,
      detail: r.detail ?? null,
      severity_label: r.severity_label ?? null,

      observed_at: observedAt,
      // Saves every consumer from recomputing staleness, and makes it obvious
      // when a gauge last reported years ago.
      age_seconds: ageSeconds,
      valid_from: r.valid_from ?? null,
      valid_to: r.valid_to ?? null,

      area_hint: r.area_hint ?? null,
      value: r.value ?? null,
      unit: r.unit ?? null,
      trend: r.trend ?? null,
      url: r.url ?? null,

      // Community only. Never absent when tier === 'community', so a consumer
      // cannot render one of these as though it were confirmed.
      status: r.tier === 'community' ? (r.status ?? 'unverified') : null,
      report_count:
        r.tier === 'community'
          ? (r.report_count ?? (r.corroboration_count ?? 0) + 1)
          : null,
      unverified: r.tier === 'community',

      simulated,
    },
  } as GeoJSON.Feature;
}
