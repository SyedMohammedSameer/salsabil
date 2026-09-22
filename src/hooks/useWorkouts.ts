import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/platform/toast'
import { useAuth } from './useAuth'
import { getWorkouts, createWorkout, deleteWorkout } from '@/lib/api/workouts'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { coinsFor } from '@/lib/rewards'
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
      const reward = coinsFor({ kind: 'workout' })
      awardCoinsOnce(
        user.id,
        'workout_logged',
        reward,
        awardKeys.workout(workout.id),
        `Workout: ${workout.title}`,
      )
        .then((balance) => {
          if (balance === null) return
          qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
          qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })
          toast.success(`+${reward.coins} coins, +${reward.xp} tree XP`)
        })
        .catch(() => {
          /* the workout itself saved; a failed payout must not surface as an error */
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
