const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'

export type EventName =
  | 'generate_start'
  | 'generate_success'
  | 'limit_exceeded'
  | 'result_view'
  | 'upgrade_click'

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem('aso_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem('aso_session_id', sid)
    }
    return sid
  } catch {
    return 'unknown'
  }
}

export function logEvent(
  name: EventName,
  props?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return

  const { user_state = 'anonymous', route = window.location.pathname, ...payload } =
    props ?? {}

  fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: name,
      route,
      user_state,
      session_id: getSessionId(),
      payload: Object.keys(payload).length > 0 ? payload : undefined,
    }),
  }).catch(() => {
    // fire-and-forget: silently ignore failures
  })
}
