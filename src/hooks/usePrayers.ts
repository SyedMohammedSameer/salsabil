import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/platform/toast'
import {
  getPrayersForDate,
  getPrayersForDateRange,
  upsertPrayer,
  getPrayerCountForDate,
} from '@/lib/api/prayers'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
import { coinsFor } from '@/lib/rewards'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import type { PrayerName, PrayerStatus } from '@/lib/database.types'
import { useAuth } from './useAuth'

/** The five obligatory prayers. Tahajjud is voluntary and sits outside this. */
const FARD_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

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
    onSuccess: (_data, { date, prayer, status }) => {
      // Invalidate the day's prayer queries so they refetch
      qc.invalidateQueries({ queryKey: prayerKeys.byDate(user!.id, date) })
      qc.invalidateQueries({ queryKey: prayerKeys.countByDate(user!.id, date) })
      if (!user) return

      // Worship is the backbone of the economy. Each prayer slot pays once per
      // day, keyed on date + prayer name, so re-tapping or correcting a status
      // cannot farm coins. Marking something 'missed' pays nothing and writes
      // no ledger row, so logging it honestly later still earns.
      void rewardPrayer(user.id, date, prayer, status, qc)
    },
  })
}

// ─── Prayer rewards ──────────────────────────────────────────────────────────

async function rewardPrayer(
  userId: string,
  date: string,
  prayer: PrayerName,
  status: PrayerStatus,
  qc: ReturnType<typeof useQueryClient>,
) {
  try {
    const reward = coinsFor({ kind: 'prayer', prayer, status })
    let earned = 0

    if (reward.coins > 0) {
      const balance = await awardCoinsOnce(
        userId,
        'prayer_logged',
        reward,
        awardKeys.prayer(date, prayer),
        `${prayer} (${status})`,
      )
      if (balance !== null) earned += reward.coins
    }

    // Completing all five fard in a day is worth a separate bonus, also
    // awarded at most once per day.
    if (FARD_PRAYERS.includes(prayer) && status === 'prayed') {
      const dayPrayers = await getPrayersForDate(userId, date)
      const prayedFard = new Set(
        dayPrayers.filter((p) => p.status === 'prayed').map((p) => p.prayer),
      )
      const allFive = FARD_PRAYERS.every((p) => prayedFard.has(p))

      if (allFive) {
        const bonus = coinsFor({ kind: 'prayer_day_complete' })
        const balance = await awardCoinsOnce(
          userId,
          'prayer_logged',
          bonus,
          awardKeys.prayerDayComplete(date),
          'All five daily prayers',
        )
        if (balance !== null) {
          earned += bonus.coins
          toast.success(`All five prayers complete — +${bonus.coins} bonus coins. Alhamdulillah.`)
        }
      }
    }

    if (earned > 0) {
      qc.invalidateQueries({ queryKey: profileKeys.byId(userId) })
      qc.invalidateQueries({ queryKey: gardenKeys.trees(userId) })
    }
  } catch {
    // The prayer log itself saved; a failed payout must not surface as an error.
  }
}
