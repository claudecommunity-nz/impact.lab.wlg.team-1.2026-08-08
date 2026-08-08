-- Seed data. Applied after seed_sources.sql (which is generated).
--
-- Two things live here: a set of community reports so the map is not empty on
-- a calm day, and the south coast southerly scenario fixture.
--
-- No real person appears in any of this. Reports are attributed to random
-- device ids, carry no names or contact details, and say nothing that could
-- identify a household. This repo is public.

-- ---------------------------------------------------------------------------
-- Community reports.
--
-- is_seed = true marks these as demonstration data. anon has no column
-- privilege on is_seed, so nothing submitted through the app can pretend to be
-- one of these, and nothing here can pretend to have been confirmed: every row
-- keeps the default status of 'unverified'.
--
-- Times are relative to now() so they are always plausibly recent, and inside
-- the 24-hour window the CHECK constraint allows.
--
-- Every coordinate below sits on the carriageway its own text names, taken from
-- WCC's Transportation/Roads layer, inside the suburb its own text names.
--
-- They were eyeballed before, and the suburb lookup made that visible the
-- moment it was added: two reports both saying "Owhiro Bay Parade" resolved to
-- different suburbs, and one saying "Moa Point" landed in the sea. A demo that
-- labels its own example data with the wrong place argues against the thing
-- this prototype is for. If you add a report here, put it on the road you are
-- naming — `suburb_for()` will tell you if you have not.
-- ---------------------------------------------------------------------------
INSERT INTO public.community_reports
  (device_id, category, headline, detail, lng, lat, area_hint, observed_at, is_seed)
VALUES
  ('seed-0000000001', 'waves_over_road',
   'Spray coming over The Esplanade',
   'Sea spray reaching the footpath near the shops. Passable but wet.',
   174.77836, -41.3453, 'island-bay', now() - interval '25 minutes', true),

  ('seed-0000000002', 'waves_over_road',
   'Waves across the road at the Esplanade',
   'Water crossing both lanes between the surf club and the playground.',
   174.77004, -41.34464, 'island-bay', now() - interval '40 minutes', true),

  ('seed-0000000003', 'surface_flooding',
   'Water pooling at the Parade bus stop',
   'About ankle deep by the kerb, drain looks blocked.',
   174.77309, -41.33482, 'island-bay', now() - interval '1 hour 10 minutes', true),

  ('seed-0000000004', 'waves_over_road',
   'Big sets washing over at Owhiro Bay Parade',
   'Stones and weed across the road near the quarry end.',
   174.75064, -41.34858, 'owhiro-bay', now() - interval '35 minutes', true),

  ('seed-0000000005', 'debris',
   'Gravel and driftwood on Owhiro Bay Parade',
   'Enough to slow a car right down. One lane effectively.',
   174.75757, -41.34462, 'owhiro-bay', now() - interval '55 minutes', true),

  ('seed-0000000006', 'access_unsafe',
   'Would not walk the Owhiro Bay footpath right now',
   'Sea side of the road is taking regular hits.',
   174.76046, -41.34626, 'owhiro-bay', now() - interval '20 minutes', true),

  ('seed-0000000007', 'surface_flooding',
   'Surface flooding on Houghton Bay Road',
   'Water across the low point near the corner.',
   174.78944, -41.34523, 'houghton-bay', now() - interval '1 hour 30 minutes', true),

  ('seed-0000000008', 'slip',
   'Small slip on the bank above Houghton Bay Road',
   'Mud and rock on the verge, road still clear.',
   174.78704, -41.33193, 'houghton-bay', now() - interval '2 hours 15 minutes', true),

  ('seed-0000000009', 'wind_damage',
   'Trampoline blown onto Lyall Parade',
   'Someone has dragged it onto the grass but watch out.',
   174.79536, -41.32744, 'lyall-bay', now() - interval '50 minutes', true),

  ('seed-0000000010', 'surface_flooding',
   'Water over the path at the Lyall Bay end of Queens Drive',
   'Fine in a car, not fine on foot.',
   174.79349, -41.32807, 'lyall-bay', now() - interval '1 hour 45 minutes', true),

  ('seed-0000000011', 'road_blocked',
   'Moa Point Road down to one lane',
   'Cones out, someone clearing stones off the seaward side.',
   174.81277, -41.34208, 'moa-point', now() - interval '1 hour 5 minutes', true),

  ('seed-0000000012', 'waves_over_road',
   'Swell hitting the wall at Moa Point',
   'Coming over in sets, road wet the whole way along.',
   174.81678, -41.34336, 'moa-point', now() - interval '30 minutes', true),

  ('seed-0000000013', 'power_out',
   'Power out on our street in Houghton Bay',
   'Whole block as far as I can tell. Reported it already.',
   174.78737, -41.34284, 'houghton-bay', now() - interval '3 hours', true),

  ('seed-0000000014', 'debris',
   'Branch down across the footpath, Melbourne Road',
   'Walkable if you step onto the road, careful with a pram.',
   174.77648, -41.33048, 'island-bay', now() - interval '2 hours 40 minutes', true),

  ('seed-0000000015', 'all_clear',
   'Esplanade looks clear again now',
   'Tide has dropped, road is just wet. Still gritty underfoot.',
   174.7605, -41.34729, 'island-bay', now() - interval '8 minutes', true);


