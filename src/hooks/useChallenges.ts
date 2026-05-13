import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import {
  getChallenges,
  createChallenge,
  incrementChallenge,
  updateChallengeStatus,
  deleteChallenge,
} from '@/lib/api/challenges'
import { awardCoins } from '@/lib/api/coins'
import { waterNewestActiveTree } from '@/lib/api/garden'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { REWARDS } from '@/lib/rewards'
import type { ChallengeStatus } from '@/lib/database.types'

export const challengeKeys = {
  all: ['challenges'] as const,
  list: (userId: string) => ['challenges', 'list', userId] as const,
}

export function useChallenges() {
  const { user } = useAuth()
  return useQuery({
    queryKey: challengeKeys.list(user?.id ?? ''),
    queryFn: () => getChallenges(user!.id),
    enabled: !!user,
  })
}

export function useCreateChallenge() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      target_days: number
      start_date: string
      category?: string
    }) => createChallenge(user!.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeKeys.all })
    },
  })
}

export function useIncrementChallenge() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      currentDays,
      targetDays,
    }: {
      id: string
      currentDays: number
      targetDays: number
    }) => incrementChallenge(id, currentDays, targetDays),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: challengeKeys.all })
      if (!user) return

      const justCompleted = updated.status === 'completed'
      const totalCoins =
        REWARDS.challenge_daily.coins + (justCompleted ? REWARDS.challenge_complete_bonus.coins : 0)
      const totalXP =
        REWARDS.challenge_daily.xp + (justCompleted ? REWARDS.challenge_complete_bonus.xp : 0)

      Promise.allSettled([
        awardCoins(
          user.id,
          'challenge_complete',
          totalCoins,
          justCompleted
            ? `Challenge complete: ${updated.title}`
            : `Challenge day ${updated.current_days}: ${updated.title}`,
        ).then(() => qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })),
        waterNewestActiveTree(user.id, totalXP).then(() =>
          qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) }),
        ),
      ]).then(() => {
        if (justCompleted) {
          toast.success(`Challenge complete! +${totalCoins} coins, +${totalXP} tree XP 🎉`)
        }
      })
    },
  })
}

export function useUpdateChallengeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ChallengeStatus }) =>
      updateChallengeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeKeys.all })
    },
  })
}

export function useDeleteChallenge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteChallenge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeKeys.all })
    },
  })
}
