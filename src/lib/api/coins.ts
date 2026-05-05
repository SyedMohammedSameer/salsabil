import { supabase } from '@/lib/supabase'
import type { CoinAction, CoinTransaction } from '@/lib/database.types'

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