-- ---------------------------------------------------------------------------
-- Scenario: a south coast southerly.
--
-- Needed because the demo may land on a calm day — on the morning of the build
-- MetService had three warnings in force nationwide and none for Wellington.
--
-- offset_minutes is the playback clock. The client renders rows at or before
-- the current position, so dragging the scrubber makes the event unfold:
-- warning issued, swell builds, first residents report spray, Council closes a
-- road, corroboration climbs, power goes out, warning upgraded, then easing.
--
-- Every external_id is prefixed 'sim:' as a tripwire. These rows are in their
-- own table which signals_public never references, so they cannot reach the
-- default GeoJSON output by any code path.
-- ---------------------------------------------------------------------------
INSERT INTO public.scenario_signals
  (scenario_id, offset_minutes, external_id, source_id, source_name, publisher,
   tier, category, evidence_basis, headline, detail, severity, severity_label,
   lng, lat, area_hint, value, unit, trend, report_count)
VALUES
  -- T+0 — the forecast arrives
  ('south-coast-southerly', 0, 'sim:ms-wind-1', 'metservice-alerts',
   'MetService severe weather warnings', 'MetService', 'official', 'wind', 'forecast',
   'Strong Wind Watch for Wellington',
   'Southerly rising through the afternoon. Gusts may approach severe criteria about the south coast.',
   2, 'Moderate · wind · Expected', 174.7756, -41.3399, 'island-bay',
   NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 0, 'sim:marine-1', 'open-meteo-marine',
   'Marine forecast — waves and swell', 'Open-Meteo', 'measured', 'wave', 'forecast',
   'Forecast wave height off the south coast: 3.2 m',
   'Southerly swell building. A model forecast for open water, not a measurement at the shore.',
   2, 'Building', 174.77, -41.36, 'island-bay', 3.2, 'm', 'rising', NULL),

  -- T+45 — instruments start to move
  ('south-coast-southerly', 45, 'sim:hsig-1', 'baring-head-waves',
   'Significant wave height, Baring Head', 'Greater Wellington Regional Council',
   'measured', 'wave', 'measured',
   'Significant wave height at Baring Head: 3.8 m',
   'Measured by the Greater Wellington wave buoy at the harbour entrance. Up 2.6 m in six hours.',
   NULL, NULL, 174.8703, -41.4083, NULL, 3.8, 'm', 'rising', NULL),

  ('south-coast-southerly', 45, 'sim:tilde-1', 'geonet-tilde-sea-level',
   'Sea level at Wellington Harbour (detided)', 'GeoNet / GNS Science',
   'measured', 'sea_level', 'measured',
   'Sea level at Wellington Harbour, tide removed: 0.18 m above normal',
   'The part of the water level the tide does not explain. Rising.',
   NULL, NULL, 174.7797, -41.2847, 'wellington-other', 0.18, 'm', 'rising', NULL),

  -- T+90 — residents see it before any official source does
  ('south-coast-southerly', 90, 'sim:cr-1', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'waves_over_road', 'reported',
   'Spray coming right over the Esplanade',
   'Getting hard to walk along the sea side.',
   NULL, NULL, 174.7748, -41.3437, 'island-bay', NULL, NULL, NULL, 1),

  ('south-coast-southerly', 90, 'sim:cr-2', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'waves_over_road', 'reported',
   'Waves over the road at Owhiro Bay Parade',
   'Stones washing across near the quarry.',
   NULL, NULL, 174.7612, -41.3461, 'owhiro-bay', NULL, NULL, NULL, 1),

  -- T+120 — Council acts on what residents saw
  ('south-coast-southerly', 120, 'sim:wcc-1', 'wcc-road-closures',
   'Council road closures and street events', 'Wellington City Council',
   'council', 'road', 'observed',
   'Road affected now — The Esplanade, seaward lane closed',
   'In effect now. Seaward lane closed between the surf club and Shorland Park because of wave overtopping.',
   2, 'Road closure in effect', 174.7755, -41.3440, 'island-bay',
   NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 120, 'sim:nzta-1', 'nzta-delays',
   'State highway delays and hazards', 'NZ Transport Agency Waka Kotahi',
   'council', 'highway', 'observed',
   'Wind — SH1 Ngauranga to Petone',
   'High-sided vehicles and motorcycles advised to take care. Southerly gusts across the exposed section.',
   2, 'Caution', 174.8180, -41.2380, 'wellington-other', NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 120, 'sim:ms-wind-2', 'metservice-alerts',
   'MetService severe weather warnings', 'MetService', 'official', 'wind', 'forecast',
   'Severe Wind Warning for Wellington',
   'Southerly gusts up to 120 km/h in exposed places. Upgraded from a watch.',
   3, 'Severe · wind · Immediate', 174.7756, -41.3399, 'island-bay',
   NULL, NULL, NULL, NULL),

  -- T+150 — more people report the same thing
  ('south-coast-southerly', 150, 'sim:cr-3', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'waves_over_road', 'reported',
   'Water across both lanes on the Esplanade',
   'Would not drive a small car through it.',
   NULL, NULL, 174.7762, -41.3442, 'island-bay', NULL, NULL, NULL, 4),

  ('south-coast-southerly', 150, 'sim:cr-4', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'surface_flooding', 'reported',
   'Surface flooding on Houghton Bay Road',
   'Low point by the corner is filling up.',
   NULL, NULL, 174.7893, -41.3378, 'houghton-bay', NULL, NULL, NULL, 2),

  ('south-coast-southerly', 150, 'sim:cr-5', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'access_unsafe', 'reported',
   'Footpath at Owhiro Bay not safe on foot',
   'Regular hits, gravel everywhere. Turned back with the dog.',
   NULL, NULL, 174.7620, -41.3458, 'owhiro-bay', NULL, NULL, NULL, 3),

  -- T+180 — infrastructure starts to fail
  ('south-coast-southerly', 180, 'sim:power-1', 'electricity-outages',
   'Electricity outages', 'NEMA / lines companies', 'council', 'power', 'observed',
   'Power out — about 120 properties',
   'Wellington Electricity · Under investigation · Owhiro Bay and part of Island Bay.',
   2, 'Under investigation', 174.7640, -41.3440, 'owhiro-bay', NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 180, 'sim:ww-1', 'ww-faults',
   'Water network faults', 'Wellington Water', 'council', 'water', 'observed',
   'Water network job — Blockage - Significant (Storm Water)',
   'Moa Point Road · Under Investigation · Surface water not draining.',
   2, 'Under Investigation · High', 174.8110, -41.3420, 'moa-point', NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 180, 'sim:hsig-2', 'baring-head-waves',
   'Significant wave height, Baring Head', 'Greater Wellington Regional Council',
   'measured', 'wave', 'measured',
   'Significant wave height at Baring Head: 4.6 m',
   'Still rising. Up 3.4 m in twelve hours.',
   NULL, NULL, 174.8703, -41.4083, NULL, 4.6, 'm', 'rising', NULL),

  -- T+240 — the peak
  ('south-coast-southerly', 240, 'sim:ms-wind-3', 'metservice-alerts',
   'MetService severe weather warnings', 'MetService', 'official', 'wind', 'forecast',
   'Red Severe Wind Warning for Wellington',
   'Damaging southerly gusts to 140 km/h. Avoid travel on exposed routes.',
   4, 'Extreme · wind · Immediate', 174.7756, -41.3399, 'island-bay',
   NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 240, 'sim:wcc-2', 'wcc-road-closures',
   'Council road closures and street events', 'Wellington City Council',
   'council', 'road', 'observed',
   'Road affected now — Owhiro Bay Parade closed',
   'In effect now. Closed at the quarry end. Debris across the carriageway.',
   3, 'Road closure in effect', 174.7615, -41.3460, 'owhiro-bay',
   NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 240, 'sim:tilde-2', 'geonet-tilde-sea-level',
   'Sea level at Wellington Harbour (detided)', 'GeoNet / GNS Science',
   'measured', 'sea_level', 'measured',
   'Sea level at Wellington Harbour, tide removed: 0.45 m above normal',
   'The part of the water level the tide does not explain. Still rising.',
   NULL, NULL, 174.7797, -41.2847, 'wellington-other', 0.45, 'm', 'rising', NULL),

  ('south-coast-southerly', 240, 'sim:cr-6', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'waves_over_road', 'reported',
   'Moa Point Road covered in stones',
   'Wave hit right over the wall. Would not take a low car through.',
   NULL, NULL, 174.8118, -41.3417, 'moa-point', NULL, NULL, NULL, 3),

  -- T+300 — sustained
  ('south-coast-southerly', 300, 'sim:cr-7', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'surface_flooding', 'reported',
   'The Parade flooding outside the shops',
   'Drains cannot keep up. Water at the kerb both sides.',
   NULL, NULL, 174.7752, -41.3390, 'island-bay', NULL, NULL, NULL, 5),

  ('south-coast-southerly', 300, 'sim:power-2', 'electricity-outages',
   'Electricity outages', 'NEMA / lines companies', 'council', 'power', 'observed',
   'Power out — about 340 properties',
   'Wellington Electricity · Crew assigned · Estimated restoration 19:00.',
   3, 'Crew assigned', 174.7700, -41.3420, 'island-bay', NULL, NULL, NULL, NULL),

  -- T+360 — easing
  ('south-coast-southerly', 360, 'sim:ms-wind-4', 'metservice-alerts',
   'MetService severe weather warnings', 'MetService', 'official', 'wind', 'forecast',
   'Severe Wind Warning easing',
   'Gusts easing this evening. Warning expected to be lifted overnight.',
   2, 'Moderate · wind · Expected', 174.7756, -41.3399, 'island-bay',
   NULL, NULL, NULL, NULL),

  ('south-coast-southerly', 360, 'sim:cr-8', 'community-reports',
   'Community reports', 'Members of the public', 'community', 'all_clear', 'reported',
   'Esplanade passable again',
   'Still gritty and wet but the sets have dropped right off.',
   NULL, NULL, 174.7745, -41.3438, 'island-bay', NULL, NULL, NULL, 2),

  ('south-coast-southerly', 360, 'sim:hsig-3', 'baring-head-waves',
   'Significant wave height, Baring Head', 'Greater Wellington Regional Council',
   'measured', 'wave', 'measured',
   'Significant wave height at Baring Head: 3.1 m',
   'Falling. Past the peak.',
   NULL, NULL, 174.8703, -41.4083, NULL, 3.1, 'm', 'falling', NULL);
