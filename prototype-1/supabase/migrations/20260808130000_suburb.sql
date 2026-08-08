-- Official suburb name for a signal, from WCC's own boundary polygons.
--
-- This sits alongside area_hint rather than replacing it, because the two
-- answer different questions. area_hint is a distance to one of the five south
-- coast bays and is what personalisation ranks on. suburb is the name Council
-- would use for the place, and is what the interface shows. Collapsing them
-- would mean either naming a warning after a circle we drew ourselves, or
-- ranking relevance by a polygon that is 14 km² in Brooklyn and 0.26 km² at
-- Moa Point.
--
-- suburb_exact = false means the point is outside every boundary and this is
-- the nearest suburb within 3 km — a wave buoy, a sea-level gauge, waves over
-- a seaward road edge. The interface must word those as "off X", never "in X".

ALTER TABLE public.signals
  ADD COLUMN suburb       text,
  ADD COLUMN suburb_exact boolean;

ALTER TABLE public.community_reports
  ADD COLUMN suburb       text,
  ADD COLUMN suburb_exact boolean;

CREATE INDEX signals_suburb_observed
  ON public.signals (suburb, observed_at DESC);
CREATE INDEX community_reports_suburb_observed
  ON public.community_reports (suburb, observed_at DESC);

COMMENT ON COLUMN public.signals.suburb IS
  'WCC suburb name for the point. Naming only — never rank proximity on this; use area_hint.';
COMMENT ON COLUMN public.signals.suburb_exact IS
  'TRUE when inside the boundary. FALSE when offshore and this is the nearest suburb within 3 km.';

-- A public submitter may state a suburb no more than they may state a status:
-- both are derived, and letting a report name its own suburb would let it
-- place itself somewhere it is not. The ingest path writes these under
-- service_role. The existing column-level INSERT grant already omits them, so
-- there is nothing to revoke — this comment records that it is deliberate.
COMMENT ON COLUMN public.community_reports.suburb IS
  'Derived from the submitted point, never submitted. Not in the anon INSERT grant, by design.';

-- The view is CREATE OR REPLACE-able only while column order and types hold,
-- and we are adding columns, so it is dropped and rebuilt.
DROP VIEW IF EXISTS public.signals_public;

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
    s.suburb,
    s.suburb_exact,
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
    r.suburb,
    r.suburb_exact,
    jsonb_build_object('type','Point','coordinates', jsonb_build_array(r.lng, r.lat)),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    r.status,
    -- Unchanged from migration 120300: how many OTHER people reported the same
    -- kind of thing nearby, within three hours either side. Still grouped on
    -- area_hint, NOT on suburb. Suburb polygons are too uneven to corroborate
    -- across — two reports 6 km apart are both "Brooklyn", and counting them
    -- together would inflate corroboration exactly where the interface can
    -- least afford it. This is a count of reports, never of confirmations.
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

GRANT SELECT ON public.signals_public TO anon, service_role;

COMMENT ON VIEW public.signals_public IS
  'Union of attributed signals and unverified community reports, with provenance. Serialised by the signals-geojson function.';
