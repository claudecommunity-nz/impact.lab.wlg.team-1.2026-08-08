import { useQuery } from '@tanstack/react-query';
import { FUNCTIONS_URL } from '@/integrations/supabase/client';
import type { Signal } from '@/lib/signals';
import type { EvidenceBasis, Tier } from '@/lib/tiers';

/**
 * Read the app's own composable endpoint rather than the database directly.
 *
 * The front end is deliberately just the first consumer of the same public
 * GeoJSON any other Impact Lab team can pull. If it breaks for them it breaks
 * for us, which is the only way to be sure the contract is real.
 */

export interface SourceHealth {
  id: string;
  name: string;
  publisher: string;
  tier: string;
  licence: string | null;
  attribution: string;
  homepage: string | null;
  last_status: 'ok' | 'error' | 'stale' | 'never';
  last_success_at: string | null;
  last_item_count: number | null;
}

interface Payload {
  signals: Signal[];
  sources: SourceHealth[];
  generatedAt: string;
  simulation: boolean;
}

function toSignal(f: any): Signal {
  const p = f.properties ?? {};
  const coords =
    f.geometry?.type === 'Point' ? (f.geometry.coordinates as [number, number]) : null;

  return {
    id: p.id,
    sourceId: p.source_id,
    sourceName: p.source_name,
    publisher: p.publisher,
    attribution: p.attribution,
    licence: p.licence ?? null,
    homepage: p.homepage ?? null,
    tier: p.tier as Tier,
    category: p.category,
    evidenceBasis: p.evidence_basis as EvidenceBasis,
    headline: p.headline,
    detail: p.detail ?? null,
    severity: null,
    severityLabel: p.severity_label ?? null,
    observedAt: p.observed_at ?? null,
    validFrom: p.valid_from ?? null,
    validTo: p.valid_to ?? null,
    ingestedAt: p.observed_at ?? new Date().toISOString(),
    lng: coords?.[0] ?? null,
    lat: coords?.[1] ?? null,
    areaHint: p.area_hint ?? null,
    geometry: f.geometry ?? null,
    value: p.value ?? null,
    unit: p.unit ?? null,
    trend: p.trend ?? null,
    sparkline: null,
    baselineMin: null,
    baselineMax: null,
    url: p.url ?? null,
    status: p.status ?? null,
    // report_count includes the report itself; the UI wants "how many OTHERS".
    corroborationCount:
      p.report_count != null ? Math.max(0, Number(p.report_count) - 1) : null,
    simulated: Boolean(p.simulated),
  };
}

async function load(scenario: string | null, at: number): Promise<Payload> {
  const params = new URLSearchParams();
  // Simulated rows are opt-in and live in a different table. Without this
  // parameter the endpoint cannot return them.
  if (scenario) {
    params.set('scenario', scenario);
    params.set('at', String(at));
  }

  const res = await fetch(`${FUNCTIONS_URL}/signals-geojson?${params}`);
  if (!res.ok) throw new Error(`Feed unavailable (${res.status})`);
  const fc = await res.json();

  return {
    signals: (fc.features ?? []).map(toSignal),
    sources: fc.properties?.sources ?? [],
    generatedAt: fc.properties?.generated_at ?? new Date().toISOString(),
    simulation: Boolean(fc.properties?.simulation),
  };
}

export function useSignals(scenario: string | null, at: number) {
  return useQuery({
    queryKey: ['signals', scenario, scenario ? at : 0],
    queryFn: () => load(scenario, at),
    // Scenario playback is local and instant; live data is refreshed by the
    // Refresh button, never by a poll loop against council servers.
    staleTime: scenario ? Infinity : 60_000,
  });
}

export async function triggerIngest(): Promise<{
  sources_ok: number;
  sources_failed: number;
  items: number;
}> {
  const res = await fetch(`${FUNCTIONS_URL}/ingest`, { method: 'POST' });
  if (!res.ok) throw new Error(`Refresh failed (${res.status})`);
  return await res.json();
}
