import { supabase } from '@/lib/supabase'
import type { Challenge, ChallengeStatus } from '@/lib/database.types'

export async function getChallenges(userId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createChallenge(
  userId: string,
  input: {
    title: string
    description?: string
    target_days: number
    start_date: string
    category?: string
  },
): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      user_id: userId,
      ...input,
      current_days: 0,
      status: 'active' as ChallengeStatus,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function incrementChallenge(
  id: string,
  currentDays: number,
  targetDays: number,
): Promise<Challenge> {
  const newDays = currentDays + 1
  const status: ChallengeStatus = newDays >= targetDays ? 'completed' : 'active'
  const { data, error } = await supabase
    .from('challenges')
    .update({ current_days: newDays, status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChallengeStatus(
  id: string,
  status: ChallengeStatus,
): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase.from('challenges').delete().eq('id', id)
  if (error) throw error
}
