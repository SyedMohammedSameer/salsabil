// Central reward economy.
//
// ─── Why this was rebuilt ────────────────────────────────────────────────────
//
// The previous curve paid 3 coins per task, 5 per 25-minute focus session, and
// nothing at all for prayers, Quran or adhkar. A maximally engaged day earned
// about 43 coins. A Baobab (500) grown to ancient (another ~150 in watering)
// therefore cost roughly fifteen days of flat-out effort, and the spiritual
// half of the app — the half the product is actually about — was economically
// invisible.
//
// The rebuild inverts that priority:
//
//   * Worship is the backbone. Praying the five daily fard on time is, by
//     itself, enough to make real garden progress. A user who does nothing but
//     pray still earns ~115 coins a day.
//   * Focus and tasks are the accelerator, not the foundation.
//   * Consistency compounds via a once-daily streak bonus rather than a
//     multiplier smeared across every call site, which keeps each individual
//     payout predictable and auditable in the coin ledger.
//
// Projected daily earnings under the new curve:
//
//   Prayers only ..................... ~115
//   Devout but busy day .............. ~190
//   Fully engaged day ................ ~285
//
// Tree prices in src/lib/api/garden.ts are deliberately left alone — they were
// thematically well chosen, and at the new earn rates they already land where
// we want them. A Date Palm (75) is affordable on day one, and a Baobab (500)
// is a ~3-day goal rather than a ~15-day one.
//
// Everything routes through coinsFor() so the whole economy can be retuned,
// reasoned about and tested in one place.

import type { PrayerName, PrayerStatus, TaskPriority, TreeStage } from './database.types'

// ─── Event catalogue ─────────────────────────────────────────────────────────

export type RewardEvent =
  | { kind: 'prayer'; prayer: PrayerName; status: PrayerStatus }
  | { kind: 'prayer_day_complete' }
  | { kind: 'adhkar' }
  | { kind: 'quran'; pages: number }
  | { kind: 'task'; priority: TaskPriority }
  | { kind: 'focus'; minutes: number }
  | { kind: 'study_room'; minutes: number }
  | { kind: 'workout' }
  | { kind: 'challenge_day' }
  | { kind: 'challenge_complete' }
  | { kind: 'streak_day'; streak: number }

export interface Reward {
  coins: number
  /** Tree XP granted alongside the coins. Roughly coins/3. */
  xp: number
}

const NOTHING: Reward = { coins: 0, xp: 0 }

/** Tree XP is pegged to coins so the two currencies never drift apart. */
function withXP(coins: number): Reward {
  return { coins, xp: Math.max(1, Math.round(coins / 3)) }
}

// ─── Tunable constants ───────────────────────────────────────────────────────

/** Fard prayer logged on time. The single most valuable routine action. */
export const PRAYER_ON_TIME_COINS = 15
/** Logged late — still worth recording honestly, so still worth paying for. */
export const PRAYER_LATE_COINS = 7
/** Made up afterwards. */
export const PRAYER_QADA_COINS = 5
/** Tahajjud is voluntary and hard; it pays like a focus session. */
export const TAHAJJUD_COINS = 25
/** Granted once when all five fard prayers for a day are logged as prayed. */
export const PRAYER_DAY_COMPLETE_COINS = 40

/** Per completed adhkar session (morning / evening / after prayer). */
export const ADHKAR_COINS = 12
/** Per page of Quran read. */
export const QURAN_PER_PAGE_COINS = 10
/** Ceiling on a single Quran log, so one huge entry cannot mint a fortune. */
export const QURAN_MAX_COINS_PER_LOG = 120

/** Focus pays per minute, so a 25-minute pomodoro is worth 20 coins. */
export const FOCUS_COINS_PER_MINUTE = 0.8
/** Study rooms pay slightly less per minute than solo focus. */
export const STUDY_ROOM_COINS_PER_MINUTE = 0.6
/** Sessions shorter than this are not worth paying out. */
export const MIN_REWARDABLE_MINUTES = 5

