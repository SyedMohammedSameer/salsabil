import { describe, it, expect } from 'vitest'
import { nextOccurrence } from '@/lib/api/tasks'
import {
  challengeChecklist,
  encodeChallengeCategory,
  CHALLENGE_TEMPLATES,
} from '@/data/challengeTemplates'

describe('nextOccurrence', () => {
  it('returns null for a task that does not repeat', () => {
    expect(nextOccurrence('2026-09-30', 'none')).toBeNull()
  })
  it('moves a daily task to the next day, across a month end', () => {
    expect(nextOccurrence('2026-09-30', 'daily')).toBe('2026-10-01')
    expect(nextOccurrence('2026-12-31', 'daily')).toBe('2027-01-01')
  })
  it('moves a weekly task seven days on', () => {
    expect(nextOccurrence('2026-09-28', 'weekly')).toBe('2026-10-05')
  })
  it('keeps the day of month for a monthly task', () => {
    expect(nextOccurrence('2026-09-15', 'monthly')).toBe('2026-10-15')
    expect(nextOccurrence('2026-12-15', 'monthly')).toBe('2027-01-15')
  })
  it('clamps a monthly task to the last day of a shorter month', () => {
    expect(nextOccurrence('2027-01-31', 'monthly')).toBe('2027-02-28')
    expect(nextOccurrence('2028-01-31', 'monthly')).toBe('2028-02-29')
    expect(nextOccurrence('2026-08-31', 'monthly')).toBe('2026-09-30')
  })
})

describe('challengeChecklist', () => {
  const template = CHALLENGE_TEMPLATES[0]
  const category = encodeChallengeCategory(template.id, 'easy')

  it('reads the JSON array the web writes', () => {
    expect(
      challengeChecklist({ description: '["Pray Fajr","No phone in bed"]', category: null }),
    ).toEqual(['Pray Fajr', 'No phone in bed'])
  })
  it("reads older phone builds' joined text", () => {
    expect(challengeChecklist({ description: 'A · B · C', category: null })).toEqual([
      'A',
      'B',
      'C',
    ])
  })
  it("falls back to the template level's tasks", () => {
    expect(challengeChecklist({ description: null, category })).toEqual(template.levels.easy.tasks)
  })
  it('treats a plain description as a single item', () => {
    expect(challengeChecklist({ description: 'Run every morning', category: null })).toEqual([
      'Run every morning',
    ])
  })
})
