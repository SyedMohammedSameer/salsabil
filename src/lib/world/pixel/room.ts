// Isometric pixel room renderer. Pure array math (shares the canvas + preview
// harness like draw.ts). Renders a floor grid + detailed walls + furniture into
// an RGBA buffer; the character sprite (from draw.ts) is composited on top by
// the caller. Classic 2:1 isometric projection with outlines, contact shadows
// and highlights for a crisp pixel-game look.

import type { RGBA } from './palette'

export const RW = 300
export const RH = 200
const TW = 42
const TH = 21
export const GX = 5
export const GY = 5
const OX = RW / 2
const OY = 66
const WALL_H = 54

// ─── palette ─────────────────────────────────────────────────────────────────
const DARK: RGBA = [56, 42, 50, 255] // outline
const FLOOR_A: RGBA = [224, 206, 176, 255]
const FLOOR_B: RGBA = [208, 189, 158, 255]
const GROUT: RGBA = [182, 163, 134, 255]
const FLOOR_HI: RGBA = [236, 221, 196, 255]
const WALL_L: RGBA = [214, 206, 232, 255]
const WALL_L_LO: RGBA = [201, 192, 222, 255]
const WALL_R: RGBA = [196, 187, 216, 255]
const WALL_R_LO: RGBA = [183, 173, 205, 255]
const WALL_TOP: RGBA = [236, 230, 248, 255]
const BASEBOARD: RGBA = [166, 157, 190, 255]
const WAINSCOT: RGBA = [228, 222, 242, 255]
const SKY_T: RGBA = [168, 210, 236, 255]
const SKY_B: RGBA = [214, 234, 245, 255]
const FRAME: RGBA = [246, 244, 250, 255]

type Pt = [number, number]

// ─── pixel ops ───────────────────────────────────────────────────────────────
const idx = (x: number, y: number) => (y * RW + x) * 4
function set(b: Uint8ClampedArray, x: number, y: number, c: RGBA) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= RW || y >= RH) return
  const i = idx(x, y)
  b[i] = c[0]
  b[i + 1] = c[1]
  b[i + 2] = c[2]
  b[i + 3] = c[3]
}
function darken(b: Uint8ClampedArray, x: number, y: number, f: number) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= RW || y >= RH) return
  const i = idx(x, y)
  if (b[i + 3] === 0) return
  b[i] *= f
  b[i + 1] *= f
  b[i + 2] *= f
}
const clamp = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n)
const tint = (c: RGBA, f: number): RGBA => [clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f), 255]

