import { describe, it, expect } from 'vitest'
import {
  prayerTimeToDate,
  toAladhanDate,
  nextPrayer,
  FARD_ORDER,
  type DailyPrayerTimes,
} from '@/lib/api/prayerTimes'

const TIMES: DailyPrayerTimes = {
  fajr: '05:12',
  sunrise: '06:34',
  dhuhr: '12:45',
  asr: '16:02',
  maghrib: '18:51',
  isha: '20:15',
}

const dayAt = (h: number, m: number) => new Date(2026, 8, 21, h, m, 0, 0)

describe('toAladhanDate', () => {
  it('formats as DD-MM-YYYY, which is what the endpoint expects', () => {
    expect(toAladhanDate(new Date(2026, 8, 21))).toBe('21-09-2026')
  })

  it('zero-pads single-digit days and months', () => {
    expect(toAladhanDate(new Date(2026, 0, 5))).toBe('05-01-2026')
  })
})

describe('prayerTimeToDate', () => {
  it('resolves an HH:MM time against the given day', () => {
    const d = prayerTimeToDate(new Date(2026, 8, 21), '05:12')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(8)
    expect(d!.getDate()).toBe(21)
    expect(d!.getHours()).toBe(5)
    expect(d!.getMinutes()).toBe(12)
    expect(d!.getSeconds()).toBe(0)
  })

  it('does not mutate the day it is given', () => {
    const day = new Date(2026, 8, 21, 9, 30)
    prayerTimeToDate(day, '18:51')
    expect(day.getHours()).toBe(9)
    expect(day.getMinutes()).toBe(30)
  })

  it('tolerates a single-digit hour', () => {
    expect(prayerTimeToDate(new Date(2026, 8, 21), '5:12')!.getHours()).toBe(5)
  })

  it('ignores a timezone suffix, which Aladhan sometimes appends', () => {
    const d = prayerTimeToDate(new Date(2026, 8, 21), '18:51 (BST)')
    expect(d!.getHours()).toBe(18)
    expect(d!.getMinutes()).toBe(51)
  })

  // A notification scheduled at an Invalid Date either throws or silently never
  // fires, so malformed input must be rejected rather than passed through.
  it('returns null for malformed input instead of an Invalid Date', () => {
    for (const bad of ['', 'not a time', '::', 'abc:de', '-1:00']) {
      expect(prayerTimeToDate(new Date(2026, 8, 21), bad)).toBeNull()
    }
  })

  it('returns null for out-of-range hours and minutes', () => {
    expect(prayerTimeToDate(new Date(2026, 8, 21), '25:00')).toBeNull()
    expect(prayerTimeToDate(new Date(2026, 8, 21), '12:75')).toBeNull()
  })
})

describe('nextPrayer', () => {
  it('returns fajr before dawn', () => {
    expect(nextPrayer(TIMES, dayAt(3, 0))?.name).toBe('fajr')
  })

  it('returns dhuhr in the late morning', () => {
    expect(nextPrayer(TIMES, dayAt(9, 0))?.name).toBe('dhuhr')
  })

  it('skips a prayer whose time has just passed', () => {
    expect(nextPrayer(TIMES, dayAt(12, 46))?.name).toBe('asr')
  })

  it('returns isha in the early evening', () => {
    expect(nextPrayer(TIMES, dayAt(19, 0))?.name).toBe('isha')
  })

  it('returns null once the day is done, so the caller looks at tomorrow', () => {
    expect(nextPrayer(TIMES, dayAt(23, 30))).toBeNull()
  })

  it('treats a prayer exactly at the current minute as already passed', () => {
    // Otherwise "next prayer" would show a time that has arrived.
    expect(nextPrayer(TIMES, dayAt(12, 45))?.name).toBe('asr')
  })

  it('carries the resolved Date alongside the name', () => {
    const next = nextPrayer(TIMES, dayAt(3, 0))
    expect(next!.at.getHours()).toBe(5)
    expect(next!.at.getMinutes()).toBe(12)
  })
})

describe('FARD_ORDER', () => {
  it('lists the five obligatory prayers in the order they occur', () => {
    expect([...FARD_ORDER]).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  })

  it('excludes sunrise, which is not a prayer', () => {
    expect(FARD_ORDER).not.toContain('sunrise')
  })

  it('is ordered by time of day for the supplied times', () => {
    const minutes = FARD_ORDER.map((n) => {
      const d = prayerTimeToDate(new Date(2026, 8, 21), TIMES[n])!
      return d.getHours() * 60 + d.getMinutes()
    })
    expect([...minutes]).toEqual([...minutes].sort((a, b) => a - b))
  })
})
