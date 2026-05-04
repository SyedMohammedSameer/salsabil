import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  getChallenges,
  createChallenge,
  incrementChallenge,
  updateChallengeStatus,
  deleteChallenge,
} from '@/lib/api/challenges'
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: challengeKeys.all })
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
