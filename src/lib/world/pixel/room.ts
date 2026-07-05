// Isometric pixel room renderer. Pure array math (shares the canvas + preview
// harness like draw.ts). Renders a floor grid + walls + furniture into an RGBA
// buffer; the character sprite (from draw.ts) is composited on top by the
// caller. Classic 2:1 isometric projection.

import type { RGBA } from './palette'

export const RW = 300
export const RH = 196
const TW = 42 // tile width
const TH = 21 // tile height
export const GX = 5 // floor tiles along x
export const GY = 5 // floor tiles along y
const OX = RW / 2
const OY = 64
const WALL_H = 52

// palette
const FLOOR_A: RGBA = [216, 198, 170, 255]
const FLOOR_B: RGBA = [200, 182, 152, 255]
const FLOOR_EDGE: RGBA = [176, 158, 128, 255]
const WALL_L: RGBA = [212, 204, 230, 255]
const WALL_R: RGBA = [190, 182, 210, 255]
const WALL_TOP: RGBA = [230, 224, 244, 255]
const SKIRT: RGBA = [156, 148, 178, 255]
const WINDOW: RGBA = [176, 210, 232, 255]
const WINDOW_FR: RGBA = [238, 236, 246, 255]

// ─── pixel ops ───────────────────────────────────────────────────────────────
const idx = (x: number, y: number) => (y * RW + x) * 4
function set(b: Uint8ClampedArray, x: number, y: number, c: RGBA) {
  if (x < 0 || y < 0 || x >= RW || y >= RH) return
  const i = idx(x, y)
  b[i] = c[0]
  b[i + 1] = c[1]
  b[i + 2] = c[2]
  b[i + 3] = c[3]
}
type Pt = [number, number]
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

// tile (gx,gy) → screen TOP corner
export const iso = (gx: number, gy: number): Pt => [
  OX + (gx - gy) * (TW / 2),
  OY + (gx + gy) * (TH / 2),
]
// centre of a tile's floor
export const tileCentre = (gx: number, gy: number): Pt => {
  const [sx, sy] = iso(gx, gy)
  return [sx, sy + TH / 2]
}

function diamond(cx: number, cy: number, w: number, h: number): Pt[] {
  return [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ]
}

// ─── furniture ───────────────────────────────────────────────────────────────
export interface Placed {
  key: string
  gx: number
  gy: number
}
const shade = (c: RGBA, f: number): RGBA => [
  Math.round(c[0] * f),
  Math.round(c[1] * f),
  Math.round(c[2] * f),
  255,
]

// an isometric cuboid whose front-bottom sits at (cx, cyBase)
function isoBox(
  b: Uint8ClampedArray,
  cx: number,
  cyBase: number,
  w: number,
  d: number,
  h: number,
  top: RGBA,
) {
  const hx = w / 2,
    hy = d / 2
  const tcy = cyBase - h - hy
  fillPoly(
    b,
    [
      [cx, tcy - hy],
      [cx + hx, tcy],
      [cx, tcy + hy],
      [cx - hx, tcy],
    ],
    top,
  )
  fillPoly(
    b,
    [
      [cx - hx, tcy],
      [cx, tcy + hy],
      [cx, tcy + hy + h],
      [cx - hx, tcy + h],
    ],
    shade(top, 0.78),
  )
  fillPoly(
    b,
    [
      [cx + hx, tcy],
      [cx, tcy + hy],
      [cx, tcy + hy + h],
      [cx + hx, tcy + h],
    ],
    shade(top, 0.6),
  )
}

const FURNITURE: Record<string, (b: Uint8ClampedArray, cx: number, cy: number) => void> = {
  rug: (b, cx, cy) => {
    fillPoly(b, diamond(cx, cy, TW * 2.4, TH * 2.4), [176, 120, 130, 255])
    fillPoly(b, diamond(cx, cy, TW * 1.7, TH * 1.7), [206, 150, 158, 255])
    fillPoly(b, diamond(cx, cy, TW * 0.7, TH * 0.7), [230, 196, 140, 255])
  },
  plant: (b, cx, cy) => {
    isoBox(b, cx, cy, 18, 12, 14, [180, 130, 96, 255])
    fillPoly(b, diamond(cx, cy - 27, 34, 24), [86, 150, 92, 255])
    fillPoly(b, diamond(cx - 6, cy - 36, 22, 18), [104, 170, 108, 255])
    fillPoly(b, diamond(cx + 6, cy - 33, 18, 15), [72, 132, 80, 255])
  },
  lamp: (b, cx, cy) => {
    isoBox(b, cx, cy, 15, 10, 3, [120, 110, 96, 255])
    for (let y = cy - 52; y < cy - 6; y++) set(b, cx, y, [90, 82, 70, 255])
    fillPoly(
      b,
      [
        [cx, cy - 66],
        [cx + 14, cy - 48],
        [cx - 14, cy - 48],
      ],
      [244, 226, 170, 255],
    )
    fillPoly(
      b,
      [
        [cx, cy - 66],
        [cx + 14, cy - 48],
        [cx, cy - 48],
      ],
      [224, 202, 150, 255],
    )
  },
  sofa: (b, cx, cy) => {
    isoBox(b, cx, cy - 5, 40, 20, 18, [100, 118, 156, 255]) // back block
    isoBox(b, cx + 3, cy, 38, 20, 9, [122, 140, 178, 255]) // seat cushion
    isoBox(b, cx - 15, cy - 2, 9, 18, 14, [110, 128, 166, 255]) // left arm
    isoBox(b, cx + 18, cy + 1, 9, 18, 14, [110, 128, 166, 255]) // right arm
  },
  table: (b, cx, cy) => {
    isoBox(b, cx, cy, 39, 27, 5, [186, 146, 104, 255])
    for (const [ox, oy] of [
      [-15, -6],
      [15, -6],
      [0, 6],
    ])
      for (let y = cy - 15; y < cy - 1; y++) set(b, cx + ox, y + oy, [140, 104, 70, 255])
  },
  shelf: (b, cx, cy) => {
    isoBox(b, cx, cy, 24, 18, 60, [170, 136, 98, 255])
    for (const yy of [cy - 50, cy - 36, cy - 22])
      fillPoly(
        b,
        [
          [cx - 12, yy],
          [cx, yy + 6],
          [cx + 12, yy],
        ],
        [140, 108, 74, 255],
      )
    for (const [ox, yy, col] of [
      [-6, cy - 44, [180, 90, 84]],
      [3, cy - 44, [90, 130, 160]],
      [-3, cy - 30, [120, 150, 100]],
    ] as [number, number, number[]][])
      isoBox(b, cx + ox, yy + 12, 5, 3, 9, [col[0], col[1], col[2], 255])
  },
  bed: (b, cx, cy) => {
    isoBox(b, cx, cy, 40, 44, 9, [150, 170, 200, 255]) // mattress
    isoBox(b, cx - 11, cy - 17, 34, 14, 5, [240, 236, 246, 255]) // pillow
    isoBox(b, cx + 6, cy - 6, 26, 26, 3, [126, 148, 182, 255]) // blanket
  },
  tv: (b, cx, cy) => {
    isoBox(b, cx, cy, 15, 12, 5, [70, 66, 74, 255]) // stand
    fillPoly(
      b,
      [
        [cx - 21, cy - 39],
        [cx + 21, cy - 30],
        [cx + 21, cy - 9],
        [cx - 21, cy - 18],
      ],
      [40, 44, 56, 255],
    )
    fillPoly(
      b,
      [
        [cx - 17, cy - 36],
        [cx + 17, cy - 28],
        [cx + 17, cy - 12],
        [cx - 17, cy - 20],
      ],
      [96, 150, 176, 255],
    )
  },
}
export const FURNITURE_KEYS = Object.keys(FURNITURE)

