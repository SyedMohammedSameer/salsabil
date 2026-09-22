// Prayer times.
//
// Wraps netlify/functions/prayer-times.ts, which normalises the Aladhan API
// into our prayer names. The function existed in the repository but nothing
// ever called it — this is the client side that was missing.
//
// Shared between web and native. On native the returned times are what the
// on-device adhan notifications are scheduled from (mobile/lib/notifications.ts).

import { functionUrl } from '@/lib/api/functions'

/** Calculation method IDs as accepted by the Aladhan API. */
export const CALCULATION_METHODS = {
  2: 'Islamic Society of North America',
  1: 'University of Islamic Sciences, Karachi',
  3: 'Muslim World League',
  4: 'Umm al-Qura, Makkah',
  5: 'Egyptian General Authority of Survey',
  8: 'Gulf Region',
  12: 'Union des Organisations Islamiques de France',
  13: 'Diyanet İşleri Başkanlığı, Turkey',
} as const

export type CalculationMethod = keyof typeof CALCULATION_METHODS

/** Times are "HH:MM" in the location's local timezone. */
export interface DailyPrayerTimes {
  fajr: string
  sunrise: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
}

export interface PrayerTimesResult {
  prayers: DailyPrayerTimes
  hijri: { date: string; month: { en: string } }
  gregorian: string
}

export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Fetch prayer times for a date.
 *
 * `date` is DD-MM-YYYY, the format Aladhan expects; omit for today.
 */
export async function fetchPrayerTimes(
  coords: Coordinates,
  method: CalculationMethod = 2,
  date?: string,
): Promise<PrayerTimesResult> {
  const params = new URLSearchParams({
    lat: String(coords.latitude),
    lng: String(coords.longitude),
    method: String(method),
  })
  if (date) params.set('date', date)

  const res = await fetch(`${functionUrl('prayer-times')}?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Could not fetch prayer times (${res.status})`)
  }
  return (await res.json()) as PrayerTimesResult
}

/** Format a Date as the DD-MM-YYYY string the endpoint expects. */
export function toAladhanDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

/**
 * Resolve an "HH:MM" prayer time against a calendar day into a real Date.
 *
 * Returns null for malformed input rather than an Invalid Date, so callers
 * cannot accidentally schedule a notification at NaN.
 */
export function prayerTimeToDate(day: Date, hhmm: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim())
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  const d = new Date(day)
  d.setHours(hours, minutes, 0, 0)
  return d
}

/** The five fard prayers, in the order they occur. Sunrise is not a prayer. */
export const FARD_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type FardName = (typeof FARD_ORDER)[number]

/**
 * The next prayer due relative to `now`, or null when all of today's have
 * passed (the caller should then look at tomorrow's fajr).
 */
export function nextPrayer(
  times: DailyPrayerTimes,
  now = new Date(),
): { name: FardName; at: Date } | null {
  for (const name of FARD_ORDER) {
    const at = prayerTimeToDate(now, times[name])
    if (at && at.getTime() > now.getTime()) return { name, at }
  }
  return null
}
