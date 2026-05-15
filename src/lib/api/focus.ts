import { supabase } from '@/lib/supabase'
import { localDateString } from '@/lib/dates'
import type { FocusSession, SessionType } from '@/lib/database.types'

export async function getFocusSessions(userId: string, limit = 50): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function createFocusSession(
  userId: string,
  input: { type: SessionType; duration_mins: number; task_id?: string },
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      type: input.type,
      duration_mins: input.duration_mins,
      task_id: input.task_id ?? null,
      completed: false,
      coins_earned: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeFocusSession(
  sessionId: string,
  coinsEarned: number,
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      completed: true,
      coins_earned: coinsEarned,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTodayFocusMinutes(userId: string): Promise<number> {
  const today = localDateString()
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('duration_mins, completed')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('started_at', `${today}T00:00:00.000Z`)
  if (error) throw error
  return (data ?? []).reduce((sum, s) => sum + s.duration_mins, 0)
}
