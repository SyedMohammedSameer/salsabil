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
    const wed = new Date(2025, 4, 7) // May 7 local — Wednesday
    const mon = startOfWeek(wed)
    expect(mon.getFullYear()).toBe(2025)
    expect(mon.getMonth()).toBe(4)
    expect(mon.getDate()).toBe(5) // May 5 is the Monday
  })

  it('returns Monday for a Sunday', () => {
    const sun = new Date(2025, 4, 11) // May 11 local — Sunday
    const mon = startOfWeek(sun)
    expect(mon.getFullYear()).toBe(2025)
    expect(mon.getMonth()).toBe(4)
    expect(mon.getDate()).toBe(5) // same week's Monday
  })

  it('returns self for a Monday', () => {
    const mon = new Date(2025, 4, 5) // May 5 local — Monday
    const result = startOfWeek(mon)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(4)
    expect(result.getDate()).toBe(5)
  })
})

describe('getWeekDays()', () => {
  it('returns exactly 7 days', () => {
    expect(getWeekDays(new Date(2025, 4, 7))).toHaveLength(7)
  })

  it('week starts on Monday', () => {
    const days = getWeekDays(new Date(2025, 4, 7)) // May 7 local — Wednesday
    expect(days[0].getDay()).toBe(1) // Monday = 1
  })

  it('week ends on Sunday', () => {
    const days = getWeekDays(new Date(2025, 4, 7)) // May 7 local — Wednesday
    expect(days[6].getDay()).toBe(0) // Sunday = 0
  })

  it('days are consecutive', () => {
    const days = getWeekDays(new Date(2025, 4, 7)) // May 7 local — Wednesday
    for (let i = 1; i < days.length; i++) {
      const diff = days[i].getTime() - days[i - 1].getTime()
      expect(diff).toBe(86_400_000) // exactly 1 day apart
    }
  })
})

describe('getMonthGrid()', () => {
  it('returns a multiple of 7 (full weeks)', () => {
    const grid = getMonthGrid(new Date(2025, 4, 1)) // May 1 local
    expect(grid.length % 7).toBe(0)
  })

  it('contains all days in the month', () => {
    const month = new Date(2025, 4, 1) // May 1 local
    const grid = getMonthGrid(month)
    const daysInMay = 31
    const mayDays = grid.filter((d) => d.getFullYear() === 2025 && d.getMonth() === 4)
    expect(mayDays).toHaveLength(daysInMay)
  })

  it('first cell is a Monday', () => {
    const grid = getMonthGrid(new Date(2025, 4, 1)) // May 1 local
    expect(grid[0].getDay()).toBe(1) // Monday
  })

  it('last cell is a Sunday', () => {
    const grid = getMonthGrid(new Date(2025, 4, 1)) // May 1 local
    expect(grid[grid.length - 1].getDay()).toBe(0) // Sunday
  })
})

describe('addDays()', () => {
  it('adds positive days', () => {
    const d = new Date(2025, 0, 1) // Jan 1 local
    const result = addDays(d, 5)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(6) // Jan 6
  })

  it('subtracts negative days', () => {
    const d = new Date(2025, 0, 10) // Jan 10 local
    const result = addDays(d, -5)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(5) // Jan 5
  })

  it('does not mutate the original date', () => {
    const d = new Date(2025, 0, 1) // Jan 1 local
    addDays(d, 10)
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })
})