function fillPoly(b: Uint8ClampedArray, pts: Pt[], c: RGBA) {
  let minY = Infinity,
    maxY = -Infinity
  for (const p of pts) {
    minY = Math.min(minY, p[1])
    maxY = Math.max(maxY, p[1])
  }
  minY = Math.max(0, Math.floor(minY))
  maxY = Math.min(RH - 1, Math.ceil(maxY))
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i],
        [dx, dy] = pts[(i + 1) % pts.length]
      if ((ay <= y && dy > y) || (dy <= y && ay > y))
        xs.push(ax + ((y - ay) / (dy - ay)) * (dx - ax))
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.round(xs[k]),
        x1 = Math.round(xs[k + 1])
      for (let x = x0; x <= x1; x++) set(b, x, y, c)
    }
  }
}
function line(b: Uint8ClampedArray, a: Pt, z: Pt, c: RGBA) {
  let x0 = Math.round(a[0]),
    y0 = Math.round(a[1])
  const x1 = Math.round(z[0]),
    y1 = Math.round(z[1])
  const dx = Math.abs(x1 - x0),
    dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    set(b, x0, y0, c)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

export const iso = (gx: number, gy: number): Pt => [
  OX + (gx - gy) * (TW / 2),
  OY + (gx + gy) * (TH / 2),
]
export const tileCentre = (gx: number, gy: number): Pt => {
  const [sx, sy] = iso(gx, gy)
  return [sx, sy + TH / 2]
}
const diamond = (cx: number, cy: number, w: number, h: number): Pt[] => [
  [cx, cy - h / 2],
  [cx + w / 2, cy],
  [cx, cy + h / 2],
  [cx - w / 2, cy],
]

function shadowDiamond(b: Uint8ClampedArray, cx: number, cy: number, w: number, f: number) {
  const h = w / 2
  for (let y = Math.floor(cy - h / 2); y <= cy + h / 2; y++)
    for (let x = Math.floor(cx - w / 2); x <= cx + w / 2; x++) {
      const dx = Math.abs(x - cx) / (w / 2),
        dy = Math.abs(y - cy) / (h / 2)
      if (dx + dy <= 1) darken(b, x, y, f)
    }
}

// ─── isometric cuboid with outline + highlight + shading ─────────────────────
export interface Placed {
  key: string
  gx: number
  gy: number
}

function box(
  b: Uint8ClampedArray,
  cx: number,
  cyBase: number,
  w: number,
  d: number,
  h: number,
  top: RGBA,
) {
  const hx = w / 2,
    hy = d / 2,
    tcy = cyBase - h - hy
  const T: Pt = [cx, tcy - hy],
    R: Pt = [cx + hx, tcy],
    B: Pt = [cx, tcy + hy],
    L: Pt = [cx - hx, tcy]
  const Lb: Pt = [cx - hx, tcy + h],
    Bb: Pt = [cx, tcy + hy + h],
    Rb: Pt = [cx + hx, tcy + h]
  fillPoly(b, [T, R, B, L], top)
  fillPoly(b, [L, B, Bb, Lb], tint(top, 0.76))
  fillPoly(b, [R, B, Bb, Rb], tint(top, 0.58))
  // top highlight along the back edges
  line(b, T, L, tint(top, 1.16))
  line(b, T, R, tint(top, 1.16))
  // outline
  for (const [p, q] of [
    [T, R],
    [R, B],
    [B, L],
    [L, T],
    [L, Lb],
    [B, Bb],
    [R, Rb],
    [Lb, Bb],
    [Bb, Rb],
  ] as [Pt, Pt][])
    line(b, p, q, DARK)
}

// ─── furniture ───────────────────────────────────────────────────────────────
const FURNITURE: Record<string, (b: Uint8ClampedArray, cx: number, cy: number) => void> = {
  rug: (b, cx, cy) => {
    fillPoly(b, diamond(cx, cy, TW * 2.0, TH * 2.0), DARK)
    fillPoly(b, diamond(cx, cy, TW * 1.9, TH * 1.9), [180, 116, 128, 255])
    fillPoly(b, diamond(cx, cy, TW * 1.4, TH * 1.4), [210, 152, 160, 255])
    fillPoly(b, diamond(cx, cy, TW * 0.9, TH * 0.9), [232, 200, 146, 255])
    fillPoly(b, diamond(cx, cy, TW * 0.4, TH * 0.4), [200, 130, 138, 255])
  },
  plant: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 2, 26, 0.82)
    box(b, cx, cy, 16, 11, 12, [198, 118, 88, 255]) // terracotta pot
    line(b, [cx - 8, cy - 12], [cx + 8, cy - 12], [230, 150, 116, 255]) // rim
    // foliage clusters (outlined)
    const leaf = (ox: number, oy: number, w: number, col: RGBA) => {
      fillPoly(b, diamond(cx + ox, cy - 20 + oy, w + 3, w * 0.8 + 3), DARK)
      fillPoly(b, diamond(cx + ox, cy - 20 + oy, w, w * 0.8), col)
    }
    leaf(0, -6, 22, [92, 156, 96, 255])
    leaf(-7, 0, 15, [110, 176, 112, 255])
    leaf(7, -2, 14, [74, 134, 82, 255])
  },
  lamp: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 1, 22, 0.85)
    box(b, cx, cy, 13, 9, 3, [96, 88, 78, 255]) // base
    for (let y = cy - 50; y < cy - 5; y++) {
      set(b, cx, y, [120, 110, 96, 255])
      set(b, cx - 1, y, DARK)
    } // pole
    const S: Pt = [cx, cy - 62],
      LL: Pt = [cx - 11, cy - 47],
      RR: Pt = [cx + 11, cy - 47]
    fillPoly(b, [S, RR, LL], [246, 228, 172, 255])
    fillPoly(b, [S, RR, [cx, cy - 47]], [226, 204, 150, 255])
    line(b, S, LL, DARK)
    line(b, S, RR, DARK)
    line(b, LL, RR, DARK)
    // warm glow pool on the floor
    shadowDiamond(b, cx, cy, 30, 1.04)
  },
  table: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 3, 34, 0.84)
    // legs first
    for (const [ox, oy] of [
      [-15, -6],
      [15, -6],
      [0, 7],
      [0, -12],
    ])
      for (let y = cy - 13; y < cy + oy; y++) set(b, cx + ox, y, [128, 92, 60, 255])
    box(b, cx, cy - 10, 38, 26, 4, [190, 150, 108, 255]) // top
    // items on top: a little book + cup
    box(b, cx - 6, cy - 22, 9, 6, 3, [176, 96, 84, 255])
    box(b, cx + 6, cy - 21, 5, 4, 5, [238, 232, 220, 255])
  },
  shelf: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 2, 22, 0.84)
    box(b, cx, cy, 22, 15, 58, [176, 140, 100, 255])
    // shelf boards
    for (const yy of [cy - 50, cy - 37, cy - 24, cy - 11])
      line(b, [cx - 11, yy], [cx + 11, yy + 5], tint([176, 140, 100, 255], 0.6))
    // books
    const book = (ox: number, yy: number, hgt: number, col: RGBA) =>
      box(b, cx + ox, yy, 4, 3, hgt, col)
    book(-7, cy - 39, 10, [186, 90, 84, 255])
    book(-2, cy - 39, 11, [88, 128, 160, 255])
    book(3, cy - 39, 9, [120, 152, 100, 255])
    book(-6, cy - 26, 9, [210, 170, 92, 255])
    book(-1, cy - 26, 11, [140, 110, 170, 255])
    fillPoly(b, diamond(cx + 5, cy - 15, 12, 9), [96, 158, 100, 255]) // small plant on a shelf
  },
  sofa: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 4, 48, 0.82)
    const body: RGBA = [108, 126, 166, 255]
    box(b, cx, cy - 7, 42, 22, 22, tint(body, 0.92)) // back + body block
    box(b, cx - 19, cy, 7, 20, 16, tint(body, 1.0)) // left arm
    box(b, cx + 19, cy, 7, 20, 16, tint(body, 1.0)) // right arm
    box(b, cx, cy + 3, 40, 20, 9, tint(body, 1.12)) // seat cushion
    line(b, [cx, cy - 8], [cx, cy - 2], tint(body, 0.7)) // cushion seam
  },
  tv: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 2, 30, 0.84)
    box(b, cx, cy, 34, 20, 8, [122, 96, 74, 255]) // media console
    // flatscreen
    const p: Pt[] = [
      [cx - 22, cy - 42],
      [cx + 22, cy - 31],
      [cx + 22, cy - 9],
      [cx - 22, cy - 20],
    ]
    fillPoly(
      b,
      [
        [p[0][0] - 1, p[0][1] - 1],
        [p[1][0] + 1, p[1][1] - 1],
        [p[2][0] + 1, p[2][1] + 1],
        [p[3][0] - 1, p[3][1] + 1],
      ],
      DARK,
    )
    fillPoly(b, p, [44, 48, 60, 255])
    fillPoly(
      b,
      [
        [cx - 18, cy - 38],
        [cx + 18, cy - 28],
        [cx + 18, cy - 12],
        [cx - 18, cy - 22],
      ],
      [104, 158, 184, 255],
    )
    fillPoly(
      b,
      [
        [cx - 18, cy - 38],
        [cx + 4, cy - 33],
        [cx + 4, cy - 24],
        [cx - 18, cy - 29],
      ],
      [136, 186, 206, 255],
    ) // screen glint
  },
  bed: (b, cx, cy) => {
    shadowDiamond(b, cx, cy + 5, 46, 0.82)
    box(b, cx, cy, 42, 46, 9, [150, 120, 94, 255]) // wooden frame
    box(b, cx, cy - 9, 40, 6, 15, [138, 108, 84, 255]) // headboard at the back edge
    box(b, cx, cy - 2, 38, 42, 6, [130, 162, 208, 255]) // duvet
    box(b, cx - 9, cy - 15, 28, 14, 5, [246, 244, 250, 255]) // pillow
  },
}
export const FURNITURE_KEYS = Object.keys(FURNITURE)

