-- Scenario mode: a synthetic south coast southerly, for demonstrating the app
-- when nothing is happening. On the morning of 8 August 2026 MetService had
-- three warnings in force nationwide and none for Wellington, so this is not a
-- hypothetical need.
--
-- Contamination is prevented STRUCTURALLY, not by convention:
--
--   * separate table — `signals_public` never references it, so simulated rows
--     cannot reach the default GeoJSON output by any code path
--   * the endpoint requires an explicit ?scenario= parameter to read it at all
--   * responses stamp simulation:true at both feature and collection level, so
--     a downstream consumer of the common operating picture cannot ingest it by
--     accident even if a human misconfigures a URL
--   * every external_id is prefixed 'sim:' — a tripwire you can assert on. If a
--     'sim:' id ever appears in `signals`, that is a bug.

CREATE TABLE public.scenario_signals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id    text NOT NULL,

  -- Minutes from scenario start at which this item appears. The client holds a
  -- clock and renders rows where offset_minutes <= clock.
  offset_minutes integer NOT NULL CHECK (offset_minutes >= 0),

  external_id    text NOT NULL CHECK (external_id LIKE 'sim:%'),
  source_id      text NOT NULL,
  source_name    text NOT NULL,
  publisher      text NOT NULL,

  tier           text NOT NULL
                   CHECK (tier IN ('official','council','measured','community')),
  category       text NOT NULL,
  evidence_basis text NOT NULL
                   CHECK (evidence_basis IN ('observed','measured','modelled','forecast','reported')),

  headline       text NOT NULL,
  detail         text,
  severity       smallint CHECK (severity BETWEEN 0 AND 4),
  severity_label text,

  lng            double precision,
  lat            double precision,
  area_hint      text,
  geometry       jsonb,

  value          numeric,
  unit           text,
  trend          text CHECK (trend IN ('rising','falling','steady')),
  -- Community rows only: how many residents had reported this by this point.
  report_count   integer,

  UNIQUE (scenario_id, external_id)
);

CREATE INDEX scenario_signals_playback
  ON public.scenario_signals (scenario_id, offset_minutes);

ALTER TABLE public.scenario_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon reads scenarios"
  ON public.scenario_signals FOR SELECT TO anon USING (TRUE);

GRANT SELECT ON public.scenario_signals TO anon;
GRANT ALL    ON public.scenario_signals TO service_role;

COMMENT ON TABLE public.scenario_signals IS
  'Simulated storm fixture for demos. Never joined into signals_public; reachable only via an explicit ?scenario= request.';
