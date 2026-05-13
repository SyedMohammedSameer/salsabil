// ISO-week helpers (week starts Monday). All times in local timezone.

export function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  // getDay: Sunday=0, Monday=1 ... Saturday=6 → days since Monday
  const daysSinceMon = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - daysSinceMon)
  return out
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  end.setMilliseconds(end.getMilliseconds() - 1)
  return end
}

export function addWeeks(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n * 7)
  return out
}

export function isSameWeek(a: Date, b: Date): boolean {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime()
}

export function weekKey(d: Date): string {
  const s = startOfWeek(d)
  return s.toISOString().slice(0, 10)
}

// "Mar 4 – Mar 10" style label; uses current year unless different from now.
export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const startStr = weekStart.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const endStr = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
  })
  const now = new Date()
  const yearSuffix =
    weekStart.getFullYear() !== now.getFullYear() ? `, ${weekStart.getFullYear()}` : ''
  return `${startStr} – ${endStr}${yearSuffix}`
}
