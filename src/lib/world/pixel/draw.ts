// Procedural pixel-art character renderer. Pure array math — no DOM, no node
// APIs — so it runs identically on a browser <canvas> and in the build-time
// preview harness. Fill an RGBA buffer of CW*CH*4 with drawCharacter().

import type { AvatarVariant } from '@/lib/database.types'
import {
  CHEEK,
  EYE,
  EYE_W,
  HAIR_COLORS,
  HIJAB_COLORS,
  MOUTH,
  OUTLINE,
  OUTLINE_SOFT,
  PIN,
  SKIN_TONES,
  WHITE,
  type HairTone,
  type RGBA,
  type Tone,
} from './palette'

export const CW = 48
export const CH = 64
const CX = 24

export interface CharacterLook {
  variant: AvatarVariant
  skin: string
  hair: string // man
  hijab: string // woman
  outfit: string
  hat?: string
  face?: string
  held?: string
  companion?: string
}

export interface FrameState {
  /** eyes closed this frame */
  blink?: boolean
  /** upper-body rise for the breathe cycle: 0 or -1 */
  breathe?: number
  /** walk cycle phase 0..1, or null when standing still */
  walk?: number | null
}

// ─── Outfits (A-line silhouette, styled top) ─────────────────────────────────
interface OutfitDef {
  base: RGBA
  shade: RGBA
  style: 'plain' | 'hood' | 'jacket' | 'kurta' | 'track'
  accent?: RGBA
}
export const OUTFITS: Record<string, OutfitDef> = {
  thobe: { base: [249, 247, 242, 255], shade: [216, 210, 197, 255], style: 'plain' },
  abaya: { base: [104, 158, 140, 255], shade: [78, 128, 112, 255], style: 'plain' },
  hoodie_sand: {
    base: [206, 178, 132, 255],
    shade: [176, 148, 104, 255],
    style: 'hood',
    accent: [150, 124, 84, 255],
  },
  hoodie_navy: {
    base: [78, 96, 128, 255],
    shade: [56, 72, 100, 255],
    style: 'hood',
    accent: [40, 54, 80, 255],
  },
  hoodie_maroon: {
    base: [150, 78, 84, 255],
    shade: [120, 58, 64, 255],
    style: 'hood',
    accent: [96, 44, 50, 255],
  },
  bomber: {
    base: [92, 108, 96, 255],
    shade: [68, 84, 72, 255],
    style: 'jacket',
    accent: [214, 196, 150, 255],
  },
  kurta: {
    base: [188, 158, 206, 255],
    shade: [156, 126, 176, 255],
    style: 'kurta',
    accent: [232, 214, 244, 255],
  },
  track: {
    base: [58, 66, 78, 255],
    shade: [40, 48, 60, 255],
    style: 'track',
    accent: [232, 120, 92, 255],
  },
}
export const OUTFIT_KEYS = Object.keys(OUTFITS)

// ─── pixel ops ───────────────────────────────────────────────────────────────
const idx = (x: number, y: number) => (y * CW + x) * 4
function set(b: Uint8ClampedArray, x: number, y: number, c: RGBA) {
  if (x < 0 || y < 0 || x >= CW || y >= CH) return
  const i = idx(x, y)
  b[i] = c[0]
  b[i + 1] = c[1]
  b[i + 2] = c[2]
  b[i + 3] = c[3]
}
function getA(b: Uint8ClampedArray, x: number, y: number) {
  if (x < 0 || y < 0 || x >= CW || y >= CH) return 0
  return b[idx(x, y) + 3]
}
function isCol(b: Uint8ClampedArray, x: number, y: number, c: RGBA) {
  const i = idx(x, y)
  return b[i] === c[0] && b[i + 1] === c[1] && b[i + 2] === c[2]
}
function rect(b: Uint8ClampedArray, x: number, y: number, w: number, h: number, c: RGBA) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(b, x + i, y + j, c)
}
function ell(b: Uint8ClampedArray, cx: number, cy: number, rx: number, ry: number, c: RGBA) {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx,
        dy = (y - cy) / ry
      if (dx * dx + dy * dy <= 1) set(b, x, y, c)
    }
}
function outline(b: Uint8ClampedArray, col: RGBA) {
  const snap = b.slice()
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= CW || y >= CH ? 0 : snap[idx(x, y) + 3]
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      if (alpha(x, y) === 0) {
        if (alpha(x + 1, y) || alpha(x - 1, y) || alpha(x, y + 1) || alpha(x, y - 1))
          set(b, x, y, col)
      }
    }
}

