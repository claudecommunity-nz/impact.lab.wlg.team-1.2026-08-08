import { useCallback, useEffect, useState } from 'react';
import { EMPTY_PROFILE, type Profile } from '@/lib/relevance';

const KEY = 'ocv.profile.v1';
const DEVICE_KEY = 'ocv.device.v1';

/**
 * The profile never leaves the browser.
 *
 * That is a real privacy claim we can make honestly precisely because there is
 * no account system: nothing about where someone lives, who they care for, or
 * whether they depend on mains power is ever sent to a server. It is stated in
 * the wizard for the same reason.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile({ ...EMPTY_PROFILE, ...JSON.parse(raw) });
    } catch {
      // A corrupt profile is not worth an error screen; start fresh.
    }
    setLoaded(true);
  }, []);

  const save = useCallback((p: Profile) => {
    setProfile(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Private browsing. The profile still works for this session.
    }
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { profile, saveProfile: save, clearProfile: clear, loaded };
}

/**
 * A random per-browser id used only to rate-limit report submissions. Not an
 * account, not linked to a person, and never shown.
 */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