// ─── room base (floor + walls + furniture) ───────────────────────────────────
export function renderRoom(b: Uint8ClampedArray, placed: Placed[]) {
  b.fill(0)
  const topC = iso(0, 0)
  const leftC: Pt = [OX - GY * (TW / 2), OY + GY * (TH / 2)]
  const rightC: Pt = [OX + GX * (TW / 2), OY + GX * (TH / 2)]

  // walls (drawn first, behind the floor)
  fillPoly(b, [topC, leftC, [leftC[0], leftC[1] - WALL_H], [topC[0], topC[1] - WALL_H]], WALL_L)
  fillPoly(b, [topC, rightC, [rightC[0], rightC[1] - WALL_H], [topC[0], topC[1] - WALL_H]], WALL_R)
  // wall top rims
  fillPoly(
    b,
    [
      [topC[0], topC[1] - WALL_H],
      [leftC[0], leftC[1] - WALL_H],
      [leftC[0], leftC[1] - WALL_H + 2],
      [topC[0], topC[1] - WALL_H + 2],
    ],
    WALL_TOP,
  )
  fillPoly(
    b,
    [
      [topC[0], topC[1] - WALL_H],
      [rightC[0], rightC[1] - WALL_H],
      [rightC[0], rightC[1] - WALL_H + 2],
      [topC[0], topC[1] - WALL_H + 2],
    ],
    WALL_TOP,
  )
  // window on the right wall
  fillPoly(
    b,
    [
      [OX + 18, OY + 4],
      [OX + 42, OY + 16],
      [OX + 42, OY - 12],
      [OX + 18, OY - 24],
    ],
    WINDOW_FR,
  )
  fillPoly(
    b,
    [
      [OX + 21, OY + 3],
      [OX + 39, OY + 12],
      [OX + 39, OY - 10],
      [OX + 21, OY - 19],
    ],
    WINDOW,
  )
  set(b, OX + 30, OY - 8, WINDOW_FR)
  // skirting along the two back edges
  for (let g = 0; g <= GY; g++) {
    const [x, y] = [OX - g * (TW / 2), OY + g * (TH / 2)]
    set(b, x, y - 1, SKIRT)
    set(b, x, y - 2, SKIRT)
  }
  for (let g = 0; g <= GX; g++) {
    const [x, y] = [OX + g * (TW / 2), OY + g * (TH / 2)]
    set(b, x, y - 1, SKIRT)
    set(b, x, y - 2, SKIRT)
  }

  // floor checker (with a 1px darker rim per tile for grid definition)
  for (let gy = 0; gy < GY; gy++)
    for (let gx = 0; gx < GX; gx++) {
      const [sx, sy] = iso(gx, gy)
      const cy = sy + TH / 2
      fillPoly(
        b,
        [
          [sx, cy - TH / 2],
          [sx + TW / 2, cy],
          [sx, cy + TH / 2],
          [sx - TW / 2, cy],
        ],
        (gx + gy) % 2 ? FLOOR_A : FLOOR_B,
      )
    }
  void FLOOR_EDGE

  // furniture, back-to-front
  for (const p of [...placed].sort((a, z) => a.gx + a.gy - (z.gx + z.gy))) {
    const fn = FURNITURE[p.key]
    if (!fn) continue
    const [cx, cy] = tileCentre(p.gx, p.gy)
    fn(b, Math.round(cx), Math.round(cy))
  }
}

/** Blit a 48×64 character sprite so its feet land at tile (gx,gy). */
export function compositeCharacter(
  dest: Uint8ClampedArray,
  src: Uint8ClampedArray,
  cw: number,
  ch: number,
  gx: number,
  gy: number,
) {
  const [cx, cy] = tileCentre(gx, gy)
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