const headTop = (x: number) => {
  const t = (x - CX) / 11
  if (Math.abs(t) > 1) return 99
  return Math.round(14 - 11 * Math.sqrt(1 - t * t))
}
const robeHalf = (y: number) => {
  if (y < 26) return -1
  if (y === 26) return 7
  if (y === 27) return 9
  const t = (y - 28) / (61 - 28)
  return Math.round(10 + t * 6)
}

// ─── main ────────────────────────────────────────────────────────────────────
export function drawCharacter(b: Uint8ClampedArray, look: CharacterLook, frame: FrameState = {}) {
  b.fill(0)
  const woman = look.variant === 'woman'
  const skin: Tone = SKIN_TONES[look.skin] ?? SKIN_TONES.tan
  const outfit = OUTFITS[look.outfit] ?? (woman ? OUTFITS.abaya : OUTFITS.thobe)
  const dy = frame.breathe ?? 0 // upper-body rise
  const walk = frame.walk ?? null

  // feet (walk = alternate lift)
  const lift = walk == null ? [0, 0] : Math.sin(walk * Math.PI * 2) >= 0 ? [-2, 0] : [0, -2]
  rect(b, CX - 8, 59 + lift[0], 7, 4, [96, 66, 46, 255])
  rect(b, CX + 1, 59 + lift[1], 7, 4, [70, 48, 34, 255])

  // body
  drawBody(b, outfit)

  // hands
  rect(b, CX - 11, 44, 3, 4, skin.base)
  rect(b, CX + 9, 44, 3, 4, skin.shade)

  // neck
  rect(b, CX - 3, 22 + dy, 6, 5, skin.base)
  for (let y = 22 + dy; y < 27 + dy; y++) {
    set(b, CX + 2, y, skin.shade)
    set(b, CX + 1, y, skin.shade)
  }

  // head
  ell(b, CX, 14 + dy, 11, 11, skin.base)
  for (let y = 5 + dy; y < 25 + dy; y++)
    for (let x = CX + 3; x < CX + 12; x++)
      if (getA(b, x, y) > 0 && isCol(b, x, y, skin.base)) set(b, x, y, skin.shade)

  if (woman) drawHijab(b, HIJAB_COLORS[look.hijab] ?? HIJAB_COLORS.coral, skin, dy)
  else drawHair(b, HAIR_COLORS[look.hair] ?? HAIR_COLORS.brown, dy)

  if (look.hat) drawHat(b, look.hat, dy)
  drawFace(b, skin, dy, !!frame.blink)
  if (look.face) drawGlasses(b, look.face, dy)
  if (look.held) drawHeld(b, look.held)
  if (look.companion) drawCompanion(b, look.companion)

  outline(b, OUTLINE)
}

function drawBody(b: Uint8ClampedArray, o: OutfitDef) {
  for (let y = 26; y <= 61; y++) {
    const h = robeHalf(y)
    if (h < 0) continue
    for (let x = CX - h; x <= CX + h; x++) set(b, x, y, x > CX + 2 ? o.shade : o.base)
  }
  for (let y = 29; y < 58; y++) set(b, CX, y, o.shade) // placket
  const ac = o.accent ?? o.shade
  if (o.style === 'hood') {
    // hood behind neck + kangaroo pocket + drawstrings
    for (let y = 24; y <= 30; y++) {
      const w = 9 - Math.abs(28 - y)
      rect(b, CX - w, y, 2, 1, ac)
      rect(b, CX + w - 1, y, 2, 1, ac)
    }
    rect(b, CX - 4, 26, 8, 3, o.base)
    rect(b, CX - 4, 26, 8, 1, ac) // collar
    set(b, CX - 2, 29, ac)
    set(b, CX + 2, 29, ac) // drawstrings
    rect(b, CX - 6, 42, 12, 6, o.shade)
    rect(b, CX - 6, 42, 12, 1, ac) // pocket
  } else if (o.style === 'jacket') {
    rect(b, CX - 10, 27, 3, 6, ac)
    rect(b, CX + 8, 27, 3, 6, ac) // striped sleeves top
    rect(b, CX - 6, 26, 12, 2, ac) // collar band
    rect(b, CX - 10, 55, 21, 2, ac) // hem band
  } else if (o.style === 'kurta') {
    rect(b, CX - 3, 26, 6, 10, ac)
    rect(b, CX - 1, 26, 2, 20, o.shade) // placket
    for (let y = 28; y < 44; y += 4) set(b, CX, y, PIN) // buttons
  } else if (o.style === 'track') {
    for (let y = 27; y <= 58; y++) {
      set(b, CX - robeHalf(y) + 1, y, ac)
      set(b, CX + robeHalf(y) - 1, y, ac)
    } // side stripes
    rect(b, CX - 5, 26, 10, 2, ac) // zip collar
  }
}

