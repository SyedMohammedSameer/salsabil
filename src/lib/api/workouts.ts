import { supabase } from '@/lib/supabase'
import type { Workout, WorkoutType } from '@/lib/database.types'

export async function getWorkouts(userId: string, limit = 50): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function createWorkout(
  userId: string,
  input: { type: WorkoutType; title: string; duration_mins: number; notes?: string; date: string },
): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}
