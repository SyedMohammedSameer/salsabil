import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPrayersForDate,
  getPrayersForDateRange,
  upsertPrayer,
  getPrayerCountForDate,
} from '@/lib/api/prayers'
import type { PrayerName, PrayerStatus } from '@/lib/database.types'
import { useAuth } from './useAuth'

export const prayerKeys = {
  all: ['prayers'] as const,
  byDate: (userId: string, date: string) => ['prayers', userId, date] as const,
  byRange: (userId: string, from: string, to: string) => ['prayers', userId, from, to] as const,
  countByDate: (userId: string, date: string) => ['prayers-count', userId, date] as const,
}

export function usePrayersForDate(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: prayerKeys.byDate(user?.id ?? '', date),
    queryFn: () => getPrayersForDate(user!.id, date),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function usePrayersForRange(from: string, to: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: prayerKeys.byRange(user?.id ?? '', from, to),
    queryFn: () => getPrayersForDateRange(user!.id, from, to),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function usePrayerCountForDate(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: prayerKeys.countByDate(user?.id ?? '', date),
    queryFn: () => getPrayerCountForDate(user!.id, date),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useUpsertPrayer() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      date,
      prayer,
      status,
    }: {
      date: string
      prayer: PrayerName
      status: PrayerStatus
    }) => upsertPrayer(user!.id, date, prayer, status),
    onSuccess: (_data, { date }) => {
      // Invalidate the day's prayer queries so they refetch
      qc.invalidateQueries({ queryKey: prayerKeys.byDate(user!.id, date) })
      qc.invalidateQueries({ queryKey: prayerKeys.countByDate(user!.id, date) })
    },
  })
}
