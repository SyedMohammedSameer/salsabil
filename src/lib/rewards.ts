// Central reward economy. Adjust here to retune the whole game.
//
// Coins are the spendable currency (plant trees, water trees).
// Tree XP is the visible reward — it grows the newest non-ancient tree.

export const REWARDS = {
  task_complete: { coins: 3, xp: 2 },
  workout_logged: { coins: 8, xp: 6 },
  challenge_daily: { coins: 5, xp: 3 },
  challenge_complete_bonus: { coins: 50, xp: 25 },
  // Study room: per 5 minutes of the room's configured duration
  study_room_per_5min: { coins: 1, xp: 1 },
} as const

// Water action — turns coins into XP at a fixed exchange rate.
export const WATER_COST_COINS = 5
export const WATER_XP_GAIN = 10
