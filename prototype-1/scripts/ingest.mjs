#!/usr/bin/env bun
/**
 * Terminal fallback for the Refresh button.
 *
 * Same code path as the UI — it just POSTs to the ingest function — so if the
 * front end is broken you can still prove the pipeline works, and see the
 * per-source report while you do.
 */
const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54521';

const res = await fetch(`${URL_BASE}/functions/v1/ingest`, { method: 'POST' });
const body = await res.json();

console.log(
  `${body.sources_ok} of ${body.sources_ok + body.sources_failed} sources ok · ` +
  `${body.items} items · ${body.duration_ms} ms`,
);
for (const r of body.reports ?? []) {
  const mark = r.status === 'ok' ? ' ' : '!';
  console.log(`${mark} ${r.source_id.padEnd(26)} ${String(r.count).padStart(4)}  ${r.error ?? ''}`);
}
process.exit(body.sources_failed > 0 ? 1 : 0);
