import { supabase } from '@/lib/supabase'
import type { Prayer, PrayerName, PrayerStatus } from '@/lib/database.types'

export async function getPrayersForDate(userId: string, date: string): Promise<Prayer[]> {
  const { data, error } = await supabase
    .from('prayers')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw error
  return data ?? []
}

export async function getPrayersForDateRange(
  userId: string,
  from: string,
  to: string,
): Promise<Prayer[]> {
  const { data, error } = await supabase
    .from('prayers')
    .select('*')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertPrayer(
  userId: string,
  date: string,
  prayer: PrayerName,
  status: PrayerStatus,
): Promise<Prayer> {
  const { data, error } = await supabase
    .from('prayers')
    .upsert(
      {
        user_id: userId,
        date,
        prayer,
        status,
        prayed_at: status === 'prayed' ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,date,prayer' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Count how many fardh prayers were logged as 'prayed' for a given date */
export async function getPrayerCountForDate(
  userId: string,
  date: string,
): Promise<{ prayed: number; total: number }> {
  const FARDH: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
  const { data, error } = await supabase
    .from('prayers')
    .select('prayer, status')
    .eq('user_id', userId)
    .eq('date', date)
    .in('prayer', FARDH)
  if (error) throw error
  const prayed = (data ?? []).filter((r) => r.status === 'prayed').length
  return { prayed, total: 5 }
}
