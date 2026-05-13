import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { getWorkouts, createWorkout, deleteWorkout } from '@/lib/api/workouts'
import { awardCoins } from '@/lib/api/coins'
import { waterNewestActiveTree } from '@/lib/api/garden'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { REWARDS } from '@/lib/rewards'
import type { WorkoutType } from '@/lib/database.types'

export const workoutKeys = {
  all: ['workouts'] as const,
  list: (userId: string) => ['workouts', 'list', userId] as const,
}

export function useWorkouts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: workoutKeys.list(user?.id ?? ''),
    queryFn: () => getWorkouts(user!.id),
    enabled: !!user,
  })
}

export function useCreateWorkout() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      type: WorkoutType
      title: string
      duration_mins: number
      notes?: string
      date: string
    }) => createWorkout(user!.id, input),
    onSuccess: (workout) => {
      qc.invalidateQueries({ queryKey: workoutKeys.all })
      if (!user) return
      Promise.allSettled([
        awardCoins(
          user.id,
          'workout_logged',
          REWARDS.workout_logged.coins,
          `Workout: ${workout.title}`,
        ).then(() => qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })),
        waterNewestActiveTree(user.id, REWARDS.workout_logged.xp).then(() =>
          qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) }),
        ),
      ]).then(() => {
        toast.success(
          `+${REWARDS.workout_logged.coins} coins, +${REWARDS.workout_logged.xp} tree XP`,
        )
      })
    },
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWorkout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutKeys.all })
    },
  })
}
