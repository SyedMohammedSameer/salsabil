// Theme handling.
//
// The web's useTheme hook manipulates document.documentElement, so native
// needs its own. NativeWind's colorScheme API is the equivalent: it flips the
// `dark:` variant across the whole tree.
//
// The stored preference uses the same 'salsabil-theme' key and the same
// 'light' | 'dark' | 'system' values as the web, so a user's choice reads the
// same on both platforms.

import { useEffect, useState, useCallback } from 'react'
import { colorScheme as nativewindColorScheme } from 'nativewind'
import { storage } from '@/lib/platform/storage'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'salsabil-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void storage.getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return
      const next = (stored as Theme | null) ?? 'system'
      setThemeState(next)
      nativewindColorScheme.set(next)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    nativewindColorScheme.set(next)
    void storage.setItem(STORAGE_KEY, next)
  }, [])

  return { theme, setTheme, ready }
}