function drawHair(b: Uint8ClampedArray, h: HairTone, dy: number) {
  for (let x = CX - 11; x <= CX + 11; x++) {
    const t = (x - CX) / 11
    if (Math.abs(t) > 1) continue
    const top = headTop(x) + dy
    let hl = 11 + dy + (t < 0 ? 1 : 0) - (t > 0.3 ? 1 : 0)
    if (Math.abs(t) > 0.72) hl = 13 + dy
    if (Math.abs(t) > 0.92) hl = 10 + dy
    for (let y = top; y <= hl; y++) set(b, x, y, y === top ? h.hi : h.base)
  }
  for (let x = CX - 7; x <= CX - 2; x++) set(b, x, 5 + dy, h.hi)
  for (let x = CX + 3; x <= CX + 9; x++) set(b, x, headTop(x) + 2 + dy, h.shade)
}

function drawHijab(b: Uint8ClampedArray, h: HairTone, skin: Tone, dy: number) {
  ell(b, CX, 13 + dy, 12, 12, h.base)
  const drape = [8, 8, 9, 9, 10, 10, 10]
  for (let y = 23; y <= 29; y++) {
    const w = drape[y - 23]
    for (let x = CX - w; x <= CX + w; x++) set(b, x, y + dy, h.base)
  }
  for (let y = 3 + dy; y <= 29 + dy; y++)
    for (let x = CX + 2; x < CX + 14; x++)
      if (getA(b, x, y) > 0 && isCol(b, x, y, h.base)) set(b, x, y, h.shade)
  rect(b, CX - 9, 3 + dy, 13, 2, h.hi)
  for (let y = 9 + dy; y <= 22 + dy; y++)
    for (let x = CX - 7; x <= CX + 7; x++) {
      const dx = (x - CX) / 6.4,
        dyy = (y - 14 - dy) / 8.2
      if (dx * dx + dyy * dyy <= 1) set(b, x, y, x > CX + 2 ? skin.shade : skin.base)
    }
  set(b, CX - 6, 21 + dy, PIN)
}

function drawFace(b: Uint8ClampedArray, skin: Tone, dy: number, blink: boolean) {
  set(b, CX - 5, 18 + dy, CHEEK)
  set(b, CX - 4, 18 + dy, CHEEK)
  set(b, CX + 4, 18 + dy, CHEEK)
  set(b, CX + 5, 18 + dy, CHEEK)
  if (blink) {
    rect(b, CX - 6, 15 + dy, 3, 1, EYE)
    rect(b, CX + 3, 15 + dy, 3, 1, EYE)
  } else {
    rect(b, CX - 6, 13 + dy, 3, 4, EYE_W)
    rect(b, CX + 3, 13 + dy, 3, 4, EYE_W)
    rect(b, CX - 5, 14 + dy, 2, 3, EYE)
    rect(b, CX + 4, 14 + dy, 2, 3, EYE)
    set(b, CX - 5, 14 + dy, WHITE)
    set(b, CX + 4, 14 + dy, WHITE)
  }
  set(b, CX - 6, 11 + dy, OUTLINE_SOFT)
  set(b, CX - 5, 11 + dy, OUTLINE_SOFT)
  set(b, CX - 4, 11 + dy, OUTLINE_SOFT)
  set(b, CX + 3, 11 + dy, OUTLINE_SOFT)
  set(b, CX + 4, 11 + dy, OUTLINE_SOFT)
  set(b, CX + 5, 11 + dy, OUTLINE_SOFT)
  set(b, CX, 18 + dy, skin.shade)
  rect(b, CX - 2, 20 + dy, 5, 1, MOUTH)
  set(b, CX - 2, 20 + dy, skin.base)
  set(b, CX + 2, 20 + dy, skin.base)
}

