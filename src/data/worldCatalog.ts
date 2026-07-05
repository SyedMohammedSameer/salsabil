// The Living World catalog — the single source of truth for everything a user
// can own or inhabit. Costs, slots, and scene placement all live here so the
// economy and layout can be retuned in one file.
//
// v1 ships the DESERT biome, a man/woman avatar, four accessories, and six
// decorations. Later versions add biomes (ocean, forest, …) and drag-to-place.

import type { AvatarSlot, AvatarVariant, WorldBiome, WorldItemCategory } from '@/lib/database.types'

// ─── Biomes ──────────────────────────────────────────────────────────────────

export interface BiomeInfo {
  key: WorldBiome
  name: string
  description: string
  /** Locked biomes are shown as "coming soon" and can't be selected in v1. */
  locked: boolean
}

export const BIOMES: BiomeInfo[] = [
  {
    key: 'desert',
    name: 'Desert Oasis',
    description: 'Golden dunes under a warm dusk sky.',
    locked: false,
  },
  { key: 'ocean', name: 'Coastal Shore', description: 'Coming soon.', locked: true },
  { key: 'forest', name: 'Pine Forest', description: 'Coming soon.', locked: true },
  { key: 'meadow', name: 'Green Meadow', description: 'Coming soon.', locked: true },
  { key: 'night', name: 'Starry Night', description: 'Coming soon.', locked: true },
]

export const DEFAULT_BIOME: WorldBiome = 'desert'

// ─── Avatars ─────────────────────────────────────────────────────────────────

export interface AvatarInfo {
  variant: AvatarVariant
  /** UI label for the body picker — the character itself is named after the user. */
  label: string
}

export const AVATARS: AvatarInfo[] = [
  { variant: 'man', label: 'Male' },
  { variant: 'woman', label: 'Female' },
]

export const DEFAULT_AVATAR: AvatarVariant = 'man'

// ─── Items ───────────────────────────────────────────────────────────────────

export interface CatalogItem {
  key: string
  name: string
  description: string
  category: WorldItemCategory
  cost: number
  /** Accessories only — which body slot they occupy (one item per slot). */
  slot?: AvatarSlot
  /** Decorations only — which biome they belong to. */
  biome?: WorldBiome
  /**
   * Decorations only — where the piece sits in the scene.
   *  x: 0 (far left) … 1 (far right) along the ground line
   *  scale: size multiplier relative to the base sprite
   *  flip: mirror horizontally
   */
  anchor?: { x: number; scale: number; flip?: boolean }
}

