-- Reports submitted by members of the public. Deliberately a separate table
-- from `signals`.
--
-- There is no login in this prototype, so anyone can post. The design goal is
-- not to stop that — it is to make the UNVERIFIED state impossible to forge.
-- Four layers do it, cheapest first:
--
--   1. CHECK constraints        geographic fence, length caps, category enum
--   2. Column-level GRANT       anon has no privilege on `status` or `is_seed`
--   3. Policy WITH CHECK        belt and braces on the same two columns
--   4. Rate-limit trigger       5 reports per device per 10 minutes
--
-- Layer 2 is the important one. anon cannot mark anything confirmed because the
-- privilege to write that column was never granted, so no policy bug can leak
-- it. A real deployment needs moderation and probably attestation; this makes
-- the unverified state unspoofable rather than pretending to have solved trust.

CREATE TABLE public.community_reports (
  -- uuid rather than an identity column: no sequence privilege to grant anon.
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Random per-browser id from localStorage. Not an account, not a person, and
  -- deliberately not linkable to one. Used only for rate limiting.
  device_id   text NOT NULL CHECK (char_length(device_id) BETWEEN 8 AND 64),

  category    text NOT NULL CHECK (category IN (
                'waves_over_road','surface_flooding','road_blocked','slip',
                'debris','access_unsafe','wind_damage','power_out','all_clear')),

  headline    text NOT NULL CHECK (char_length(headline) BETWEEN 3 AND 120),
  detail      text CHECK (char_length(detail) <= 500),

  -- Geographic fence: Wellington City bbox, matching wcc_gis.WELLINGTON.
  lng         double precision NOT NULL CHECK (lng BETWEEN 174.62 AND 174.94),
  lat         double precision NOT NULL CHECK (lat BETWEEN -41.36 AND -41.14),
  area_hint   text,

  observed_at timestamptz NOT NULL DEFAULT now()
                CHECK (observed_at <= now() + interval '5 minutes'
                   AND observed_at >= now() - interval '24 hours'),
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Only ever set by Council-side tooling under service_role. anon has no
  -- column privilege here, so a submission is always born 'unverified'.
  status      text NOT NULL DEFAULT 'unverified'
                CHECK (status IN ('unverified','council_reviewing','council_confirmed','withdrawn')),

  is_seed     boolean NOT NULL DEFAULT false
);

CREATE INDEX community_reports_area_observed
  ON public.community_reports (area_hint, observed_at DESC);
CREATE INDEX community_reports_device_created
  ON public.community_reports (device_id, created_at DESC);

-- Rate limit. SECURITY DEFINER so it can count rows the caller cannot see,
-- with search_path pinned per Supabase's guidance.
CREATE OR REPLACE FUNCTION public.enforce_report_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent integer;
BEGIN
  SELECT count(*) INTO recent
    FROM public.community_reports
   WHERE device_id = NEW.device_id
     AND created_at > now() - interval '10 minutes';

  IF recent >= 5 THEN
    RAISE EXCEPTION
      'Too many reports from this device in the last 10 minutes. Try again shortly.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER community_reports_rate_limit
  BEFORE INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_report_rate_limit();

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon reads live reports"
  ON public.community_reports FOR SELECT TO anon
  USING (status <> 'withdrawn');

CREATE POLICY "anon submits unverified reports"
  ON public.community_reports FOR INSERT TO anon
  WITH CHECK (status = 'unverified' AND is_seed = false);

GRANT SELECT ON public.community_reports TO anon;

-- The load-bearing line. `status` and `is_seed` are absent, so anon physically
-- cannot set them. No UPDATE or DELETE is granted to anon at all.
GRANT INSERT (device_id, category, headline, detail, lng, lat, area_hint, observed_at)
  ON public.community_reports TO anon;

GRANT ALL ON public.community_reports TO service_role;

COMMENT ON TABLE public.community_reports IS
  'Unverified public submissions. Separate from signals by design; anon has no column privilege on status, so reports cannot be self-confirmed.';
