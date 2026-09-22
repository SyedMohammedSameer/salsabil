import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/platform/toast'
import { useAuth } from './useAuth'
import {
  getChallenges,
  createChallenge,
  incrementChallenge,
  updateChallengeStatus,
  updateChallenge,
  deleteChallenge,
} from '@/lib/api/challenges'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
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

      // The daily tick and the completion bonus are keyed separately so a
      // retried or double-fired increment cannot pay either one twice.
      const awards: Promise<number | null>[] = [
        awardCoinsOnce(
          user.id,
          'challenge_complete',
          { coins: coinsPerDay, xp: treeXpPerDay },
          awardKeys.challengeDay(updated.id, updated.current_days),
          `Challenge day ${updated.current_days}: ${updated.title}`,
        ),
      ]
      if (justCompleted) {
        awards.push(
          awardCoinsOnce(
            user.id,
            'challenge_complete',
            { coins: completionBonus, xp: treeXpCompletionBonus },
            awardKeys.challengeComplete(updated.id),
            `Challenge complete: ${updated.title}`,
          ),
        )
      }

      Promise.all(awards)
        .then((balances) => {
          // Nothing landed — this increment had already been paid out.
          if (balances.every((b) => b === null)) return
          qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
          qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })

          if (justCompleted) {
            toast.success(
              `🏆 Challenge complete! +${totalCoins.toLocaleString()} coins, +${totalXP} tree XP 🎉`,
              { duration: 6000 },
            )
          } else {
            toast.success(`+${totalCoins} coins 🔥 Day ${updated.current_days} done!`)
          }
        })
        .catch(() => {
          /* the challenge progress itself saved; a failed payout is not an error */
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

export function useUpdateChallenge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string; title?: string; description?: string | null }) =>
      updateChallenge(id, updates),
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
