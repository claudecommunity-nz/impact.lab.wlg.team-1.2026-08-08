import { useEffect, useState } from 'react'

export default function useWeather(currentTime) {
  const [snapshots, setSnapshots] = useState([])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}weather.json`)
      .then(r => r.json())
      .then(data => setSnapshots(data.map(s => ({ ...s, t: Date.parse(s.timestamp) }))))
  }, [])

  if (!snapshots.length) return null

  const active = snapshots.filter(s => s.t <= currentTime)
  return active.length ? active[active.length - 1] : snapshots[0]
}
