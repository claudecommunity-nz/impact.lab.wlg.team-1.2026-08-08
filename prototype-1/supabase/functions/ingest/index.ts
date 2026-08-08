/**
 * Pull every upstream feed, normalise, upsert, and record how each source
 * behaved.
 *
 * Two rules shape this file.
 *
 * One dead feed must never take the run with it. Adapters are wrapped
 * individually, the response is always HTTP 200, and a failure is reported
 * rather than thrown. A broken source becomes a red pill in the health strip,
 * which the brief explicitly wants visible rather than hidden.
 *
 * Be considerate of council servers. Requests are grouped by host and run
 * sequentially within each host with a short gap, at most three hosts at a
 * time. The grouping key comes from the catalogue. Refresh is triggered by a
 * button press, never a poll loop.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';
import { ADAPTERS, type Adapter, type SignalRow } from './adapters.ts';
import { suburbFor } from './suburbs.ts';

const HOST_GAP_MS = 150;
const MAX_CONCURRENT_HOSTS = 3;

interface Report {
  source_id: string;
  status: 'ok' | 'error';
  count: number;
  ms: number;
  error?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const startedAt = Date.now();

  // Group by host so we never hit one council server in parallel with itself.
  const byHost = new Map<string, Adapter[]>();
  for (const a of ADAPTERS) {
    const list = byHost.get(a.host) ?? [];
    list.push(a);
    byHost.set(a.host, list);
  }

  const reports: Report[] = [];
  const hosts = [...byHost.entries()];

  for (let i = 0; i < hosts.length; i += MAX_CONCURRENT_HOSTS) {
    const slice = hosts.slice(i, i + MAX_CONCURRENT_HOSTS);
    await Promise.all(
      slice.map(async ([, adapters]) => {
        for (const [n, adapter] of adapters.entries()) {
          if (n > 0) await sleep(HOST_GAP_MS);
          reports.push(await runOne(supabase, adapter));
        }
      }),
    );
  }

  const ok = reports.filter((r) => r.status === 'ok');
  const failed = reports.filter((r) => r.status === 'error');

  // Always 200. The report body is the truth, not the status code — a partial
  // run is the normal case with eleven third-party feeds.
  return json({
    ok: true,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    sources_ok: ok.length,
    sources_failed: failed.length,
    items: ok.reduce((s, r) => s + r.count, 0),
    reports: reports.sort((a, b) => a.source_id.localeCompare(b.source_id)),
  });
});

/**
 * Attach the WCC suburb name to every row that has a point.
 *
 * Done here rather than in each adapter on purpose. `area_hint` is per-adapter
 * because some of them already know which bay a gauge belongs to; the suburb is
 * a pure function of the coordinate, so stamping it once in the runner means a
 * new adapter cannot forget it and no adapter can disagree with another about
 * where a point is.
 */
function stampSuburbs(rows: SignalRow[]): SignalRow[] {
  for (const r of rows) {
    if (r.lng == null || r.lat == null) continue;
    const m = suburbFor(r.lng, r.lat);
    r.suburb = m?.name ?? null;
    r.suburb_exact = m ? m.exact : null;
  }
  return rows;
}

async function runOne(
  supabase: ReturnType<typeof createClient>,
  adapter: Adapter,
): Promise<Report> {
  const t0 = Date.now();
  const attemptedAt = new Date().toISOString();

  try {
    const rows = stampSuburbs(await adapter.run());

    if (rows.length) {
      // Upsert on (source_id, external_id) so a re-run updates in place. Batched
      // because a national feed can return more rows than one statement wants.
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500) as unknown as Record<string, unknown>[];
        const { error } = await supabase
          .from('signals')
          .upsert(batch, { onConflict: 'source_id,external_id' });
        if (error) throw new Error(error.message);
      }
    }

    // Clear anything this source published before that has now disappeared
    // upstream — a closure that has been lifted should stop being shown.
    const keep = rows.map((r: SignalRow) => r.external_id);
    if (keep.length) {
      await supabase
        .from('signals')
        .delete()
        .eq('source_id', adapter.sourceId)
        .not('external_id', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`);
    }

    await supabase
      .from('sources')
      .update({
        last_attempt_at: attemptedAt,
        last_success_at: new Date().toISOString(),
        last_status: 'ok',
        last_error: null,
        last_item_count: rows.length,
      })
      .eq('id', adapter.sourceId);

    return {
      source_id: adapter.sourceId,
      status: 'ok',
      count: rows.length,
      ms: Date.now() - t0,
    };
  } catch (err) {
    const message = String((err as Error)?.message ?? err).slice(0, 240);

    // Record the failure against the source. The UI reads this and shows the
    // real error text — hiding it would defeat the point.
    await supabase
      .from('sources')
      .update({
        last_attempt_at: attemptedAt,
        last_status: 'error',
        last_error: message,
      })
      .eq('id', adapter.sourceId);

    return {
      source_id: adapter.sourceId,
      status: 'error',
      count: 0,
      ms: Date.now() - t0,
      error: message,
    };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
