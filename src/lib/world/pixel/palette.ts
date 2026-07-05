// Colour palettes for the pixel character. Kept data-only so both the browser
// canvas renderer and the build-time preview harness share exactly one source.

export type RGBA = [number, number, number, number]

export interface Tone {
  base: RGBA
  shade: RGBA
}
export interface HairTone extends Tone {
  hi: RGBA
}

export const OUTLINE: RGBA = [46, 32, 26, 255]
export const OUTLINE_SOFT: RGBA = [92, 64, 52, 255]
export const EYE: RGBA = [52, 40, 34, 255]
export const EYE_W: RGBA = [252, 252, 250, 255]
export const MOUTH: RGBA = [178, 96, 88, 255]
export const CHEEK: RGBA = [240, 150, 140, 120]
export const WHITE: RGBA = [255, 255, 255, 255]
export const PIN: RGBA = [226, 182, 72, 255]

// ─── Skin tones ──────────────────────────────────────────────────────────────
export const SKIN_TONES: Record<string, Tone> = {
  light: { base: [247, 213, 180, 255], shade: [224, 184, 146, 255] },
  fair: { base: [245, 201, 156, 255], shade: [220, 168, 124, 255] },
  tan: { base: [230, 180, 140, 255], shade: [201, 148, 106, 255] },
  medium: { base: [207, 157, 111, 255], shade: [176, 127, 82, 255] },
  brown: { base: [169, 116, 74, 255], shade: [138, 92, 56, 255] },
  deep: { base: [125, 82, 54, 255], shade: [95, 61, 40, 255] },
}
export const SKIN_ORDER = ['light', 'fair', 'tan', 'medium', 'brown', 'deep'] as const

// ─── Hair colours (man) ──────────────────────────────────────────────────────
export const HAIR_COLORS: Record<string, HairTone> = {
  black: { base: [58, 45, 40, 255], shade: [38, 28, 24, 255], hi: [92, 74, 66, 255] },
  brown: { base: [74, 50, 36, 255], shade: [52, 34, 24, 255], hi: [112, 80, 58, 255] },
  chestnut: { base: [102, 62, 38, 255], shade: [74, 44, 26, 255], hi: [140, 92, 58, 255] },
  auburn: { base: [124, 62, 42, 255], shade: [92, 44, 30, 255], hi: [162, 92, 62, 255] },
  sandy: { base: [170, 122, 72, 255], shade: [134, 92, 52, 255], hi: [204, 160, 104, 255] },
  ash: { base: [110, 100, 96, 255], shade: [78, 70, 66, 255], hi: [148, 138, 132, 255] },
}
export const HAIR_ORDER = ['black', 'brown', 'chestnut', 'auburn', 'sandy', 'ash'] as const

// ─── Hijab colours (woman) ───────────────────────────────────────────────────
export const HIJAB_COLORS: Record<string, HairTone> = {
  coral: { base: [242, 170, 150, 255], shade: [218, 140, 120, 255], hi: [252, 198, 182, 255] },
  rose: { base: [224, 146, 168, 255], shade: [196, 116, 140, 255], hi: [244, 178, 196, 255] },
  plum: { base: [150, 110, 158, 255], shade: [118, 82, 128, 255], hi: [186, 148, 194, 255] },
  teal: { base: [110, 176, 170, 255], shade: [78, 142, 138, 255], hi: [150, 206, 200, 255] },
  sky: { base: [130, 168, 214, 255], shade: [98, 134, 184, 255], hi: [170, 202, 238, 255] },
  sage: { base: [150, 176, 128, 255], shade: [116, 142, 98, 255], hi: [186, 208, 164, 255] },
  mustard: { base: [222, 176, 92, 255], shade: [188, 142, 62, 255], hi: [244, 204, 132, 255] },
  cream: { base: [238, 224, 198, 255], shade: [210, 192, 160, 255], hi: [250, 240, 222, 255] },
  charcoal: { base: [96, 100, 110, 255], shade: [70, 74, 84, 255], hi: [134, 138, 148, 255] },
}
export const HIJAB_ORDER = [
  'coral',
  'rose',
  'plum',
  'teal',
  'sky',
  'sage',
  'mustard',
  'cream',
  'charcoal',
] as const
