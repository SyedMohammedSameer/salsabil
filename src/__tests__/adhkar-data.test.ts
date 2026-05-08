import { describe, it, expect } from 'vitest'
import {
  MORNING_ADHKAR,
  EVENING_ADHKAR,
  AFTER_PRAYER_ADHKAR,
  ADHKAR_SETS,
  ADHKAR_SET_LABELS,
} from '@/data/adhkar'

describe('Adhkar data', () => {
  it('morning adhkar has at least 1 item', () => {
    expect(MORNING_ADHKAR.length).toBeGreaterThanOrEqual(1)
  })

  it('evening adhkar has at least 1 item', () => {
    expect(EVENING_ADHKAR.length).toBeGreaterThanOrEqual(1)
  })

  it('after prayer adhkar has at least 1 item', () => {
    expect(AFTER_PRAYER_ADHKAR.length).toBeGreaterThanOrEqual(1)
  })

  it('every adhkar item has required fields', () => {
    const all = [...MORNING_ADHKAR, ...EVENING_ADHKAR, ...AFTER_PRAYER_ADHKAR]
    for (const item of all) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('arabic')
      expect(item).toHaveProperty('translation')
      expect(item).toHaveProperty('count')
      expect(typeof item.id).toBe('string')
      expect(item.id.length).toBeGreaterThan(0)
      expect(item.count).toBeGreaterThanOrEqual(1)
    }
  })

  it('ADHKAR_SETS maps all three sets correctly', () => {
    expect(ADHKAR_SETS.morning).toEqual(MORNING_ADHKAR)
    expect(ADHKAR_SETS.evening).toEqual(EVENING_ADHKAR)
    expect(ADHKAR_SETS.after_prayer).toEqual(AFTER_PRAYER_ADHKAR)
  })

  it('ADHKAR_SET_LABELS has human-readable labels', () => {
    expect(ADHKAR_SET_LABELS.morning).toBeTruthy()
    expect(ADHKAR_SET_LABELS.evening).toBeTruthy()
    expect(ADHKAR_SET_LABELS.after_prayer).toBeTruthy()
  })

  it('adhkar item ids are unique within each set', () => {
    for (const set of [MORNING_ADHKAR, EVENING_ADHKAR, AFTER_PRAYER_ADHKAR]) {
      const ids = set.map((i) => i.id)
      const unique = new Set(ids)
      expect(ids.length).toBe(unique.size)
    }
  })
})
