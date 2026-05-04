import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Prayer scoring logic ────────────────────────────────────────────────────
// We test the pure scoring/filtering logic in isolation without hitting DB.

const FARDH_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type PrayerStatus = 'prayed' | 'missed' | 'late' | 'qada'

/** Pure helper: count prayed prayers from a list */
function countPrayed(prayers: { prayer: string; status: PrayerStatus }[]): number {
  return prayers.filter((p) => p.status === 'prayed').length
}

/** Pure helper: is a prayer considered "done" (counts toward streak) */
function isPrayerDone(status: PrayerStatus | null): boolean {
  return status === 'prayed' || status === 'late' || status === 'qada'
}

/** Pure helper: format date to YYYY-MM-DD */
function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

describe('Prayer scoring', () => {
  it('counts only prayed status', () => {
    const prayers = [
      { prayer: 'fajr', status: 'prayed' as PrayerStatus },
      { prayer: 'dhuhr', status: 'missed' as PrayerStatus },
      { prayer: 'asr', status: 'late' as PrayerStatus },
    ]
    expect(countPrayed(prayers)).toBe(1)
  })

  it('returns 0 when all missed', () => {
    const prayers = FARDH_PRAYERS.map((p) => ({ prayer: p, status: 'missed' as PrayerStatus }))
    expect(countPrayed(prayers)).toBe(0)
  })

  it('returns 5 when all prayed', () => {
    const prayers = FARDH_PRAYERS.map((p) => ({ prayer: p, status: 'prayed' as PrayerStatus }))
    expect(countPrayed(prayers)).toBe(5)
  })
})

describe('isPrayerDone()', () => {
  it('prayed counts as done', () => expect(isPrayerDone('prayed')).toBe(true))
  it('late counts as done', () => expect(isPrayerDone('late')).toBe(true))
  it('qada counts as done', () => expect(isPrayerDone('qada')).toBe(true))
  it('missed does NOT count as done', () => expect(isPrayerDone('missed')).toBe(false))
  it('null does NOT count as done', () => expect(isPrayerDone(null)).toBe(false))
})

describe('Date formatting', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('formats today correctly', () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
    expect(fmtDate(new Date())).toBe('2025-06-15')
  })

  it('zero-pads month and day', () => {
    vi.setSystemTime(new Date('2025-01-05T00:00:00Z'))
    expect(fmtDate(new Date())).toBe('2025-01-05')
  })
})

describe('Fardh prayer list', () => {
  it('contains exactly 5 prayers', () => {
    expect(FARDH_PRAYERS).toHaveLength(5)
  })

  it('contains all required prayers', () => {
    expect(FARDH_PRAYERS).toContain('fajr')
    expect(FARDH_PRAYERS).toContain('dhuhr')
    expect(FARDH_PRAYERS).toContain('asr')
    expect(FARDH_PRAYERS).toContain('maghrib')
    expect(FARDH_PRAYERS).toContain('isha')
  })
})
