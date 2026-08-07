import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * There is no login in this prototype, so this client only ever acts as `anon`.
 * That role can read the public feeds and insert a community report, and
 * nothing else — no update, no delete, and no privilege on the columns that
 * mark a report as reviewed. See supabase/migrations/20260808120200.
 */
export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const FUNCTIONS_URL = `${URL}/functions/v1`;
