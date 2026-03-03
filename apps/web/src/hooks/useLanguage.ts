'use client'

import { useEffect, useState } from 'react'

export type AppLanguage = 'en' | 'kr'

const LANGUAGE_STORAGE_KEY = 'aso-copilot-language'

function normalizeLanguage(value: string | null): AppLanguage {
  return value === 'kr' ? 'kr' : 'en'
}

export function useLanguage(defaultLanguage: AppLanguage = 'en') {
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedLanguage = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
    setLanguageState(storedLanguage)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = language === 'kr' ? 'ko' : 'en'
  }, [language])

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    }
  }

  return { language, setLanguage }
}