/** Higher-priority work is worth more. Uses the existing task_priority enum. */
export const TASK_COINS_BY_PRIORITY: Record<TaskPriority, number> = {
  low: 3,
  medium: 5,
  high: 8,
  urgent: 12,
}

export const WORKOUT_COINS = 20

export const CHALLENGE_DAY_COINS = 25
export const CHALLENGE_COMPLETE_COINS = 300

/** Daily streak bonus = streak * this, capped at STREAK_BONUS_MAX_DAYS. */
export const STREAK_BONUS_PER_DAY = 5
export const STREAK_BONUS_MAX_DAYS = 30

// ─── The economy ─────────────────────────────────────────────────────────────

export function coinsFor(event: RewardEvent): Reward {
  switch (event.kind) {
    case 'prayer': {
      if (event.status === 'missed') return NOTHING
      if (event.prayer === 'tahajjud') {
        // Tahajjud has no "late" — it is either offered or it is not.
        return event.status === 'prayed' ? withXP(TAHAJJUD_COINS) : NOTHING
      }
      switch (event.status) {
        case 'prayed':
          return withXP(PRAYER_ON_TIME_COINS)
        case 'late':
          return withXP(PRAYER_LATE_COINS)
        case 'qada':
          return withXP(PRAYER_QADA_COINS)
        default:
          return NOTHING
      }
    }

    case 'prayer_day_complete':
      return withXP(PRAYER_DAY_COMPLETE_COINS)

    case 'adhkar':
      return withXP(ADHKAR_COINS)

    case 'quran': {
      if (event.pages <= 0) return NOTHING
      const raw = Math.round(event.pages * QURAN_PER_PAGE_COINS)
      return withXP(Math.min(raw, QURAN_MAX_COINS_PER_LOG))
    }

    case 'task':
      return withXP(TASK_COINS_BY_PRIORITY[event.priority])

    case 'focus': {
      if (event.minutes < MIN_REWARDABLE_MINUTES) return NOTHING
      return withXP(Math.floor(event.minutes * FOCUS_COINS_PER_MINUTE))
    }

    case 'study_room': {
      if (event.minutes < MIN_REWARDABLE_MINUTES) return NOTHING
      return withXP(Math.floor(event.minutes * STUDY_ROOM_COINS_PER_MINUTE))
    }

    case 'workout':
      return withXP(WORKOUT_COINS)

    case 'challenge_day':
      return withXP(CHALLENGE_DAY_COINS)

    case 'challenge_complete':
      return withXP(CHALLENGE_COMPLETE_COINS)

    case 'streak_day': {
      if (event.streak <= 0) return NOTHING
      const days = Math.min(event.streak, STREAK_BONUS_MAX_DAYS)
      return withXP(days * STREAK_BONUS_PER_DAY)
    }

    default: {
      // Exhaustiveness guard — adding a RewardEvent variant without handling
      // it here becomes a compile error rather than a silent zero payout.
      const _never: never = event
      return _never
    }
  }
}

// ─── Watering ────────────────────────────────────────────────────────────────
//
// Watering converts coins into tree XP. A flat 5-coin cost meant a user with a
// good day's earnings could dump them all at once and jump a tree straight to
// ancient, which made the growth stages meaningless. Cost now scales with the
// tree's current stage, so the last stretch to 'ancient' is the expensive one:
//
//   seed -> ancient totals ~754 coins of watering, spread over 30 waterings.
//
// Free XP from everyday actions still flows in on top, so a tree matures
// without anyone ever paying to water it — watering just accelerates it.

export const WATER_XP_GAIN = 10

export const WATER_COST_BY_STAGE: Record<TreeStage, number> = {
  seed: 5,
  sprout: 8,
  sapling: 12,
  young: 20,
  mature: 35,
  ancient: 0, // already fully grown — the UI disables watering
}

export function waterCost(stage: TreeStage): number {
  return WATER_COST_BY_STAGE[stage]
}
