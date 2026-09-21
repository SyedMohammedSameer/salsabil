import { supabase } from '@/lib/supabase'
import type { CoinAction, CoinTransaction } from '@/lib/database.types'
import type { Reward } from '@/lib/rewards'

/**
 * Stable identifiers for rewardable events.
 *
 * Every earn-side payout is keyed so a replay — a task toggled off and back
 * on, a study room page reloaded, a prayer re-tapped — is a no-op in the
 * database rather than free coins. Keys must be derived only from durable
 * facts (row id, date, prayer name), never from anything session-scoped.
 */
export const awardKeys = {
  prayer: (date: string, prayer: string) => `prayer:${date}:${prayer}`,
  prayerDayComplete: (date: string) => `prayer-day:${date}`,
  adhkar: (date: string, time: string) => `adhkar:${date}:${time}`,
  quran: (logId: string) => `quran:${logId}`,
  task: (taskId: string, date: string) => `task:${taskId}:${date}`,
  focus: (sessionId: string) => `focus:${sessionId}`,
  workout: (workoutId: string) => `workout:${workoutId}`,
  studyRoom: (roomId: string, startedAt: string) => `room:${roomId}:${startedAt}`,
  challengeDay: (challengeId: string, day: number) => `challenge-day:${challengeId}:${day}`,
  challengeComplete: (challengeId: string) => `challenge-done:${challengeId}`,
  streakDay: (date: string) => `streak:${date}`,
}

/**
 * Award coins and tree XP exactly once for a given event.
 *
 * Returns the new coin balance, or `null` if this event had already been paid
 * out — callers should treat `null` as "nothing happened" and skip their
 * success toast.
 */
export async function awardCoinsOnce(
  userId: string,
  action: CoinAction,
  reward: Reward,
  idempotencyKey: string,
  description?: string,
): Promise<number | null> {
  if (reward.coins <= 0) return null

  const { data, error } = await supabase.rpc('award_coins_once', {
    p_user_id: userId,
    p_action: action,
    p_amount: reward.coins,
    p_idempotency_key: idempotencyKey,
    p_xp: reward.xp,
    p_description: description ?? null,
  })
  if (error) throw error
  return (data as number | null) ?? null
}

/** Whether a given event has already been paid out, for UI state. */
export async function hasBeenAwarded(userId: string, idempotencyKey: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_been_awarded', {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
  })
  if (error) throw error
  return Boolean(data)
}

export async function awardCoins(
  userId: string,
  action: CoinAction,
  amount: number,
  description?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_action: action,
    p_amount: amount,
    p_description: description ?? null,
  })
  if (error) throw error
  return data as number
}

export async function spendCoins(
  userId: string,
  action: CoinAction,
  amount: number,
  description?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('spend_coins', {
    p_user_id: userId,
    p_action: action,
    p_amount: amount,
    p_description: description ?? null,
  })
  if (error) {
    if (error.message?.includes('insufficient_coins') || error.hint?.includes('Not enough')) {
      throw new Error('Not enough coins')
    }
    throw error
  }
  return data as number
}

export async function getCoinTransactions(userId: string): Promise<CoinTransaction[]> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}
