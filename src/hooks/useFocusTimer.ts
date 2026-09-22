import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionType } from '@/lib/database.types'
import { storage } from '@/lib/platform/storage'
import { onAppForeground } from '@/lib/platform/appState'

// ─── Persisted timer state ──────────────────────────────────────────────────
// Persisted through the platform storage adapter (localStorage on web,
// AsyncStorage on native) so the timer survives navigating between views, full
// page reloads, and — on native — the app being suspended or killed outright.
//
// Remaining seconds are always computed from the wall clock (now vs startedAt)
// rather than decremented by a counter. That is what makes the timer correct
// across backgrounding on both platforms: no interval needs to have fired for
// the elapsed time to be right.

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

async function loadStored(): Promise<PersistedSession | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSession
  } catch {
    return null
  }
}

function saveStored(s: PersistedSession | null) {
  // Fire and forget: the adapter already swallows storage failures, and the
  // timer stays correct in memory regardless.
  if (s === null) void storage.removeItem(STORAGE_KEY)
  else void storage.setItem(STORAGE_KEY, JSON.stringify(s))
}

// ─── Cross-instance sync ────────────────────────────────────────────────────
// Several components can mount this hook at once (the timer screen, a pinned
// mini-timer on other tabs). Each keeps its own React state, so a pause in one
// must reach the others without waiting for a re-read of storage. Every
// persisted change is broadcast; receivers adopt the same object reference,
// and setState bails out on an identical reference, so the echo stops after
// one hop.

const listeners = new Set<(s: PersistedSession) => void>()

function broadcast(s: PersistedSession) {
  for (const l of listeners) l(s)
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
  /**
   * False until the persisted session has been read back. Storage is async on
   * native, so a consumer that renders controls before this is true can show a
   * stale 'idle' state for a frame and let the user start a second session on
   * top of a running one.
   */
  hydrated: boolean
}

/** Tracks the active focus session in a way that survives navigation and
 *  reloads. Returns live timer state. */
export function useFocusTimer(defaultPreset: FocusPresetInfo): UseFocusTimer {
  const [stored, setStored] = useState<PersistedSession>(() => ({
    sessionId: '',
    preset: defaultPreset,
    startedAt: 0,
    pausedRemaining: null,
    state: 'idle',
  }))
  const [hydrated, setHydrated] = useState(false)

  // A broadcast from a sibling instance that arrives before our own storage
  // read completes is newer than storage; the read must not overwrite it.
  const receivedRef = useRef(false)
  useEffect(() => {
    const listener = (s: PersistedSession) => {
      receivedRef.current = true
      setStored((prev) => (prev === s ? prev : s))
      setHydrated(true)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  // Restore any session that was running when the app was last closed.
  useEffect(() => {
    let cancelled = false
    void loadStored().then((existing) => {
      if (cancelled || receivedRef.current) {
        if (!cancelled) setHydrated(true)
        return
      }
      if (existing) {
        // The session may well have finished while the app was away — the
        // wall-clock math decides, not whether an interval fired.
        setStored(
          computeRemaining(existing) <= 0 && existing.state === 'running'
            ? { ...existing, state: 'done' }
            : existing,
        )
      }
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
    // Runs once: defaultPreset is only a seed for the pre-hydration value, and
    // re-running on a new preset identity would clobber a restored session.
  }, [])
  // Bumped every 250ms while the timer is running so the component re-renders
  // and reads a fresh wall-clock value. Don't memoise `remaining` — the whole
  // point is that it depends on Date.now() which is not part of React state.
  const [, bumpTick] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist whenever stored state changes (except idle/done which clear it).
  useEffect(() => {
    // Writing before hydration completes would overwrite the persisted session
    // with the empty seed state above.
    if (!hydrated) return
    if (stored.state === 'idle' || stored.state === 'done') {
      saveStored(null)
    } else {
      saveStored(stored)
    }
    broadcast(stored)
  }, [stored, hydrated])

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

  // On returning to the foreground, re-check completion in case we crossed the
  // finish line while away. Browsers throttle setInterval in background tabs
  // and React Native suspends timers entirely, so the interval below cannot be
  // relied on to have noticed.
  useEffect(
    () =>
      onAppForeground(() => {
        if (stored.state === 'running' && computeRemaining(stored) <= 0) {
          setStored((s) => ({ ...s, state: 'done' }))
        } else {
          bumpTick((n) => (n + 1) % 1_000_000)
        }
      }),
    [stored],
  )

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
    hydrated,
  }
}
