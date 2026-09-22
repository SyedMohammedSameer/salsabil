import { useCallback, useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import { useFocusTimer, type FocusPresetInfo } from '@/hooks/useFocusTimer'
import { useCreateFocusSession, useCompleteFocusSession } from '@/hooks/useFocus'
import { useGardenTrees } from '@/hooks/useGarden'
import { SPECIES_INFO } from '@/lib/api/garden'
import { coinsFor } from '@/lib/rewards'
import { storage } from '@/lib/platform/storage'
import { toast } from '@/lib/platform/toast'
import type { GardenTree } from '@/lib/database.types'
import { PRESETS } from '~/lib/focusPresets'
import { afterStart, pauseSession, resumeSession, clearSessionEffects } from '~/lib/focusSession'

// One place that drives a focus session, used by the timer screen, the pinned
// mini-timer and Noor, so a session started from chat behaves exactly like
// one started from the Start button.
//
// Completion lives here too, in useFocusCompletion, mounted once in the tab
// layout. Before, only the timer screen completed a session, so a session
// that ended while you were on another tab waited until you came back.

// ─── Which tree a session grows ──────────────────────────────────────────────

const TREE_KEY = 'salsabil-focus-tree'

interface FocusTreeState {
  treeId: string | null
  setTreeId: (id: string | null) => void
}

export const useFocusTreeStore = create<FocusTreeState>((set) => ({
  treeId: null,
  setTreeId: (id) => {
    set({ treeId: id })
    if (id) void storage.setItem(TREE_KEY, id)
    else void storage.removeItem(TREE_KEY)
  },
}))

void storage.getItem(TREE_KEY).then((id) => {
  if (id && !useFocusTreeStore.getState().treeId) useFocusTreeStore.setState({ treeId: id })
})

export function treeName(tree: Pick<GardenTree, 'name' | 'species'>): string {
  return tree.name?.trim() || SPECIES_INFO[tree.species].name
}

/**
 * The trees a session can grow (anything not yet ancient) and the one it will
 * grow: the chosen tree while it can still grow, otherwise the newest one,
 * which is what the server does when no tree is named.
 */
export function useFocusTarget() {
  const { data: trees } = useGardenTrees()
  const treeId = useFocusTreeStore((s) => s.treeId)
  const setTreeId = useFocusTreeStore((s) => s.setTreeId)

  const growable = useMemo(
    () =>
      [...(trees ?? [])]
        .filter((t) => t.stage !== 'ancient')
        .sort((a, b) => (a.planted_at < b.planted_at ? 1 : -1)),
    [trees],
  )
  const tree = growable.find((t) => t.id === treeId) ?? growable[0] ?? null
  return { trees: growable, tree, setTreeId }
}

// ─── Control ─────────────────────────────────────────────────────────────────

export function useFocusControl() {
  const timer = useFocusTimer(PRESETS[0])
  const createSession = useCreateFocusSession()
  const completeSession = useCompleteFocusSession()
  const target = useFocusTarget()

  /** Start a new session, or resume a paused one. */
  const start = useCallback(
    async (preset: FocusPresetInfo = timer.preset) => {
      // Storage is async on native: before hydration the state reads 'idle'
      // even when a session is already running, and starting would orphan it.
      if (!timer.hydrated) throw new Error('The timer is still loading. Try again in a moment.')
      if (timer.state === 'paused') {
        resumeSession(timer)
        return
      }
      if (timer.state === 'running') throw new Error('A focus session is already running.')
      const session = await createSession.mutateAsync({ type: preset.type, duration_mins: preset.minutes })
      timer.start(session.id, preset)
      afterStart({ preset, remaining: preset.minutes * 60 })
    },
    [timer, createSession],
  )

  const pause = useCallback(() => pauseSession(timer), [timer])
  const resume = useCallback(() => resumeSession(timer), [timer])

  /** End early and keep the time served: coins and XP for minutes actually focused. */
  const stop = useCallback(() => {
    clearSessionEffects()
    if (timer.sessionId) {
      const elapsedMins = Math.max(0, timer.preset.minutes - timer.remaining / 60)
      completeSession.mutate({ id: timer.sessionId, elapsedMins, treeId: target.tree?.id ?? null })
    }
    timer.reset(timer.preset)
  }, [timer, completeSession, target.tree])

  /** Throw the session away: nothing is credited. */
  const discard = useCallback(() => {
    timer.reset(timer.preset)
    clearSessionEffects()
  }, [timer])

  return {
    timer,
    target,
    start,
    pause,
    resume,
    stop,
    discard,
    starting: createSession.isPending,
  }
}

/**
 * Completes a session when its countdown reaches zero, whichever screen is
 * showing. Mount exactly once, in the tab layout.
 */
export function useFocusCompletion() {
  const timer = useFocusTimer(PRESETS[0])
  const completeSession = useCompleteFocusSession()
  const { tree } = useFocusTarget()
  const completingRef = useRef<string | null>(null)

  useEffect(() => {
    if (timer.state !== 'done') return
    const { sessionId, preset } = timer
    if (!sessionId) {
      timer.reset(preset)
      return
    }
    // A re-render during the mutation must not complete it twice.
    if (completingRef.current === sessionId) return
    completingRef.current = sessionId

    clearSessionEffects()
    const reward = coinsFor({ kind: 'focus', minutes: preset.minutes })
    completeSession.mutate(
      { id: sessionId, elapsedMins: preset.minutes, treeId: tree?.id ?? null },
      {
        onSuccess: () => {
          timer.reset(preset)
          toast.success(
            `Session complete. +${reward.coins} coins${tree ? ` · ${treeName(tree)} +${reward.xp} XP` : ''}`,
          )
        },
        onError: (e) => {
          // Leave the 'done' state in place so the session is not silently lost.
          completingRef.current = null
          toast.error(e instanceof Error ? e.message : 'Could not save your session.')
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.state, timer.sessionId])
}
