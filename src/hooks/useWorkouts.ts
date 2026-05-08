import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getWorkouts, createWorkout, deleteWorkout } from '@/lib/api/workouts'
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workoutKeys.all })
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
