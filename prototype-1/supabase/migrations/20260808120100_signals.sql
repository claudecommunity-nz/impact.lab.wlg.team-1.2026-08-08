-- Everything ingested from an attributable upstream feed, normalised.
--
-- Community reports deliberately do NOT live here — they are a separate table
-- with a separate grant model, so an unverified public post can never be
-- confused for, or promoted into, an attributed source. See migration 120200.

CREATE TABLE public.signals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      text NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,

  -- Upstream's own stable id. Combined with source_id this is the upsert key,
  -- so re-running ingest updates in place instead of duplicating.
  external_id    text NOT NULL,

  tier           text NOT NULL CHECK (tier IN ('official','council','measured')),
  category       text NOT NULL,
  evidence_basis text NOT NULL
                   CHECK (evidence_basis IN ('observed','measured','modelled','forecast')),

  headline       text NOT NULL,
  detail         text,

  -- Numeric only so the feed can be ordered. NEVER rendered: the UI always
  -- shows severity_label, which is the publisher's own wording.
  severity       smallint CHECK (severity BETWEEN 0 AND 4),
  severity_label text,

  -- When the source says it happened or was issued. Distinct from ingested_at,
  -- which is when we fetched it. The gap between them is the staleness the UI
  -- has to surface.
  observed_at    timestamptz,
  valid_from     timestamptz,
  valid_to       timestamptz,
  ingested_at    timestamptz NOT NULL DEFAULT now(),

  lng            double precision,
  lat            double precision,
  -- Coarse south coast area, computed in the adapter by point-in-polygon. Lets
  -- personalisation be a string comparison instead of a spatial query, which is
  -- why this schema needs no PostGIS.
  area_hint      text,
  geometry       jsonb,

  -- Measured tier. One row per gauge per measurement, upserted, always latest.
  value          numeric,
  unit           text,
  trend          text CHECK (trend IN ('rising','falling','steady')),
  -- Up to ~24 downsampled points for a card sparkline. GeoNet Tilde returns
  -- ~1,440 readings per call; storing raw time series is not the job here.
  sparkline      numeric[],
  -- Normal range for this gauge, from the ArcGIS registry. Turns a bare number
  -- into "high for this river".
  baseline_min   numeric,
  baseline_max   numeric,

  url            text,
  raw            jsonb,

  UNIQUE (source_id, external_id)
);

CREATE INDEX signals_area_observed ON public.signals (area_hint, observed_at DESC);
CREATE INDEX signals_tier_severity ON public.signals (tier, severity DESC);
CREATE INDEX signals_bbox          ON public.signals (lng, lat);
CREATE INDEX signals_observed      ON public.signals (observed_at DESC);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon reads signals"
  ON public.signals FOR SELECT TO anon USING (TRUE);

-- SELECT only for anon. Writes are the ingest function's job, under service_role.
GRANT SELECT ON public.signals TO anon;
GRANT ALL    ON public.signals TO service_role;

COMMENT ON TABLE public.signals IS
  'Normalised items from attributable upstream feeds. Community reports live in community_reports, never here.';
COMMENT ON COLUMN public.signals.evidence_basis IS
  'How the item is known (observed/measured/modelled/forecast), as distinct from tier, which is who said it.';