// ─── room ────────────────────────────────────────────────────────────────────
function wall(b: Uint8ClampedArray, a: Pt, s: Pt, base: RGBA, lo: RGBA) {
  const up = (p: Pt, h: number): Pt => [p[0], p[1] - h]
  fillPoly(b, [a, s, up(s, WALL_H), up(a, WALL_H)], base)
  fillPoly(b, [a, s, up(s, 18), up(a, 18)], lo) // lower wainscot band
  fillPoly(b, [up(a, 18), up(s, 18), up(s, 20), up(a, 20)], WAINSCOT) // wainscot rail
  fillPoly(b, [a, s, up(s, 5), up(a, 5)], BASEBOARD) // baseboard
  fillPoly(b, [up(a, WALL_H), up(s, WALL_H), up(s, WALL_H - 2), up(a, WALL_H - 2)], WALL_TOP) // top rim
  line(b, up(a, WALL_H), up(s, WALL_H), DARK)
  line(b, a, s, tint(BASEBOARD, 0.7))
}

export function renderRoom(b: Uint8ClampedArray, placed: Placed[]) {
  b.fill(0)
  const topC = iso(0, 0)
  const leftC: Pt = [OX - GY * (TW / 2), OY + GY * (TH / 2)]
  const rightC: Pt = [OX + GX * (TW / 2), OY + GX * (TH / 2)]

  wall(b, topC, leftC, WALL_L, WALL_L_LO)
  wall(b, topC, rightC, WALL_R, WALL_R_LO)
  line(b, [topC[0], topC[1] - WALL_H], topC, tint(WALL_R, 0.8)) // back vertical seam

  // window on the right wall (framed, sky, muntins, sill)
  const wp: Pt[] = [
    [OX + 16, OY + 6],
    [OX + 44, OY + 20],
    [OX + 44, OY - 20],
    [OX + 16, OY - 34],
  ]
  fillPoly(b, wp, FRAME)
  const gp: Pt[] = [
    [OX + 20, OY + 5],
    [OX + 40, OY + 15],
    [OX + 40, OY - 17],
    [OX + 20, OY - 27],
  ]
  for (let y = OY - 27; y <= OY + 15; y++) {
    const t = (y - (OY - 27)) / 42
    for (let x = OX + 20; x <= OX + 40; x++)
      set(b, x, y, [
        SKY_T[0] + (SKY_B[0] - SKY_T[0]) * t,
        SKY_T[1] + (SKY_B[1] - SKY_T[1]) * t,
        SKY_T[2] + (SKY_B[2] - SKY_T[2]) * t,
        255,
      ])
  }
  void gp
  line(b, [OX + 30, OY - 30], [OX + 30, OY + 11], FRAME) // vertical muntin
  line(b, [OX + 18, OY - 6], [OX + 42, OY + 6], FRAME) // horizontal muntin
  fillPoly(
    b,
    [
      [OX + 15, OY + 7],
      [OX + 45, OY + 22],
      [OX + 45, OY + 25],
      [OX + 15, OY + 10],
    ],
    tint(FRAME, 0.9),
  ) // sill

  // framed picture on the left wall
  const pf: Pt[] = [
    [OX - 40, OY - 8],
    [OX - 20, OY - 18],
    [OX - 20, OY - 34],
    [OX - 40, OY - 24],
  ]
  fillPoly(b, pf, [120, 96, 70, 255])
  fillPoly(
    b,
    [
      [OX - 37, OY - 11],
      [OX - 23, OY - 18],
      [OX - 23, OY - 30],
      [OX - 37, OY - 23],
    ],
    [196, 214, 200, 255],
  )
  fillPoly(
    b,
    [
      [OX - 35, OY - 15],
      [OX - 25, OY - 20],
      [OX - 25, OY - 25],
      [OX - 35, OY - 20],
    ],
    [150, 178, 158, 255],
  )

  // floor with grout + subtle tile highlight
  for (let gy = 0; gy < GY; gy++)
    for (let gx = 0; gx < GX; gx++) {
      const [sx, sy] = iso(gx, gy)
      const cy = sy + TH / 2
      const d = diamond(sx, cy, TW, TH)
      fillPoly(b, d, (gx + gy) % 2 ? FLOOR_A : FLOOR_B)
      line(b, d[3], d[0], FLOOR_HI) // back-left edge highlight
      line(b, d[0], d[1], FLOOR_HI) // back-right edge highlight
      line(b, d[1], d[2], GROUT) // front-right grout
      line(b, d[2], d[3], GROUT) // front-left grout
    }

  // furniture, back-to-front
  for (const p of [...placed].sort((a, z) => a.gx + a.gy - (z.gx + z.gy))) {
    const fn = FURNITURE[p.key]
    if (!fn) continue
    const [cx, cy] = tileCentre(p.gx, p.gy)
    fn(b, Math.round(cx), Math.round(cy))
  }
}

/** Blit a 48×64 character sprite so its feet land at tile (gx,gy), with a shadow. */
export function compositeCharacter(
  dest: Uint8ClampedArray,
  src: Uint8ClampedArray,
  cw: number,
  ch: number,
  gx: number,
  gy: number,
) {
  const [cx, cy] = tileCentre(gx, gy)
  shadowDiamond(dest, cx, cy + 2, 22, 0.82)
  const dx = Math.round(cx - cw / 2)
  const dy = Math.round(cy + TH / 2 - ch)
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const s = (y * cw + x) * 4
      if (src[s + 3] === 0) continue
      const tx = dx + x,
        ty = dy + y
      if (tx < 0 || ty < 0 || tx >= RW || ty >= RH) continue
      const d = (ty * RW + tx) * 4
      dest[d] = src[s]
      dest[d + 1] = src[s + 1]
      dest[d + 2] = src[s + 2]
      dest[d + 3] = 255
    }
}
