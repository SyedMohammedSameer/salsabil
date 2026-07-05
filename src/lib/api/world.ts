import { supabase } from '@/lib/supabase'
import type { AvatarVariant, WorldBiome, WorldItem, WorldState } from '@/lib/database.types'
import { CATALOG_BY_KEY, DEFAULT_AVATAR, DEFAULT_BIOME } from '@/data/worldCatalog'

// ─── World state ───────────────────────────────────────────────────────────

export async function fetchWorldState(userId: string): Promise<WorldState | null> {
  const { data, error } = await supabase
    .from('world_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Returns the user's world, creating a default one on first visit. */
export async function ensureWorldState(userId: string): Promise<WorldState> {
  const existing = await fetchWorldState(userId)
  if (existing) return existing

  // Seed XP from lifetime coins earned so activity before the world existed
  // still counts. After this the feed_world_xp trigger keeps it live.
  const seededXp = await lifetimeEarned(userId)

  const { data, error } = await supabase
    .from('world_state')
    .insert({
      user_id: userId,
      biome: DEFAULT_BIOME,
      avatar_variant: DEFAULT_AVATAR,
      xp: seededXp,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Sum of all coins the user has ever earned (positive ledger entries). */
async function lifetimeEarned(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('amount')
    .eq('user_id', userId)
    .gt('amount', 0)
  if (error) throw error
  return (data ?? []).reduce((sum, t) => sum + t.amount, 0)
}

export async function setBiome(userId: string, biome: WorldBiome): Promise<WorldState> {
  const { data, error } = await supabase
    .from('world_state')
    .update({ biome })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setAvatar(userId: string, variant: AvatarVariant): Promise<WorldState> {
  const { data, error } = await supabase
    .from('world_state')
    .update({ avatar_variant: variant })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export type Customization = Partial<Pick<WorldState, 'skin_tone' | 'hair_color' | 'hijab_color'>>

/** Update free identity customization (skin tone, hair/hijab colour). */
export async function setCustomization(userId: string, patch: Customization): Promise<WorldState> {
  const { data, error } = await supabase
    .from('world_state')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export async function fetchWorldItems(userId: string): Promise<WorldItem[]> {
  const { data, error } = await supabase
    .from('world_items')
    .select('*')
    .eq('user_id', userId)
    .order('acquired_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Buy a catalog item. Atomically debits coins and grants the item server-side.
 * Returns the new coin balance. Throws 'Not enough coins' or 'Already owned'.
 */
export async function buyItem(userId: string, itemKey: string): Promise<number> {
  const item = CATALOG_BY_KEY[itemKey]
  if (!item) throw new Error('Unknown item')

  const { data, error } = await supabase.rpc('buy_world_item', {
    p_user_id: userId,
    p_item_key: item.key,
    p_category: item.category,
    p_slot: item.slot ?? null,
    p_cost: item.cost,
    p_name: item.name,
  })
  if (error) {
    if (error.message?.includes('insufficient_coins') || error.hint?.includes('Not enough')) {
      throw new Error('Not enough coins')
    }
    if (error.message?.includes('already_owned') || error.hint?.includes('already owned')) {
      throw new Error('Already owned')
    }
    throw error
  }
  return data as number
}

/** Equip or unequip an owned accessory. One item per slot is enforced server-side. */
export async function setEquipped(userId: string, itemId: string, equip: boolean): Promise<void> {
  const { error } = await supabase.rpc('equip_world_item', {
    p_user_id: userId,
    p_item_id: itemId,
    p_equip: equip,
  })
  if (error) throw error
}
