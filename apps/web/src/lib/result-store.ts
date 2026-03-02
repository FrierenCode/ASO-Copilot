import type { GenerateResponse } from '@aso-copilot/shared'

const PREFIX = 'aso-result-'

export function saveResult(runId: string, data: GenerateResponse): void {
  try {
    localStorage.setItem(PREFIX + runId, JSON.stringify(data))
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

export function loadResult(runId: string): GenerateResponse | null {
  try {
    const raw = localStorage.getItem(PREFIX + runId)
    return raw ? (JSON.parse(raw) as GenerateResponse) : null
  } catch {
    return null
  }
}
