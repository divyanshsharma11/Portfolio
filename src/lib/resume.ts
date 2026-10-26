import { useEffect, useState } from 'react'
import { profile } from '../data'

// The résumé buttons only appear once public/Divyansh-Sharma-Resume.pdf exists.
// A missing file can come back as the HTML app shell, so check the content type, not just the status.
let check: Promise<boolean> | null = null
const hasResume = () =>
  (check ??= fetch(profile.resume, { method: 'HEAD' })
    .then((r) => r.ok && (r.headers.get('content-type') ?? '').includes('pdf'))
    .catch(() => false))

export function useResume() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    let alive = true
    hasResume().then((ok) => alive && setAvailable(ok))
    return () => {
      alive = false
    }
  }, [])
  return available ? profile.resume : null
}
