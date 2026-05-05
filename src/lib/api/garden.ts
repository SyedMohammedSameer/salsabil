import { supabase } from '@/lib/supabase'
import type { GardenTree, TreeSpecies, TreeStage } from '@/lib/database.types'

// ─── Species metadata ─────────────────────────────────────────────────────────

export interface SpeciesInfo {
  name: string
  cost: number
  description: string
  emoji: string
}

export const SPECIES_INFO: Record<TreeSpecies, SpeciesInfo> = {
  olive: {
    name: 'Olive Tree',
    cost: 0,
    emoji: '🫒',
    description: 'Blessed in the Quran. A symbol of light and peace.',
  },
  acacia: {
    name: 'Acacia',
    cost: 50,
    emoji: '🌿',
    description: 'The wood of patience — resilient in any condition.',
  },
  date_palm: {
    name: 'Date Palm',
    cost: 75,
    emoji: '🌴',
    description: 'Nourishment in every season. Most loved by desert people.',
  },
  pomegranate: {
    name: 'Pomegranate',
    cost: 100,
    emoji: '🍎',
    description: 'Among the fruits of Jannah. Rich in blessings.',
  },
  fig: {
    name: 'Fig Tree',
    cost: 100,
    emoji: '🍃',
    description: 'Allah swears by the fig. Ancient and deeply rooted.',
  },
  pine: { name: 'Pine', cost: 100, emoji: '🌲', description: 'Stands tall through every season.' },
  cedar: {
    name: 'Cedar of Lebanon',
    cost: 150,
    emoji: '🌲',
    description: 'Majestic and ancient — mentioned in sacred texts.',
  },
  oak: { name: 'Oak', cost: 150, emoji: '🌳', description: 'Strength and longevity in one trunk.' },
  lote: {
    name: 'Lote Tree (Sidra)',
    cost: 200,
    emoji: '✨',
    description: 'Sidrat al-Muntaha — the utmost boundary of Jannah.',
  },
  sakura: {
    name: 'Cherry Blossom',
    cost: 200,
    emoji: '🌸',
    description: 'Beauty that blooms even in the harshest winters.',
  },
  banyan: {
    name: 'Banyan',
    cost: 300,
    emoji: '🌳',
    description: 'One tree that shelters an entire community.',
  },
  baobab: {
    name: 'Baobab',
    cost: 500,
    emoji: '🌴',
    description: 'Tree of life. Lives thousands of years. A legacy.',
  },
}

// ─── XP → Stage mapping ───────────────────────────────────────────────────────

export function computeStage(xp: number): TreeStage {
  if (xp < 10) return 'seed'
  if (xp < 30) return 'sprout'
  if (xp < 70) return 'sapling'
  if (xp < 150) return 'young'
  if (xp < 300) return 'mature'
  return 'ancient'
}

export const XP_THRESHOLDS: Record<TreeStage, number> = {
  seed: 0,
  sprout: 10,
  sapling: 30,
  young: 70,
  mature: 150,
  ancient: 300,
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function fetchGardenTrees(userId: string): Promise<GardenTree[]> {
  const { data, error } = await supabase
    .from('garden_trees')
    .select('*')
    .eq('user_id', userId)
    .order('planted_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function plantTree(
  userId: string,
  species: TreeSpecies,
  posX?: number,
  posY?: number,
): Promise<GardenTree> {
  const { data, error } = await supabase
    .from('garden_trees')
    .insert({
      user_id: userId,
      species,
      stage: 'seed',
      xp: 0,
      position_x: posX ?? parseFloat((Math.random() * 0.75 + 0.1).toFixed(3)),
      position_y: posY ?? parseFloat((Math.random() * 0.2 + 0.65).toFixed(3)),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addXPToTree(treeId: string, xpToAdd: number): Promise<GardenTree> {
  const { data: tree, error: fetchErr } = await supabase
    .from('garden_trees')
    .select('xp')
    .eq('id', treeId)
    .single()
  if (fetchErr) throw fetchErr

  const newXP = tree.xp + xpToAdd
  const newStage = computeStage(newXP)

  const { data, error } = await supabase
    .from('garden_trees')
    .update({ xp: newXP, stage: newStage, last_watered_at: new Date().toISOString() })
    .eq('id', treeId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Waters the first non-ancient tree (lowest XP that can still grow).
export async function waterNewestActiveTree(
  userId: string,
  xp: number,
): Promise<GardenTree | null> {
  const { data, error } = await supabase
    .from('garden_trees')
    .select('*')
    .eq('user_id', userId)
    .neq('stage', 'ancient')
    .order('planted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return addXPToTree(data.id, xp)
}
