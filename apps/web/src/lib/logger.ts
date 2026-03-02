/**
 * Minimal client-side event logger.
 * Outputs to console only (phase 1). Replace with analytics SDK in phase 2.
 */

export type EventName =
  | 'page_view'
  | 'generate_start'
  | 'generate_success'
  | 'generate_error'
  | 'limit_exceeded'
  | 'duplicate_request'
  | 'result_view'
  | 'copy_variant'
  | 'upgrade_click'

export function logEvent(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  console.log(`[aso] ${name}`, { ts: Date.now(), ...props })
}
