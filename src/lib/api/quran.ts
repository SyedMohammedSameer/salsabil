import { supabase } from '@/lib/supabase'
import type { QuranLog } from '@/lib/database.types'

export async function getQuranLogs(userId: string, limit = 50): Promise<QuranLog[]> {
  const { data, error } = await supabase
    .from('quran_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getQuranLogsForDate(userId: string, date: string): Promise<QuranLog[]> {
  const { data, error } = await supabase
    .from('quran_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw error
  return data ?? []
}

export async function getWeeklyQuranPages(
  userId: string,
  from: string,
  to: string,
): Promise<{ date: string; pages: number }[]> {
  const { data, error } = await supabase
    .from('quran_logs')
    .select('date, pages_read')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
  if (error) throw error
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    map.set(row.date, (map.get(row.date) ?? 0) + Number(row.pages_read))
  }
  return Array.from(map.entries()).map(([date, pages]) => ({ date, pages }))
}

export async function createQuranLog(
  userId: string,
  input: {
    date: string
    surah_from: number
    ayah_from: number
    surah_to: number
    ayah_to: number
    pages_read: number
    duration_mins?: number
    notes?: string
  },
): Promise<QuranLog> {
  const { data, error } = await supabase
    .from('quran_logs')
    .insert({
      user_id: userId,
      ...input,
      duration_mins: input.duration_mins ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTodayQuranPages(userId: string, date: string): Promise<number> {
  const { data, error } = await supabase
    .from('quran_logs')
    .select('pages_read')
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw error
  return (data ?? []).reduce((sum, r) => sum + Number(r.pages_read), 0)
}
