import { localDateString } from '@/lib/dates'

// Small display formatters shared by the native screens.

/** "15:47" or "15:47:00" → "3:47 PM". */
export function clock12(hhmm: string | null | undefined): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "in 1h 12m", "in 4m", "now". */
export function untilLabel(at: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60_000))
  if (mins < 1) return 'now'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
}

/** "45m", "1h 20m". */
export function durationLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`
}

/** "Today", "Tomorrow", "Yesterday", else "Mon 29 Sep". */
export function relativeDay(date: string, today = localDateString()): string {
  if (date === today) return 'Today'
  const d = parseDate(date)
  const t = parseDate(today)
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000)
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** YYYY-MM-DD → local midnight Date. */
export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return localDateString(d)
}
