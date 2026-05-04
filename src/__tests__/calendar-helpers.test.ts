import { describe, it, expect } from 'vitest'

// ─── Calendar grid helpers ────────────────────────────────────────────────────
// Extracted from CalendarView for isolated testing

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const r = new Date(d)
  r.setDate(r.getDate() + diff)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

function getMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const padStart = first.getDay() === 0 ? 6 : first.getDay() - 1
  const padEnd = last.getDay() === 0 ? 0 : 7 - last.getDay()
  const cells: Date[] = []
  for (let i = padStart; i > 0; i--) cells.push(addDays(first, -i))
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) cells.push(new Date(d))
  for (let i = 1; i <= padEnd; i++) cells.push(addDays(last, i))
  return cells
}

describe('startOfWeek()', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date('2025-05-07') // Wednesday
    const mon = startOfWeek(wed)
    expect(mon.toISOString().split('T')[0]).toBe('2025-05-05')
  })

  it('returns Monday for a Sunday', () => {
    const sun = new Date('2025-05-11') // Sunday
    const mon = startOfWeek(sun)
    expect(mon.toISOString().split('T')[0]).toBe('2025-05-05')
  })

  it('returns self for a Monday', () => {
    const mon = new Date('2025-05-05')
    expect(startOfWeek(mon).toISOString().split('T')[0]).toBe('2025-05-05')
  })
})

describe('getWeekDays()', () => {
  it('returns exactly 7 days', () => {
    expect(getWeekDays(new Date('2025-05-07'))).toHaveLength(7)
  })

  it('week starts on Monday', () => {
    const days = getWeekDays(new Date('2025-05-07'))
    expect(days[0].getDay()).toBe(1) // Monday = 1
  })

  it('week ends on Sunday', () => {
    const days = getWeekDays(new Date('2025-05-07'))
    expect(days[6].getDay()).toBe(0) // Sunday = 0
  })

  it('days are consecutive', () => {
    const days = getWeekDays(new Date('2025-05-07'))
    for (let i = 1; i < days.length; i++) {
      const diff = days[i].getTime() - days[i - 1].getTime()
      expect(diff).toBe(86_400_000) // exactly 1 day apart
    }
  })
})

describe('getMonthGrid()', () => {
  it('returns a multiple of 7 (full weeks)', () => {
    const grid = getMonthGrid(new Date('2025-05-01'))
    expect(grid.length % 7).toBe(0)
  })

  it('contains all days in the month', () => {
    const month = new Date('2025-05-01')
    const grid = getMonthGrid(month)
    const daysInMay = 31
    const mayDays = grid.filter((d) => d.getFullYear() === 2025 && d.getMonth() === 4)
    expect(mayDays).toHaveLength(daysInMay)
  })

  it('first cell is a Monday', () => {
    const grid = getMonthGrid(new Date('2025-05-01'))
    expect(grid[0].getDay()).toBe(1) // Monday
  })

  it('last cell is a Sunday', () => {
    const grid = getMonthGrid(new Date('2025-05-01'))
    expect(grid[grid.length - 1].getDay()).toBe(0) // Sunday
  })
})

describe('addDays()', () => {
  it('adds positive days', () => {
    const d = new Date('2025-01-01')
    expect(addDays(d, 5).toISOString().split('T')[0]).toBe('2025-01-06')
  })

  it('subtracts negative days', () => {
    const d = new Date('2025-01-10')
    expect(addDays(d, -5).toISOString().split('T')[0]).toBe('2025-01-05')
  })

  it('does not mutate the original date', () => {
    const d = new Date('2025-01-01')
    addDays(d, 10)
    expect(d.toISOString().split('T')[0]).toBe('2025-01-01')
  })
})
