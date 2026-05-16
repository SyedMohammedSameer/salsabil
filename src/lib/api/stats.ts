import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/database.types'
import { getPrayerCountForDate } from './prayers'
import { getTodayTaskStats } from './tasks'
import { getTodayQuranPages } from './quran'
import { getTodayFocusMinutes } from './focus'

export interface DashboardStats {
  streak: number
  longestStreak: number
  coins: number
  prayers: { prayed: number; total: number }
  tasks: { total: number; completed: number }
  quranPages: number
  focusMinutes: number
}

export async function getDashboardStats(profile: Profile, today: string): Promise<DashboardStats> {
  const [prayers, tasks, quranPages, focusMinutes] = await Promise.all([
    getPrayerCountForDate(profile.id, today),
    getTodayTaskStats(profile.id, today),
    getTodayQuranPages(profile.id, today),
    getTodayFocusMinutes(profile.id, today),
  ])

  return {
    streak: profile.streak,
    longestStreak: profile.longest_streak,
    coins: profile.coins,
    prayers,
    tasks,
    quranPages,
    focusMinutes,
  }
}

export async function getNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) return 0
  return count ?? 0
}
