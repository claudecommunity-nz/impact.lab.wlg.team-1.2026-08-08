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

export default function useGeolocation() {
  const [feature, setFeature] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    let cancelled = false
    const accept = pos => { if (!cancelled) setFeature(toFeature(pos)) }
    // Deliberately empty: a failed fix leaves whatever we already had. The
    // caller treats a null feature as "we do not know", which is correct both
    // before the first fix and after a refusal.
    const ignore = () => {}

    navigator.geolocation.getCurrentPosition(accept, ignore, OPTIONS)
    const id = navigator.geolocation.watchPosition(accept, ignore, OPTIONS)

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(id)
    }
  }, [])

  return feature
}
