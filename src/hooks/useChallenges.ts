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
import { getChallengeRewards } from '@/data/challengeTemplates'
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
      /** Passed through for coin calculation in onSuccess */
      category?: string | null
    }) => incrementChallenge(id, currentDays, targetDays),

    onSuccess: (updated, variables) => {
      qc.invalidateQueries({ queryKey: challengeKeys.all })
      if (!user) return

      const { coinsPerDay, completionBonus, treeXpPerDay, treeXpCompletionBonus } =
        getChallengeRewards(variables.category)

      const justCompleted = updated.status === 'completed'
      const totalCoins = coinsPerDay + (justCompleted ? completionBonus : 0)
      const totalXP = treeXpPerDay + (justCompleted ? treeXpCompletionBonus : 0)

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
          toast.success(
            `🏆 Challenge complete! +${totalCoins.toLocaleString()} coins, +${totalXP} tree XP 🎉`,
            { duration: 6000 },
          )
        } else {
          toast.success(`+${totalCoins} coins 🔥 Day ${updated.current_days} done!`)
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