// ─── accessories ─────────────────────────────────────────────────────────────
function drawHat(b: Uint8ClampedArray, key: string, dy: number) {
  if (key === 'kufi') {
    for (let x = CX - 9; x <= CX + 9; x++) {
      const t = (x - CX) / 9
      const top = Math.round(3 - 3 * (1 - t * t)) + dy
      for (let y = top; y <= 5 + dy; y++) set(b, x, y, [251, 251, 247, 255])
    }
    for (let x = CX - 9; x <= CX + 9; x += 2) set(b, x, 5 + dy, [216, 210, 196, 255])
  } else if (key === 'beanie') {
    for (let x = CX - 11; x <= CX + 11; x++) {
      const t = (x - CX) / 11
      if (Math.abs(t) > 1) continue
      const top = headTop(x) + dy
      for (let y = top; y <= 9 + dy; y++) set(b, x, y, [92, 120, 138, 255])
    }
    rect(b, CX - 11, 8 + dy, 23, 3, [70, 96, 112, 255])
  } else if (key === 'cap') {
    for (let x = CX - 11; x <= CX + 11; x++) {
      const t = (x - CX) / 11
      if (Math.abs(t) > 1) continue
      const top = headTop(x) + dy
      for (let y = top; y <= 8 + dy; y++) set(b, x, y, [196, 84, 76, 255])
    }
    rect(b, CX + 6, 10 + dy, 8, 2, [168, 66, 60, 255]) // brim
    set(b, CX, 6 + dy, [232, 214, 200, 255])
  }
}
function drawGlasses(b: Uint8ClampedArray, key: string, dy: number) {
  const c: RGBA = key === 'sunglasses' ? [40, 36, 44, 255] : [70, 60, 54, 255]
  rect(b, CX - 7, 13 + dy, 5, 4, c)
  rect(b, CX + 2, 13 + dy, 5, 4, c)
  set(b, CX - 2, 14 + dy, c)
  set(b, CX + 1, 14 + dy, c) // bridge
  if (key === 'sunglasses') {
    rect(b, CX - 6, 14 + dy, 3, 2, [80, 74, 92, 255])
    rect(b, CX + 3, 14 + dy, 3, 2, [80, 74, 92, 255])
  } else {
    rect(b, CX - 6, 14 + dy, 3, 2, [190, 214, 224, 100])
    rect(b, CX + 3, 14 + dy, 3, 2, [190, 214, 224, 100])
  }
}
function drawHeld(b: Uint8ClampedArray, key: string) {
  const hx = CX + 10,
    hy = 45
  if (key === 'book') {
    rect(b, hx - 2, hy - 3, 6, 6, [176, 96, 84, 255])
    rect(b, hx - 2, hy - 3, 1, 6, [120, 60, 52, 255])
    rect(b, hx, hy - 2, 3, 1, [240, 232, 214, 255])
  } else if (key === 'coffee') {
    rect(b, hx - 1, hy - 3, 4, 6, [238, 232, 220, 255])
    rect(b, hx - 1, hy - 1, 4, 2, [150, 90, 60, 255])
    set(b, hx + 3, hy - 1, [238, 232, 220, 255])
  } else if (key === 'misbaha') {
    for (let i = 0; i < 5; i++) set(b, hx, hy - 2 + i, [120, 150, 200, 255])
    set(b, hx - 1, hy + 3, [224, 180, 72, 255])
  } else if (key === 'lantern') {
    rect(b, hx - 2, hy - 4, 5, 8, [242, 193, 78, 255])
    rect(b, hx - 1, hy - 2, 3, 4, [255, 243, 196, 255])
    set(b, hx, hy - 5, [122, 90, 42, 255])
  }
}
function drawCompanion(b: Uint8ClampedArray, key: string) {
  if (key === 'cat') {
    const x = CX - 15,
      y = 54
    ell(b, x, y, 4, 3, [120, 104, 88, 255])
    rect(b, x - 3, y - 3, 2, 3, [120, 104, 88, 255])
    set(b, x - 3, y - 3, [96, 82, 68, 255])
    set(b, x - 1, y - 3, [96, 82, 68, 255])
    rect(b, x + 3, y - 1, 3, 1, [120, 104, 88, 255])
    set(b, x - 3, y, [40, 32, 26, 255])
  } else if (key === 'falcon') {
    const x = CX - 15,
      y = 44
    ell(b, x, y, 4, 3, [138, 115, 88, 255])
    ell(b, x - 3, y - 1, 2, 2, [166, 138, 104, 255])
    set(b, x - 4, y - 1, [224, 165, 59, 255])
    rect(b, x + 2, y, 4, 1, [111, 92, 69, 255])
  }
}
