import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  getFocusSessions,
  createFocusSession,
  completeFocusSession,
  getTodayFocusMinutes,
} from '@/lib/api/focus'
import { awardCoins } from '@/lib/api/coins'
import { waterNewestActiveTree } from '@/lib/api/garden'
import { createNotification } from '@/lib/api/notifications'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { notificationKeys } from './useNotifications'
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
  return useQuery({
    queryKey: focusKeys.todayMins(user?.id ?? ''),
    queryFn: () => getTodayFocusMinutes(user!.id),
    enabled: !!user,
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
    mutationFn: async ({
      id,
      coinsEarned,
      durationMins,
    }: {
      id: string
      coinsEarned: number
      durationMins: number
    }) => {
      const session = await completeFocusSession(id, coinsEarned)
      if (user) {
        const sideEffects: Promise<unknown>[] = [
          waterNewestActiveTree(user.id, Math.ceil(durationMins / 5)),
          createNotification({
            user_id: user.id,
            type: 'focus_complete',
            title: 'Session complete! MashaAllah.',
            body: `${durationMins}m focus — you earned ${coinsEarned} coins.`,
            action_url: '/focus',
          }),
        ]
        if (coinsEarned > 0) {
          sideEffects.push(
            awardCoins(user.id, 'focus_complete', coinsEarned, `${durationMins}m focus session`),
          )
        }
        await Promise.allSettled(sideEffects)
      }
      return session
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all })
      if (user) {
        qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
        qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })
        qc.invalidateQueries({ queryKey: notificationKeys.all(user.id) })
      }
    },
  })
}
