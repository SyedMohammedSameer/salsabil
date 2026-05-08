import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getQuranLogs,
  getQuranLogsForDate,
  getWeeklyQuranPages,
  createQuranLog,
  getTodayQuranPages,
} from '@/lib/api/quran'
import { useAuth } from './useAuth'

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
    },
  })
}
