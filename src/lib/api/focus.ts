import { supabase } from '@/lib/supabase'
import { localDateString } from '@/lib/dates'
import type { FocusSession, SessionType } from '@/lib/database.types'

// Returns ISO timestamps for the start and end of a YYYY-MM-DD local day,
// expressed as proper UTC ISO strings the DB can compare against `started_at`.
// Fixes the bug where `${today}T00:00:00.000Z` treated local-date strings as
// UTC midnight — a user in Sydney logging a session at 9am local (~23h UTC
// the prior day) wouldn't see it counted in today's totals.
function localDayBoundsUtc(localDate: string): { start: string; end: string } {
  const [y, m, d] = localDate.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).toISOString()
  return { start, end }
}

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

/**
 * Idempotent completion. The `.eq('completed', false)` guard means a second
 * call (e.g. from a retry or duplicate effect run) won't update the row
 * again, so the caller knows not to award coins/XP twice. Returns null if
 * the session was already completed.
 */
export async function completeFocusSession(
  sessionId: string,
  coinsEarned: number,
): Promise<FocusSession | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      completed: true,
      coins_earned: coinsEarned,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('completed', false)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getTodayFocusMinutes(userId: string, today?: string): Promise<number> {
  const dateStr = today ?? localDateString()
  const { start, end } = localDayBoundsUtc(dateStr)
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('duration_mins')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('started_at', start)
    .lt('started_at', end)
  if (error) throw error
  return (data ?? []).reduce((sum, s) => sum + s.duration_mins, 0)
}
