import type { JSX } from 'react'
import type { AvatarVariant } from '@/lib/database.types'
import { CATALOG_BY_KEY } from '@/data/worldCatalog'
import { Avatar } from './Avatar'

// The scene is drawn in a 400 × 260 viewBox. The ground line (where the avatar
// and decorations stand) is at y = GROUND_Y. Sprites are authored with their
// feet at local (0, 0) and extend upward in -y, so they can be dropped onto the
// ground with a single translate.

export const SCENE_W = 400
export const SCENE_H = 260
export const GROUND_Y = 206

// ─── Desert biome backdrop ───────────────────────────────────────────────────

export function DesertBiome() {
  return (
    <g>
      {/* Sky */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#sky-desert)" />
      {/* Sun */}
      <circle cx={310} cy={70} r={34} fill="#ffe3a8" opacity={0.9} />
      <circle cx={310} cy={70} r={24} fill="#ffd27a" />
      {/* Far dunes */}
      <path
        d={`M 0 ${GROUND_Y} L 0 150 Q 120 118 220 148 T 400 140 L 400 ${GROUND_Y} Z`}
        fill="#e9c48c"
      />
      <path
        d={`M 0 ${GROUND_Y} L 0 172 Q 140 150 260 176 T 400 168 L 400 ${GROUND_Y} Z`}
        fill="#e0b276"
      />
      {/* Ground */}
      <rect x={0} y={GROUND_Y} width={SCENE_W} height={SCENE_H - GROUND_Y} fill="#d8a765" />
      <rect x={0} y={GROUND_Y} width={SCENE_W} height={4} fill="#c9954f" opacity={0.5} />
    </g>
  )
}

// ─── Decoration sprites (feet at local 0,0) ──────────────────────────────────

function Cactus() {
  return (
    <g>
      <ellipse cx={0} cy={-1} rx={14} ry={3.5} fill="#00000018" />
      <rect x={-5} y={-46} width={10} height={46} rx={5} fill="#5b8f5a" />
      <rect x={-16} y={-34} width={8} height={20} rx={4} fill="#5b8f5a" />
      <rect x={-16} y={-34} width={8} height={6} rx={3} fill="#6ea06d" />
      <rect x={8} y={-40} width={8} height={16} rx={4} fill="#5b8f5a" />
      <rect x={-4} y={-46} width={8} height={8} rx={4} fill="#6ea06d" />
      <circle cx={0} cy={-40} r={1.2} fill="#e9738d" />
      <circle cx={-12} cy={-30} r={1.2} fill="#e9738d" />
    </g>
  )
}

function Rug() {
  // Laid flat on the sand — a parallelogram with a simple mihrab pattern.
  return (
    <g>
      <path d="M -22 0 L 22 0 L 16 -9 L -16 -9 Z" fill="#2f7d6b" stroke="#1f5c4e" strokeWidth={1} />
      <path d="M -17 -1 L 17 -1 L 12.5 -7.5 L -12.5 -7.5 Z" fill="#3f9a85" />
      <path d="M -2 -2 L 2 -2 L 1.4 -6 Q 0 -7.2 -1.4 -6 Z" fill="#f2c14e" />
      <line x1={-17} y1={-3.5} x2={17} y2={-3.5} stroke="#f2c14e" strokeWidth={0.5} opacity={0.6} />
    </g>
  )
}

function Palm() {
  return (
    <g>
      <ellipse cx={0} cy={-1} rx={13} ry={3.5} fill="#00000018" />
      <path d="M -4 0 Q 2 -34 -1 -64 L 4 -64 Q 6 -32 4 0 Z" fill="#a9793f" />
      <path
        d="M -3 -20 h 8 M -2 -34 h 7 M -1 -48 h 6"
        stroke="#8a5f30"
        strokeWidth={1}
        opacity={0.6}
      />
      {/* Fronds */}
      {[-1, -0.5, 0, 0.5, 1].map((k, i) => (
        <path
          key={i}
          d={`M 1 -64 Q ${1 + k * 40} ${-64 - Math.abs(k) * 4 - 6} ${1 + k * 52} ${-58 + Math.abs(k) * 10}`}
          fill="none"
          stroke="#3f8f5a"
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
      <circle cx={1} cy={-63} r={3} fill="#356f49" />
      {/* Dates */}
      <circle cx={-2} cy={-58} r={1.5} fill="#b5642f" />
      <circle cx={4} cy={-58} r={1.5} fill="#b5642f" />
    </g>
  )
}

function LanternPost() {
  return (
    <g>
      <ellipse cx={0} cy={-1} rx={7} ry={2.5} fill="#00000018" />
      <rect x={-2} y={-40} width={4} height={40} rx={1.5} fill="#5c4a35" />
      <path d="M -3 -40 h 6" stroke="#5c4a35" strokeWidth={2} />
      <path
        d="M -7 -52 L 7 -52 L 5 -40 L -5 -40 Z"
        fill="#e0a53b"
        stroke="#a8781f"
        strokeWidth={1}
      />
      <rect x={-4} y={-50} width={8} height={9} rx={1} fill="#fff3c4" opacity={0.9} />
      <path d="M -6 -52 L 6 -52 L 0 -58 Z" fill="#8a6a2a" />
    </g>
  )
}

function Tent() {
  return (
    <g>
      <ellipse cx={0} cy={-1} rx={30} ry={4} fill="#00000018" />
      <path d="M 0 -40 L 30 0 L -30 0 Z" fill="#c98a4a" stroke="#a06a30" strokeWidth={1.5} />
      <path d="M 0 -40 L 12 0 L -12 0 Z" fill="#8a5a30" />
      <path d="M 0 -40 L 6 0 L -6 0 Z" fill="#6f4623" />
      <path d="M -30 0 L 0 -40 L -6 0 Z" fill="#b97c40" opacity={0.6} />
      <path d="M 0 -40 l 0 -6 l 4 3 Z" fill="#e0a53b" />
    </g>
  )
}

function Fountain() {
  return (
    <g>
      <ellipse cx={0} cy={-1} rx={24} ry={6} fill="#00000018" />
      <ellipse cx={0} cy={-2} rx={22} ry={6} fill="#c9954f" />
      <ellipse cx={0} cy={-4} rx={20} ry={5} fill="#4bb0c4" />
      <ellipse cx={0} cy={-4} rx={20} ry={5} fill="none" stroke="#e0b276" strokeWidth={2} />
      <rect x={-3} y={-22} width={6} height={18} rx={2} fill="#d8c3a0" />
      <ellipse cx={0} cy={-24} rx={8} ry={2.5} fill="#4bb0c4" />
      <ellipse cx={0} cy={-24} rx={8} ry={2.5} fill="none" stroke="#d8c3a0" strokeWidth={1.5} />
      {/* Water jets */}
      <path
        d="M 0 -26 q -6 -6 -8 -2 M 0 -26 q 6 -6 8 -2"
        stroke="#8fd6e6"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={-8} cy={-6} r={1} fill="#8fd6e6" />
      <circle cx={9} cy={-7} r={1} fill="#8fd6e6" />
    </g>
  )
}

export const DECORATION_SPRITES: Record<string, () => JSX.Element> = {
  cactus: Cactus,
  rug: Rug,
  palm: Palm,
  lantern_post: LanternPost,
  tent: Tent,
  fountain: Fountain,
}

// ─── Item preview (used by the shop) ─────────────────────────────────────────

interface ItemPreviewProps {
  itemKey: string
  variant: AvatarVariant
  size?: number
}

/** Renders a catalog item inside a small standalone SVG for shop cards. */
export function ItemPreview({ itemKey, variant, size = 72 }: ItemPreviewProps) {
  const item = CATALOG_BY_KEY[itemKey]
  if (!item) return null

  if (item.category === 'accessory' && item.slot) {
    // Show the accessory on the character.
    return (
      <svg width={size} height={size} viewBox="-40 -112 80 116" role="img" aria-label={item.name}>
        <Avatar variant={variant} equipped={{ [item.slot]: item.key }} />
      </svg>
    )
  }

  const Sprite = DECORATION_SPRITES[itemKey]
  if (!Sprite) return null
  return (
    <svg width={size} height={size} viewBox="-34 -72 68 76" role="img" aria-label={item.name}>
      <Sprite />
    </svg>
  )
}
