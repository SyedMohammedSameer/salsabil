import { useQuery } from '@tanstack/react-query'
import {
  fetchPrayerTimes,
  toAladhanDate,
  type CalculationMethod,
  type Coordinates,
} from '@/lib/api/prayerTimes'

export const prayerTimeKeys = {
  byDay: (coords: Coordinates | null, method: CalculationMethod, date: string) =>
    ['prayer-times', coords?.latitude ?? null, coords?.longitude ?? null, method, date] as const,
}

/**
 * Today's prayer times for a location.
 *
 * Cached for the rest of the day: the times for a given date and location never
 * change, so refetching is pure waste — and on native this query is what the
 * scheduled adhan notifications are built from.
 */
export function usePrayerTimes(
  coords: Coordinates | null,
  method: CalculationMethod = 2,
  day: Date = new Date(),
) {
  const date = toAladhanDate(day)

  return useQuery({
    queryKey: prayerTimeKeys.byDay(coords, method, date),
    queryFn: () => fetchPrayerTimes(coords!, method, date),
    enabled: !!coords,
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    // A missing location or an offline device should not retry in a loop.
    retry: 1,
  })
}
