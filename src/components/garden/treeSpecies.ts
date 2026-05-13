import type { TreeSpecies } from '@/lib/database.types'

export type TreeFamily = 'broadleaf' | 'conifer' | 'palm' | 'umbrella' | 'baobab'
export type AccentType = 'berries' | 'fruit' | 'dates' | 'blossom' | 'glow' | null

export interface TreeSpec {
  family: TreeFamily
  // Trunk
  trunkBase: string
  trunkShadow: string
  // Foliage
  foliage: string
  foliageHighlight: string
  foliageShadow: string
  // Accent (fruit, blossom, etc.)
  accent: AccentType
  accentColor?: string
  // Optional ambient glow color (mostly for lote)
  glow?: string
}

// Carefully picked palettes — earthy bases, lush mid-tones, soft accents.
// Keep each species visually distinct at a glance.
export const TREE_SPECS: Record<TreeSpecies, TreeSpec> = {
  olive: {
    family: 'broadleaf',
    trunkBase: '#6a4a2c',
    trunkShadow: '#4a3320',
    foliage: '#8aa55c',
    foliageHighlight: '#b3c878',
    foliageShadow: '#5e7a3e',
    accent: 'berries',
    accentColor: '#2c2118',
  },
  acacia: {
    family: 'umbrella',
    trunkBase: '#8c6a3c',
    trunkShadow: '#5e4524',
    foliage: '#c9a648',
    foliageHighlight: '#e6c46b',
    foliageShadow: '#9a7b2a',
    accent: null,
  },
  date_palm: {
    family: 'palm',
    trunkBase: '#9b7a4a',
    trunkShadow: '#6a4f2a',
    foliage: '#3a8a5a',
    foliageHighlight: '#5fb37c',
    foliageShadow: '#246340',
    accent: 'dates',
    accentColor: '#f1c14a',
  },
  pomegranate: {
    family: 'broadleaf',
    trunkBase: '#6a3f24',
    trunkShadow: '#4a2a18',
    foliage: '#4d8a44',
    foliageHighlight: '#73b06b',
    foliageShadow: '#33602e',
    accent: 'fruit',
    accentColor: '#c83c3c',
  },
  fig: {
    family: 'broadleaf',
    trunkBase: '#4a3220',
    trunkShadow: '#2e1f14',
    foliage: '#3f7a3a',
    foliageHighlight: '#5fa055',
    foliageShadow: '#2a5526',
    accent: null,
  },
  pine: {
    family: 'conifer',
    trunkBase: '#6a4528',
    trunkShadow: '#46301c',
    foliage: '#2a5b35',
    foliageHighlight: '#3f7d4b',
    foliageShadow: '#1c3e24',
    accent: null,
  },
  cedar: {
    family: 'conifer',
    trunkBase: '#6a5040',
    trunkShadow: '#473428',
    foliage: '#4a7e70',
    foliageHighlight: '#6da195',
    foliageShadow: '#33574d',
    accent: null,
  },
  oak: {
    family: 'broadleaf',
    trunkBase: '#5c3e26',
    trunkShadow: '#3d2918',
    foliage: '#5a8a3e',
    foliageHighlight: '#7eaf5d',
    foliageShadow: '#3e6228',
    accent: null,
  },
  lote: {
    family: 'broadleaf',
    trunkBase: '#7a6234',
    trunkShadow: '#503f1f',
    foliage: '#d0b04a',
    foliageHighlight: '#f0d878',
    foliageShadow: '#9d8330',
    accent: 'glow',
    accentColor: '#ffe97a',
    glow: 'rgba(255, 233, 122, 0.35)',
  },
  sakura: {
    family: 'broadleaf',
    trunkBase: '#4a3a2a',
    trunkShadow: '#2e2218',
    foliage: '#f4b8d4',
    foliageHighlight: '#ffd4e3',
    foliageShadow: '#d690b0',
    accent: 'blossom',
    accentColor: '#ffffff',
  },
  banyan: {
    family: 'broadleaf',
    trunkBase: '#7a553a',
    trunkShadow: '#553722',
    foliage: '#3e7034',
    foliageHighlight: '#5e9450',
    foliageShadow: '#284c22',
    accent: null,
  },
  baobab: {
    family: 'baobab',
    trunkBase: '#a78962',
    trunkShadow: '#7a6244',
    foliage: '#5a7038',
    foliageHighlight: '#7e9554',
    foliageShadow: '#3e5024',
    accent: null,
  },
}
