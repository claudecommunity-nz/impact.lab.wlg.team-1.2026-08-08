-- The composable output.
--
-- One view unioning attributed signals with community reports, each carrying
-- its publisher, licence and attribution. This is what /functions/v1/signals-geojson
-- serialises, and what other Impact Lab teams consume to slot this module into
-- the shared common operating picture.
--
-- security_invoker = on is essential: without it the view runs as its definer
-- and bypasses RLS on the base tables.

CREATE VIEW public.signals_public
WITH (security_invoker = on) AS

  SELECT
    s.id,
    s.source_id,
    src.name        AS source_name,
    src.publisher,
    src.attribution,
    src.licence,
    src.homepage,
    s.tier,
    s.category,
    s.evidence_basis,
    s.headline,
    s.detail,
    s.severity,
    s.severity_label,
    s.observed_at,
    s.valid_from,
    s.valid_to,
    s.ingested_at,
    s.lng,
    s.lat,
    s.area_hint,
    s.geometry,
    s.value,
    s.unit,
    s.trend,
    s.sparkline,
    s.baseline_min,
    s.baseline_max,
    s.url,
    NULL::text   AS status,
    NULL::bigint AS corroboration_count
  FROM public.signals s
  JOIN public.sources src ON src.id = s.source_id

  UNION ALL

  SELECT
    r.id,
    'community-reports',
    'Community reports',
    'Members of the public',
    'Submitted by members of the public. Not verified by Council.',
    NULL, NULL,
    'community',
    r.category,
    'reported',
    r.headline,
    r.detail,
    NULL, NULL,
    r.observed_at,
    NULL, NULL,
    r.created_at,
    r.lng,
    r.lat,
    r.area_hint,
    jsonb_build_object('type','Point','coordinates', jsonb_build_array(r.lng, r.lat)),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    r.status,
    -- How many OTHER people reported the same kind of thing, in the same area,
    -- within three hours either side. This is a count of reports, never of
    -- confirmations, and the UI must word it that way.
    (SELECT count(*)
       FROM public.community_reports c2
      WHERE c2.id <> r.id
        AND c2.category  = r.category
        AND c2.area_hint = r.area_hint
        AND c2.status <> 'withdrawn'
        AND c2.observed_at BETWEEN r.observed_at - interval '3 hours'
                               AND r.observed_at + interval '3 hours')
  FROM public.community_reports r
  WHERE r.status <> 'withdrawn';

-- RLS on the base tables is not sufficient; the view needs its own GRANT.
GRANT SELECT ON public.signals_public TO anon, service_role;

COMMENT ON VIEW public.signals_public IS
  'Union of attributed signals and unverified community reports, with provenance. Serialised by the signals-geojson function.';
