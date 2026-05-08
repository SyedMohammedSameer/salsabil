import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cn } from '@/lib/cn'
import { getDailyQuote, ISLAMIC_QUOTES } from '@/data/quotes'

// ─── cn() ────────────────────────────────────────────────────────────────────

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    const condition = false
    expect(cn('base', condition && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles undefined/null gracefully', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('returns empty string for no valid classes', () => {
    expect(cn(false, undefined, null)).toBe('')
  })
})

// ─── getDailyQuote() ─────────────────────────────────────────────────────────

describe('getDailyQuote()', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('returns a valid quote object', () => {
    const q = getDailyQuote()
    expect(q).toHaveProperty('arabic')
    expect(q).toHaveProperty('translation')
    expect(q).toHaveProperty('source')
    expect(typeof q.arabic).toBe('string')
    expect(q.arabic.length).toBeGreaterThan(0)
  })

  it('always returns a quote within the ISLAMIC_QUOTES array', () => {
    const q = getDailyQuote()
    expect(ISLAMIC_QUOTES).toContainEqual(q)
  })

  it('returns different quotes on different days', () => {
    // Day 0 and day 1 should yield different quotes (unless array length == 1)
    vi.setSystemTime(new Date('2025-01-01'))
    const q1 = getDailyQuote()
    vi.setSystemTime(new Date('2025-01-02'))
    const q2 = getDailyQuote()
    // With 50 quotes and 2 different days, they won't be the same
    expect(ISLAMIC_QUOTES.length).toBeGreaterThan(1)
    expect(q1).not.toEqual(q2)
    vi.useRealTimers()
  })

  it('rotates across all quotes (no index out of bounds)', () => {
    // Run for 365 days — should never throw
    const base = new Date('2025-01-01').getTime()
    for (let day = 0; day < 365; day++) {
      vi.setSystemTime(base + day * 86_400_000)
      expect(() => getDailyQuote()).not.toThrow()
    }
    vi.useRealTimers()
  })
})
