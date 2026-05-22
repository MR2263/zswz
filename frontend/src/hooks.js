import { useEffect, useState } from 'react'
import { api } from './api'

export function useSessionId() {
  const key = 'visitor_session_id'
  const [sessionId] = useState(() => {
    const existing = window.localStorage.getItem(key)
    if (existing) {
      return existing
    }

    const next = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    window.localStorage.setItem(key, next)
    return next
  })

  return sessionId
}

export function useTrackPageView(path, productId = null) {
  const sessionId = useSessionId()

  useEffect(() => {
    api.post('/public/analytics/track', {
      path,
      productId,
      sessionId,
      referrer: document.referrer || 'direct',
    }).catch(() => {})
  }, [path, productId, sessionId])
}

