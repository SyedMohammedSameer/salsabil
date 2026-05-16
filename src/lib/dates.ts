// Local-timezone date helpers. The previous code used
// `new Date().toISOString().split('T')[0]` everywhere, which returns the UTC
// date — so a user in Sydney logging at 11pm local saw yesterday's date in
// UTC, breaking every "today" calculation.
//
// `en-CA` locale happens to format dates as YYYY-MM-DD natively, which is
// the same string shape Postgres `date` columns expect.

/** Returns YYYY-MM-DD in the user's local timezone. */
export function localDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

/** Returns a Date N days before today, at midnight local. */
export function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}
