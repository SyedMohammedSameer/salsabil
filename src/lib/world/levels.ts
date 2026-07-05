// World level curve. XP is lifetime coins earned (see 0007_world_xp.sql), so
// the level is a pure record of effort that only ever climbs. The world grows
// visually with the level — see AmbientLife in WorldScene.
//
// Threshold for reaching level n is 25·n·(n−1):
//   L1=0  L2=50  L3=150  L4=300  L5=500  L6=750  L7=1050  L8=1400 …
// Early levels come quick (a day or two of activity), then stretch out.

export function levelThreshold(level: number): number {
  return 25 * level * (level - 1)
}

export function computeLevel(xp: number): number {
  if (xp <= 0) return 1
  // Invert 25·n·(n−1) ≤ xp  →  n ≤ (1 + √(1 + xp/6.25)) / 2
  const n = Math.floor((1 + Math.sqrt(1 + xp / 6.25)) / 2)
  return Math.max(1, n)
}

export interface LevelProgress {
  level: number
  /** XP accumulated within the current level. */
  intoLevel: number
  /** XP span of the current level (current → next threshold). */
  levelSpan: number
  /** 0–100 progress toward the next level. */
  pct: number
  /** Total XP needed to reach the next level. */
  nextLevelXp: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = computeLevel(xp)
  const base = levelThreshold(level)
  const nextLevelXp = levelThreshold(level + 1)
  const levelSpan = nextLevelXp - base
  const intoLevel = Math.max(0, xp - base)
  const pct = levelSpan > 0 ? Math.min(100, (intoLevel / levelSpan) * 100) : 100
  return { level, intoLevel, levelSpan, pct, nextLevelXp }
}
