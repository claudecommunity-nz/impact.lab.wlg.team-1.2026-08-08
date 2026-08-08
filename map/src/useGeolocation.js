import { useEffect, useState } from 'react'

export default function useGeolocation() {
  const [feature, setFeature] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    const id = navigator.geolocation.watchPosition(
      pos => setFeature({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [pos.coords.longitude, pos.coords.latitude],
        },
        properties: { source: 'geolocation' },
      }),
      () => setFeature(null)
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return feature
}
