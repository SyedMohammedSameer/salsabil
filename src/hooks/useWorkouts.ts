import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/platform/toast'
import { useAuth } from './useAuth'
import { getWorkouts, createWorkout, deleteWorkout, updateWorkout } from '@/lib/api/workouts'
import { awardCoinsOnce, awardKeys, reverseAward } from '@/lib/api/coins'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { coinsFor } from '@/lib/rewards'
import type { Workout, WorkoutType } from '@/lib/database.types'

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
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    // Takes an id (web) or the workout (native). With the workout, the coins
    // it earned are taken back, so delete-and-relog cannot pay twice.
    mutationFn: async (target: string | Workout) => {
      const id = typeof target === 'string' ? target : target.id
      await deleteWorkout(id)
      if (user) {
        await reverseAward(
          user.id,
          awardKeys.workout(id),
          'workout_logged',
          coinsFor({ kind: 'workout' }).coins,
          'Removed a workout',
        )
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutKeys.all })
      if (user) qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
    },
  })
}

export function useUpdateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateWorkout>[1] }) =>
      updateWorkout(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}
