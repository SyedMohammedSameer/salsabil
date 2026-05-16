import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionType } from '@/lib/database.types'

// ─── Persisted timer state ──────────────────────────────────────────────────
// Lives in localStorage so the timer survives navigating between views and
// even full page reloads. Remaining seconds are computed from the wall clock
// (now vs startedAt) so the timer keeps ticking even while the FocusView
// component is unmounted.

const STORAGE_KEY = 'salsabil_focus_active_session'

export type FocusTimerState = 'idle' | 'running' | 'paused' | 'done'

export interface FocusPresetInfo {
  type: SessionType
  label: string
  minutes: number
  color: string
  ringColor: string
}

interface PersistedSession {
  sessionId: string
  preset: FocusPresetInfo
  startedAt: number // ms — when the current running segment started
  pausedRemaining: number | null // seconds — set when paused; null when running
  state: FocusTimerState
}

function loadStored(): PersistedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSession
  } catch {
    return null
  }
}

function saveStored(s: PersistedSession | null) {
  if (typeof window === 'undefined') return
  try {
    if (s === null) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // localStorage may be unavailable (private mode, etc.)
  }
}

function computeRemaining(s: PersistedSession): number {
  const total = s.preset.minutes * 60
  if (s.state === 'idle') return total
  if (s.state === 'done') return 0
  if (s.state === 'paused') return s.pausedRemaining ?? total
  // running
  const elapsed = Math.floor((Date.now() - s.startedAt) / 1000)
  return Math.max(0, total - elapsed)
}

export interface UseFocusTimer {
  preset: FocusPresetInfo
  remaining: number // seconds
  state: FocusTimerState
  sessionId: string | null
  start: (sessionId: string, preset: FocusPresetInfo) => void
  pause: () => void
  resume: () => void
  reset: (preset?: FocusPresetInfo) => void
  /** Mark done locally. The caller is responsible for the server-side
   *  completion mutation. */
  finish: () => void
  setPreset: (preset: FocusPresetInfo) => void
}

/** Tracks the active focus session in a way that survives navigation and
 *  reloads. Returns live timer state. */
export function useFocusTimer(defaultPreset: FocusPresetInfo): UseFocusTimer {
  const [stored, setStored] = useState<PersistedSession>(() => {
    const existing = loadStored()
    if (existing) return existing
    return {
      sessionId: '',
      preset: defaultPreset,
      startedAt: 0,
      pausedRemaining: null,
      state: 'idle',
    }
  })
  const [, force] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist whenever stored state changes (except 'done' clears).
  useEffect(() => {
    if (stored.state === 'idle' || stored.state === 'done') {
      saveStored(null)
    } else {
      saveStored(stored)
    }
  }, [stored])

  // Tick once per second when running so the UI re-renders. The actual
  // remaining value is always computed from the wall clock.
  useEffect(() => {
    if (stored.state !== 'running') {
      if (tickRef.current) clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(() => {
      // Check completion against the wall clock
      const remaining = computeRemaining(stored)
      if (remaining <= 0) {
        setStored((s) => ({ ...s, state: 'done' }))
        return
      }
      force((n) => n + 1)
    }, 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [stored])

  // When the page becomes visible again, re-check completion in case we
  // crossed the finish line in the background.
  useEffect(() => {
    const onVisible = () => {
      if (stored.state === 'running' && computeRemaining(stored) <= 0) {
        setStored((s) => ({ ...s, state: 'done' }))
      } else {
        force((n) => n + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [stored])

  const start = useCallback((sessionId: string, preset: FocusPresetInfo) => {
    setStored({
      sessionId,
      preset,
      startedAt: Date.now(),
      pausedRemaining: null,
      state: 'running',
    })
  }, [])

  const pause = useCallback(() => {
    setStored((s) => {
      if (s.state !== 'running') return s
      return {
        ...s,
        state: 'paused',
        pausedRemaining: computeRemaining(s),
      }
    })
  }, [])

  const resume = useCallback(() => {
    setStored((s) => {
      if (s.state !== 'paused' || s.pausedRemaining == null) return s
      // Pretend we just started a session of length `pausedRemaining`
      const fakeTotalSecs = s.pausedRemaining
      const fakePreset: FocusPresetInfo = {
        ...s.preset,
        minutes: Math.max(1, Math.ceil(fakeTotalSecs / 60)),
      }
      // To keep computeRemaining honest we set startedAt so that
      // (now - startedAt) / 1000 = total - pausedRemaining = 0 initially.
      // We achieve that by treating preset.minutes as fakePreset.minutes (=remaining).
      return {
        ...s,
        preset: fakePreset,
        startedAt: Date.now(),
        pausedRemaining: null,
        state: 'running',
      }
    })
  }, [])

  const reset = useCallback(
    (preset?: FocusPresetInfo) => {
      setStored({
        sessionId: '',
        preset: preset ?? defaultPreset,
        startedAt: 0,
        pausedRemaining: null,
        state: 'idle',
      })
    },
    [defaultPreset],
  )

  const finish = useCallback(() => {
    setStored((s) => ({ ...s, state: 'done' }))
  }, [])

  const setPreset = useCallback((preset: FocusPresetInfo) => {
    setStored((s) => {
      if (s.state === 'running' || s.state === 'paused') return s
      return { ...s, preset, sessionId: '', startedAt: 0, pausedRemaining: null, state: 'idle' }
    })
  }, [])

  const remaining = useMemo(() => computeRemaining(stored), [stored])

  return {
    preset: stored.preset,
    remaining,
    state: stored.state,
    sessionId: stored.sessionId || null,
    start,
    pause,
    resume,
    reset,
    finish,
    setPreset,
  }
}
