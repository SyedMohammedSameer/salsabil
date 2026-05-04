import { supabase } from '@/lib/supabase'
import type { AdhkarLog, AdhkarTime } from '@/lib/database.types'

export async function getAdhkarLogsForDate(userId: string, date: string): Promise<AdhkarLog[]> {
  const { data, error } = await supabase
    .from('adhkar_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw error
  return data ?? []
}

export async function logAdhkarComplete(
  userId: string,
  date: string,
  time: AdhkarTime,
): Promise<AdhkarLog> {
  const { data, error } = await supabase
    .from('adhkar_logs')
    .upsert(
      {
        user_id: userId,
        date,
        time,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date,time' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}
