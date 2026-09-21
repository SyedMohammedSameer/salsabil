import { describe, it, expect } from 'vitest'
import {
  coinsFor,
  waterCost,
  WATER_XP_GAIN,
  PRAYER_ON_TIME_COINS,
  PRAYER_DAY_COMPLETE_COINS,
  ADHKAR_COINS,
  QURAN_MAX_COINS_PER_LOG,
  MIN_REWARDABLE_MINUTES,
  STREAK_BONUS_PER_DAY,
  STREAK_BONUS_MAX_DAYS,
} from '@/lib/rewards'
import { XP_THRESHOLDS, SPECIES_INFO } from '@/lib/api/garden'
import type { PrayerName } from '@/lib/database.types'

describe('prayer rewards', () => {
  it('pays the most for a fard prayer offered on time', () => {
    expect(coinsFor({ kind: 'prayer', prayer: 'fajr', status: 'prayed' }).coins).toBe(
      PRAYER_ON_TIME_COINS,
    )
  })

  it('pays progressively less for late and qada', () => {
    const onTime = coinsFor({ kind: 'prayer', prayer: 'dhuhr', status: 'prayed' }).coins
    const late = coinsFor({ kind: 'prayer', prayer: 'dhuhr', status: 'late' }).coins
    const qada = coinsFor({ kind: 'prayer', prayer: 'dhuhr', status: 'qada' }).coins

    expect(onTime).toBeGreaterThan(late)
    expect(late).toBeGreaterThan(qada)
    expect(qada).toBeGreaterThan(0)
  })

  it('pays nothing for a missed prayer', () => {
    expect(coinsFor({ kind: 'prayer', prayer: 'asr', status: 'missed' })).toEqual({
      coins: 0,
      xp: 0,
    })
  })

  it('rewards tahajjud above any fard prayer, since it is voluntary', () => {
    const tahajjud = coinsFor({ kind: 'prayer', prayer: 'tahajjud', status: 'prayed' }).coins
    expect(tahajjud).toBeGreaterThan(PRAYER_ON_TIME_COINS)
  })

  it('pays nothing for tahajjud logged as anything but prayed', () => {
    expect(coinsFor({ kind: 'prayer', prayer: 'tahajjud', status: 'late' }).coins).toBe(0)
    expect(coinsFor({ kind: 'prayer', prayer: 'tahajjud', status: 'qada' }).coins).toBe(0)
  })
})

describe('daily earning curve', () => {
  const FARD: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

  const prayersOnly = () =>
    FARD.reduce(
      (sum, prayer) => sum + coinsFor({ kind: 'prayer', prayer, status: 'prayed' }).coins,
      0,
    ) + coinsFor({ kind: 'prayer_day_complete' }).coins

  it('lets a user who only prays still make real progress', () => {
    // The regression this guards: worship used to earn literally nothing.
    expect(prayersOnly()).toBe(5 * PRAYER_ON_TIME_COINS + PRAYER_DAY_COMPLETE_COINS)
    expect(prayersOnly()).toBeGreaterThanOrEqual(100)
  })

  it('puts the cheapest purchasable tree within reach of a single devout day', () => {
    const acacia = SPECIES_INFO.acacia.cost
    expect(prayersOnly()).toBeGreaterThan(acacia)
  })

  it('puts the most expensive tree within about three days, not fifteen', () => {
    const devoutDay =
      prayersOnly() +
      coinsFor({ kind: 'adhkar' }).coins * 2 +
      coinsFor({ kind: 'quran', pages: 1 }).coins +
      coinsFor({ kind: 'focus', minutes: 25 }).coins * 2 +
      coinsFor({ kind: 'task', priority: 'medium' }).coins * 3

    const daysToBaobab = SPECIES_INFO.baobab.cost / devoutDay
    expect(daysToBaobab).toBeLessThan(4)
    expect(daysToBaobab).toBeGreaterThan(1.5)
  })
})

describe('focus rewards', () => {
  it('pays a standard pomodoro more than the old flat five coins', () => {
    expect(coinsFor({ kind: 'focus', minutes: 25 }).coins).toBeGreaterThan(5)
  })

  it('scales with session length', () => {
    const short = coinsFor({ kind: 'focus', minutes: 25 }).coins
    const long = coinsFor({ kind: 'focus', minutes: 50 }).coins
    expect(long).toBeGreaterThan(short)
  })

  it('pays nothing for a session abandoned almost immediately', () => {
    // Guards the start-then-skip exploit: a skipped session now reports the
    // seconds actually served, which must not be rewardable.
    expect(coinsFor({ kind: 'focus', minutes: 0 })).toEqual({ coins: 0, xp: 0 })
    expect(coinsFor({ kind: 'focus', minutes: MIN_REWARDABLE_MINUTES - 1 }).coins).toBe(0)
  })

  it('pays a solo session more than the same time in a study room', () => {
    const solo = coinsFor({ kind: 'focus', minutes: 60 }).coins
    const room = coinsFor({ kind: 'study_room', minutes: 60 }).coins
    expect(solo).toBeGreaterThan(room)
  })

  it('pays a study room joined at the last moment nothing', () => {
    expect(coinsFor({ kind: 'study_room', minutes: 0 }).coins).toBe(0)
  })
})

