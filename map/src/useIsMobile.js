import { useEffect, useState } from 'react'

/**
 * True on a phone-sized viewport.
 *
 * 720px, because that is where the 280px sidebar plus a usable map stops
 * fitting. Everything in this project styles inline, so responsiveness is a
 * boolean the component branches on rather than a stylesheet in another file.
 */
const QUERY = '(max-width: 720px)'

export default function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = e => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    setMobile(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}