export const CATALOG: CatalogItem[] = [
  // ── Outfits (worn on the body — one at a time) ──
  {
    key: 'hoodie_sand',
    name: 'Sand Hoodie',
    description: 'Cosy and casual.',
    category: 'accessory',
    slot: 'outfit',
    cost: 60,
  },
  {
    key: 'hoodie_navy',
    name: 'Navy Hoodie',
    description: 'Everyday comfort.',
    category: 'accessory',
    slot: 'outfit',
    cost: 60,
  },
  {
    key: 'hoodie_maroon',
    name: 'Maroon Hoodie',
    description: 'A warm street look.',
    category: 'accessory',
    slot: 'outfit',
    cost: 60,
  },
  {
    key: 'bomber',
    name: 'Bomber Jacket',
    description: 'Sporty with a striped collar.',
    category: 'accessory',
    slot: 'outfit',
    cost: 95,
  },
  {
    key: 'kurta',
    name: 'Kurta',
    description: 'Classic and elegant.',
    category: 'accessory',
    slot: 'outfit',
    cost: 80,
  },
  {
    key: 'track',
    name: 'Tracksuit',
    description: 'For the gym and the grind.',
    category: 'accessory',
    slot: 'outfit',
    cost: 100,
  },

  // ── Headwear ──
  {
    key: 'kufi',
    name: 'Kufi Cap',
    description: 'A simple white prayer cap.',
    category: 'accessory',
    slot: 'hat',
    cost: 20,
  },
  {
    key: 'beanie',
    name: 'Beanie',
    description: 'Keeps you warm.',
    category: 'accessory',
    slot: 'hat',
    cost: 40,
  },
  {
    key: 'cap',
    name: 'Ball Cap',
    description: 'Casual and cool.',
    category: 'accessory',
    slot: 'hat',
    cost: 45,
  },

  // ── Face ──
  {
    key: 'glasses',
    name: 'Glasses',
    description: 'Smart and studious.',
    category: 'accessory',
    slot: 'face',
    cost: 30,
  },
  {
    key: 'sunglasses',
    name: 'Sunglasses',
    description: 'Shade for the sun.',
    category: 'accessory',
    slot: 'face',
    cost: 50,
  },

  // ── Held ──
  {
    key: 'book',
    name: 'Book',
    description: 'Always be learning.',
    category: 'accessory',
    slot: 'held',
    cost: 25,
  },
  {
    key: 'coffee',
    name: 'Coffee',
    description: 'Fuel for late-night study.',
    category: 'accessory',
    slot: 'held',
    cost: 25,
  },
  {
    key: 'misbaha',
    name: 'Misbaha',
    description: 'Prayer beads for dhikr.',
    category: 'accessory',
    slot: 'held',
    cost: 35,
  },
  {
    key: 'lantern',
    name: 'Lantern',
    description: 'A little light to carry.',
    category: 'accessory',
    slot: 'held',
    cost: 35,
  },

  // ── Companions ──
  {
    key: 'cat',
    name: 'Cat',
    description: 'A calm little friend.',
    category: 'accessory',
    slot: 'companion',
    cost: 90,
  },
  {
    key: 'falcon',
    name: 'Desert Falcon',
    description: 'A loyal companion that rests on your arm.',
    category: 'accessory',
    slot: 'companion',
    cost: 120,
  },

  // ── Desert decorations (appear in the scene once owned) ──
  {
    key: 'cactus',
    name: 'Saguaro Cactus',
    description: 'Standing patient against the sun.',
    category: 'decoration',
    biome: 'desert',
    cost: 20,
    anchor: { x: 0.12, scale: 0.9 },
  },
  {
    key: 'rug',
    name: 'Prayer Rug',
    description: 'A place to turn toward your Lord.',
    category: 'decoration',
    biome: 'desert',
    cost: 30,
    anchor: { x: 0.68, scale: 1 },
  },
  {
    key: 'palm',
    name: 'Date Palm',
    description: 'Shade and sweetness in the heat.',
    category: 'decoration',
    biome: 'desert',
    cost: 40,
    anchor: { x: 0.85, scale: 1.05 },
  },
  {
    key: 'lantern_post',
    name: 'Standing Lantern',
    description: 'Marks the path home after Isha.',
    category: 'decoration',
    biome: 'desert',
    cost: 55,
    anchor: { x: 0.3, scale: 1 },
  },
  {
    key: 'tent',
    name: 'Bedouin Tent',
    description: 'Rest for the traveler.',
    category: 'decoration',
    biome: 'desert',
    cost: 90,
    anchor: { x: 0.9, scale: 1.1, flip: true },
  },
  {
    key: 'fountain',
    name: 'Oasis Fountain',
    description: 'The heart of the oasis — the reward of patience.',
    category: 'decoration',
    biome: 'desert',
    cost: 150,
    anchor: { x: 0.5, scale: 1.15 },
  },
]

// ─── Lookups ─────────────────────────────────────────────────────────────────

export const CATALOG_BY_KEY: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map((item) => [item.key, item]),
)

export function itemsForBiome(biome: WorldBiome): CatalogItem[] {
  return CATALOG.filter((i) => i.category === 'decoration' && i.biome === biome)
}

export const ACCESSORIES: CatalogItem[] = CATALOG.filter((i) => i.category === 'accessory')

export const SLOT_LABELS: Record<AvatarSlot, string> = {
  outfit: 'Outfit',
  hat: 'Head',
  face: 'Face',
  held: 'Held',
  companion: 'Companion',
  outer: 'Outerwear',
}
