import { useEffect, useState } from 'react'

/**
 * The browser's idea of where the user is, as a GeoJSON point feature.
 *
 * Three things this has to survive, all of which broke it before:
 *
 * 1. **StrictMode.** In development React mounts, unmounts and remounts every
 *    effect. `watchPosition` on the first mount is what raises the permission
 *    prompt; the cleanup then calls `clearWatch` on that very watch while the
 *    prompt is still on screen. After the user clicks Allow there is no
 *    guarantee the surviving watch gets an initial fix — a desktop that is not
 *    moving may not produce a new one for a long time, so the pin never
 *    appeared and nothing downstream ever ran. `getCurrentPosition` alongside
 *    the watch fixes that: it is a one-shot request that resolves as soon as
 *    permission is granted.
 *
 * 2. **A transient error wiping a good position.** The old error handler set
 *    the feature back to null. `watchPosition` reports POSITION_UNAVAILABLE
 *    routinely — a laptop lid closing, wifi changing — and clearing a position
 *    we already have makes the pin blink out for no reason the user can see.
 *    An error now only matters if we never had a fix.
 *
 * 3. **A stale cached fix being useless.** `maximumAge` lets the browser hand
 *    back a recent fix immediately rather than waiting on the GPS, which is
 *    what makes the map settle on the right region straight after Allow.
 */

const OPTIONS = {
  // Suburb-level accuracy is all this needs, and the low-accuracy provider
  // answers in a fraction of the time without waking the GPS.
  enableHighAccuracy: false,
  // Don't hang forever if the platform never answers.
  timeout: 15000,
  // A fix from the last two minutes is fine for "which suburb am I in".
  maximumAge: 120000,
}

function toFeature(pos) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [pos.coords.longitude, pos.coords.latitude],
    },
    properties: { source: 'geolocation', accuracy: pos.coords.accuracy },
  }
}

/**
 * Why a failure is reported rather than swallowed.
 *
 * The interface uses this to decide where the map opens. If we quietly fall
 * back to a default region when we cannot locate someone, they cannot tell the
 * difference between "you are here" and "we gave up and guessed" — which is
 * the exact failure mode this whole project is meant to avoid. So the reason
 * comes back with the result and the panel says it out loud.
 */
const REASONS = {
  1: 'Location permission was declined.',
  2: 'Your device could not provide a location.',
  3: 'Locating timed out.',
}

export default function useGeolocation() {
  const [state, setState] = useState({ feature: null, status: 'locating', error: null })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ feature: null, status: 'failed', error: 'This browser has no location support.' })
      return
    }

    let cancelled = false

    const accept = pos => {
      if (!cancelled) setState({ feature: toFeature(pos), status: 'located', error: null })
    }

    const reject = err => {
      // A later failure never discards a fix we already have. watchPosition
      // reports POSITION_UNAVAILABLE routinely — a lid closing, wifi changing —
      // and blinking the pin out for that would be noise, not information.
      if (cancelled) return
      setState(prev => prev.feature
        ? prev
        : { feature: null, status: 'failed', error: REASONS[err.code] ?? 'Could not get a location.' })
    }

    navigator.geolocation.getCurrentPosition(accept, reject, OPTIONS)
    const id = navigator.geolocation.watchPosition(accept, reject, OPTIONS)

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(id)
    }
  }, [])

  return state
}
