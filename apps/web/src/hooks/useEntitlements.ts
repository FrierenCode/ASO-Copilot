'use client'

import { useState, useEffect, useCallback } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'

export interface EntitlementsData {
  uid: string
  plan: string
  status: string
  limits: {
    monthlyGenerations: number | null
    usedThisMonth: number
    remainingThisMonth: number | null
    periodStart: string
    periodEnd: string
  }
  source: {
    type: string
    ref: string | null
    version: number
    updatedAt: string
  }
}

export interface UseEntitlementsResult {
  data: EntitlementsData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useEntitlements(): UseEntitlementsResult {
  const [data, setData] = useState<EntitlementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntitlements = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/v1/entitlements`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Failed to load entitlements (${res.status})`)
      setData((await res.json()) as EntitlementsData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntitlements()
  }, [fetchEntitlements])

  return { data, loading, error, refetch: fetchEntitlements }
}
