import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getQuranLogs,
  getQuranLogsForDate,
  getWeeklyQuranPages,
  createQuranLog,
  getTodayQuranPages,
  updateQuranLog,
  deleteQuranLog,
  type QuranLogUpdate,
} from '@/lib/api/quran'
import { awardCoinsOnce, awardKeys, reverseAward } from '@/lib/api/coins'
import type { QuranLog } from '@/lib/database.types'
import { coinsFor } from '@/lib/rewards'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { useAuth } from './useAuth'
import { toast } from '@/lib/platform/toast'

export const quranKeys = {
  all: (userId: string) => ['quran', userId] as const,
  byDate: (userId: string, date: string) => ['quran', userId, 'date', date] as const,
  weekly: (userId: string, from: string, to: string) =>
    ['quran', userId, 'week', from, to] as const,
  todayPages: (userId: string, date: string) => ['quran-pages', userId, date] as const,
}

export function useQuranLogs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: quranKeys.all(user?.id ?? ''),
    queryFn: () => getQuranLogs(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useQuranLogsForDate(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: quranKeys.byDate(user?.id ?? '', date),
    queryFn: () => getQuranLogsForDate(user!.id, date),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useWeeklyQuranPages(from: string, to: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: quranKeys.weekly(user?.id ?? '', from, to),
    queryFn: () => getWeeklyQuranPages(user!.id, from, to),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useTodayQuranPages(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: quranKeys.todayPages(user?.id ?? '', date),
    queryFn: () => getTodayQuranPages(user!.id, date),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useCreateQuranLog() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createQuranLog>[1]) => createQuranLog(user!.id, input),
    onSuccess: (log) => {
      qc.invalidateQueries({ queryKey: quranKeys.all(user!.id) })
      qc.invalidateQueries({ queryKey: quranKeys.byDate(user!.id, log.date) })
      qc.invalidateQueries({ queryKey: quranKeys.todayPages(user!.id, log.date) })
      if (!user) return

      // Paid per page, keyed on the log row so a realtime echo or retry cannot
      // pay twice. Capped inside coinsFor so one enormous entry cannot mint a
      // fortune.
      const reward = coinsFor({ kind: 'quran', pages: log.pages_read })
      if (reward.coins <= 0) return

      awardCoinsOnce(
        user.id,
        'quran_page',
        reward,
        awardKeys.quran(log.id),
        `Quran: ${log.pages_read} page(s)`,
      )
        .then((balance) => {
          if (balance === null) return
          qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
          qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })
          toast.success(`+${reward.coins} coins — may Allah accept your recitation.`)
        })
        .catch(() => {
          /* the log itself saved; a failed payout must not surface as an error */
        })
    },
  })
}

function invalidateQuran(qc: ReturnType<typeof useQueryClient>, userId: string) {
  // Every Quran query (lists, per day, weekly, today's pages) starts with one
  // of these two prefixes.
  qc.invalidateQueries({ queryKey: ['quran', userId] })
  qc.invalidateQueries({ queryKey: ['quran-pages', userId] })
}

/**
 * Correct a reading. Coins stay as first paid: changing the page count later
 * does not pay more, or take any back.
 */
export function useUpdateQuranLog() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: QuranLogUpdate }) =>
      updateQuranLog(id, updates),
    onSuccess: () => invalidateQuran(qc, user!.id),
  })
}

/** Delete a reading, and take back the coins it earned. */
export function useDeleteQuranLog() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: QuranLog) => {
      await deleteQuranLog(log.id)
      const reward = coinsFor({ kind: 'quran', pages: log.pages_read })
      await reverseAward(
        user!.id,
        awardKeys.quran(log.id),
        'quran_page',
        reward.coins,
        'Removed a Quran log',
      )
    },
    onSuccess: () => {
      invalidateQuran(qc, user!.id)
      qc.invalidateQueries({ queryKey: profileKeys.byId(user!.id) })
    },
  })
}
