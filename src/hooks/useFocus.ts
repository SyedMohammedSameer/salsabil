import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  getFocusSessions,
  createFocusSession,
  completeFocusSession,
  getTodayFocusMinutes,
} from '@/lib/api/focus'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
import { createNotification } from '@/lib/api/notifications'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { notificationKeys } from './useNotifications'
import { localDateString } from '@/lib/dates'
import { coinsFor } from '@/lib/rewards'
import type { SessionType } from '@/lib/database.types'

export const focusKeys = {
  all: ['focus'] as const,
  sessions: (userId: string) => ['focus', 'sessions', userId] as const,
  todayMins: (userId: string) => ['focus', 'today', userId] as const,
}

export function useFocusSessions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: focusKeys.sessions(user?.id ?? ''),
    queryFn: () => getFocusSessions(user!.id),
    enabled: !!user,
  })
}

export function useTodayFocusMinutes() {
  const { user } = useAuth()
  const today = localDateString()
  return useQuery({
    queryKey: [...focusKeys.todayMins(user?.id ?? ''), today],
    queryFn: () => getTodayFocusMinutes(user!.id, today),
    enabled: !!user,
    staleTime: 10_000,
  })
}

export function useCreateFocusSession() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { type: SessionType; duration_mins: number; task_id?: string }) =>
      createFocusSession(user!.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all })
    },
  })
}

export function useCompleteFocusSession() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, elapsedMins }: { id: string; elapsedMins: number }) => {
      // Skip empty IDs — happens if the optimistic timer started but the
      // server-side createFocusSession failed silently.
      if (!id) {
        throw new Error('No session to complete')
      }

      // The payout is derived here from time actually elapsed, never supplied
      // by the caller. Previously a skipped session reported its full preset
      // duration, which paid zero coins but still granted the full tree XP —
      // start-then-skip was unlimited free growth.
      const mins = Math.max(0, Math.floor(elapsedMins))
      const reward = coinsFor({ kind: 'focus', minutes: mins })

      const session = await completeFocusSession(id, reward.coins)
      // `null` means the session was already completed — don't award again
      if (!session) {
        return null
      }
      if (user) {
        await Promise.allSettled([
          awardCoinsOnce(
            user.id,
            'focus_complete',
            reward,
            awardKeys.focus(id),
            `${mins}m focus session`,
          ),
          createNotification({
            user_id: user.id,
            type: 'focus_complete',
            title: 'Session complete! MashaAllah.',
            body:
              reward.coins > 0
                ? `${mins}m focus — you earned ${reward.coins} coins.`
                : `${mins}m focus logged.`,
            action_url: '/focus',
          }),
        ])
      }
      return session
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all })
      // Dashboard stats card pulls focusMinutes — keep it in sync.
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      if (user) {
        qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
        qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })
        qc.invalidateQueries({ queryKey: notificationKeys.all(user.id) })
      }
    },
  })
}