describe('task rewards', () => {
  it('pays more for higher priority work', () => {
    const low = coinsFor({ kind: 'task', priority: 'low' }).coins
    const medium = coinsFor({ kind: 'task', priority: 'medium' }).coins
    const high = coinsFor({ kind: 'task', priority: 'high' }).coins
    const urgent = coinsFor({ kind: 'task', priority: 'urgent' }).coins

    expect(low).toBeLessThan(medium)
    expect(medium).toBeLessThan(high)
    expect(high).toBeLessThan(urgent)
  })
})

describe('quran rewards', () => {
  it('scales with pages read', () => {
    expect(coinsFor({ kind: 'quran', pages: 3 }).coins).toBeGreaterThan(
      coinsFor({ kind: 'quran', pages: 1 }).coins,
    )
  })

  it('handles fractional pages, which the schema allows', () => {
    expect(coinsFor({ kind: 'quran', pages: 0.5 }).coins).toBeGreaterThan(0)
  })

  it('caps a single log so one huge entry cannot mint a fortune', () => {
    expect(coinsFor({ kind: 'quran', pages: 10_000 }).coins).toBe(QURAN_MAX_COINS_PER_LOG)
  })

  it('pays nothing for a zero or negative page count', () => {
    expect(coinsFor({ kind: 'quran', pages: 0 }).coins).toBe(0)
    expect(coinsFor({ kind: 'quran', pages: -5 }).coins).toBe(0)
  })
})

describe('adhkar rewards', () => {
  it('pays a fixed amount per session', () => {
    expect(coinsFor({ kind: 'adhkar' }).coins).toBe(ADHKAR_COINS)
  })
})

describe('streak bonus', () => {
  it('grows with the streak', () => {
    expect(coinsFor({ kind: 'streak_day', streak: 7 }).coins).toBeGreaterThan(
      coinsFor({ kind: 'streak_day', streak: 2 }).coins,
    )
  })

  it('caps so a long streak cannot run away with the economy', () => {
    const atCap = coinsFor({ kind: 'streak_day', streak: STREAK_BONUS_MAX_DAYS }).coins
    const wayPast = coinsFor({ kind: 'streak_day', streak: 5_000 }).coins
    expect(wayPast).toBe(atCap)
    expect(atCap).toBe(STREAK_BONUS_MAX_DAYS * STREAK_BONUS_PER_DAY)
  })

  it('pays nothing on day zero', () => {
    expect(coinsFor({ kind: 'streak_day', streak: 0 }).coins).toBe(0)
  })
})

describe('tree XP', () => {
  it('accompanies every positive coin award, so the garden always moves', () => {
    const events = [
      coinsFor({ kind: 'prayer', prayer: 'fajr', status: 'prayed' }),
      coinsFor({ kind: 'adhkar' }),
      coinsFor({ kind: 'quran', pages: 1 }),
      coinsFor({ kind: 'task', priority: 'low' }),
      coinsFor({ kind: 'focus', minutes: 25 }),
      coinsFor({ kind: 'workout' }),
    ]
    for (const reward of events) {
      expect(reward.coins).toBeGreaterThan(0)
      expect(reward.xp).toBeGreaterThan(0)
    }
  })

  it('never grants XP for a zero-coin event', () => {
    expect(coinsFor({ kind: 'focus', minutes: 1 }).xp).toBe(0)
    expect(coinsFor({ kind: 'prayer', prayer: 'isha', status: 'missed' }).xp).toBe(0)
  })
})

describe('watering', () => {
  it('gets more expensive as the tree matures', () => {
    expect(waterCost('seed')).toBeLessThan(waterCost('sprout'))
    expect(waterCost('sprout')).toBeLessThan(waterCost('sapling'))
    expect(waterCost('sapling')).toBeLessThan(waterCost('young'))
    expect(waterCost('young')).toBeLessThan(waterCost('mature'))
  })

  it('costs enough overall that a single good day cannot buy an ancient tree', () => {
    // Walk a tree from seed to ancient, paying the cost of whatever stage it
    // is in at each watering.
    const stageFor = (xp: number) => {
      if (xp < XP_THRESHOLDS.sprout) return 'seed' as const
      if (xp < XP_THRESHOLDS.sapling) return 'sprout' as const
      if (xp < XP_THRESHOLDS.young) return 'sapling' as const
      if (xp < XP_THRESHOLDS.mature) return 'young' as const
      return 'mature' as const
    }

    let xp = 0
    let spent = 0
    let waterings = 0
    while (xp < XP_THRESHOLDS.ancient) {
      spent += waterCost(stageFor(xp))
      xp += WATER_XP_GAIN
      waterings++
    }

    expect(waterings).toBe(XP_THRESHOLDS.ancient / WATER_XP_GAIN)
    // Comfortably more than a single strong day's earnings (~285).
    expect(spent).toBeGreaterThan(600)
  })

  it('is free for an ancient tree, which the UI disables anyway', () => {
    expect(waterCost('ancient')).toBe(0)
  })
})
