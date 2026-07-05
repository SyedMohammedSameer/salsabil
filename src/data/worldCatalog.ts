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
  /** Furniture only — the isometric floor tile it occupies in the room. */
  tile?: { gx: number; gy: number }
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

  // ── Room furniture (placed on the isometric floor once owned) ──
  {
    key: 'rug',
    name: 'Rug',
    description: 'Ties the room together.',
    category: 'decoration',
    biome: 'desert',
    cost: 30,
    tile: { gx: 2, gy: 3 },
  },
  {
    key: 'plant',
    name: 'Potted Plant',
    description: 'A little green friend.',
    category: 'decoration',
    biome: 'desert',
    cost: 40,
    tile: { gx: 4, gy: 0 },
  },
  {
    key: 'lamp',
    name: 'Floor Lamp',
    description: 'Warm light for late nights.',
    category: 'decoration',
    biome: 'desert',
    cost: 45,
    tile: { gx: 4, gy: 2 },
  },
  {
    key: 'table',
    name: 'Coffee Table',
    description: 'For books and tea.',
    category: 'decoration',
    biome: 'desert',
    cost: 70,
    tile: { gx: 2, gy: 2 },
  },
  {
    key: 'shelf',
    name: 'Bookshelf',
    description: 'Stack your knowledge.',
    category: 'decoration',
    biome: 'desert',
    cost: 90,
    tile: { gx: 0, gy: 2 },
  },
  {
    key: 'sofa',
    name: 'Sofa',
    description: 'Sink in and relax.',
    category: 'decoration',
    biome: 'desert',
    cost: 120,
    tile: { gx: 0, gy: 0 },
  },
  {
    key: 'tv',
    name: 'TV',
    description: 'For a well-earned break.',
    category: 'decoration',
    biome: 'desert',
    cost: 130,
    tile: { gx: 2, gy: 0 },
  },
  {
    key: 'bed',
    name: 'Bed',
    description: 'Rest is worship too.',
    category: 'decoration',
    biome: 'desert',
    cost: 150,
    tile: { gx: 4, gy: 4 },
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
