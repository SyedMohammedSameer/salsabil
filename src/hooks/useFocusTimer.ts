import { useCallback, useEffect, useRef, useState } from 'react'
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
  // Bumped every 250ms while the timer is running so the component re-renders
  // and reads a fresh wall-clock value. Don't memoise `remaining` — the whole
  // point is that it depends on Date.now() which is not part of React state.
  const [, bumpTick] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist whenever stored state changes (except idle/done which clear it).
  useEffect(() => {
    if (stored.state === 'idle' || stored.state === 'done') {
      saveStored(null)
    } else {
      saveStored(stored)
    }
  }, [stored])

  // Drive UI ticks while running. Re-running this effect only when state
  // transitions (start/pause/resume/finish) so we don't churn the interval
  // every render. We use 250ms to keep the visible countdown smooth.
  useEffect(() => {
    if (stored.state !== 'running') {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }
    tickRef.current = setInterval(() => {
      // Force a re-render so the consumer re-reads the live wall-clock
      // value. We also check completion here.
      bumpTick((n) => (n + 1) % 1_000_000)
      const total = stored.preset.minutes * 60
      const elapsed = Math.floor((Date.now() - stored.startedAt) / 1000)
      if (total - elapsed <= 0) {
        setStored((s) => (s.state === 'running' ? { ...s, state: 'done' } : s))
      }
    }, 250)
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [stored.state, stored.startedAt, stored.preset.minutes])

  // When the page becomes visible again, re-check completion in case we
  // crossed the finish line while the tab was backgrounded (some browsers
  // throttle setInterval in background tabs).
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return
      if (stored.state === 'running' && computeRemaining(stored) <= 0) {
        setStored((s) => ({ ...s, state: 'done' }))
      } else {
        bumpTick((n) => (n + 1) % 1_000_000)
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
      // Preserve the original preset and shift `startedAt` so the wall-clock
      // math (total - elapsed) yields the remaining seconds we paused at.
      const total = s.preset.minutes * 60
      const elapsedSoFar = total - s.pausedRemaining
      return {
        ...s,
        startedAt: Date.now() - elapsedSoFar * 1000,
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

  // Computed on every render — `bumpTick` triggers a re-render every 250ms
  // while the timer is running, so this picks up the live wall-clock value.
  // Do NOT memoise: there's no dep that captures "wall clock changed".
  const remaining = computeRemaining(stored)

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
