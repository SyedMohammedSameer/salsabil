import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Ellipse, G, Path, Rect, Line } from 'react-native-svg'
import type { TreeSpecies, TreeStage } from '@/lib/database.types'

// Native tree rendering.
//
// The web version (src/components/garden/SvgTree.tsx) composes a Noto Emoji
// SVG with a per-species CSS `filter: hue-rotate(...) saturate(...)`. React
// Native has no CSS filters, and react-native-svg cannot apply them either, so
// a literal port would render twelve identical green trees.
//
// Each species is therefore drawn directly, in the colours the filters were
// producing — the same intent reached by the means the platform actually has.
// The public API, the six growth stages and the per-species accents match the
// web component, so GardenScene logic ports across unchanged.

export type CrownShape = 'round' | 'conifer' | 'palm' | 'umbrella' | 'bottle'

type Accent = 'berries' | 'fruit' | 'dates' | 'acorns' | 'sparkles' | 'blossoms' | 'roots' | 'none'

interface SpeciesVisual {
  shape: CrownShape
  /** Crown fill and its shadow side. */
  crown: string
  crownDark: string
  trunk: string
  accent: Accent
  accentColor?: string
  /** Crown size multiplier on top of the stage scale. */
  scale?: number
  /** Wider than tall, for spreading species such as banyan. */
  spread?: number
}

const SPECIES_VISUAL: Record<TreeSpecies, SpeciesVisual> = {
  olive: {
    shape: 'round', crown: '#8DA65B', crownDark: '#6E8842', trunk: '#6B5B45',
    accent: 'berries', accentColor: '#4A3A5C',
  },
  acacia: {
    // Savanna umbrella: crown raised high on a thin trunk.
    shape: 'umbrella', crown: '#9CB84A', crownDark: '#7A9636', trunk: '#7A6A4F',
    accent: 'none', scale: 1.05,
  },
  date_palm: {
    shape: 'palm', crown: '#4E9A51', crownDark: '#3B7A3E', trunk: '#8B6F47',
    accent: 'dates', accentColor: '#C97B2A',
  },
  pomegranate: {
    shape: 'round', crown: '#5E9E4A', crownDark: '#47793A', trunk: '#6B5B45',
    accent: 'fruit', accentColor: '#C0392B', scale: 0.92,
  },
  fig: {
    shape: 'round', crown: '#4E8C3F', crownDark: '#3A6B2F', trunk: '#6E5C48',
    accent: 'berries', accentColor: '#6B3F5B',
  },
  pine: {
    shape: 'conifer', crown: '#2F6B44', crownDark: '#245335', trunk: '#5C4A38',
    accent: 'none',
  },
  cedar: {
    shape: 'conifer', crown: '#6E9E6B', crownDark: '#557E54', trunk: '#6B5644',
    accent: 'none', scale: 1.05,
  },
  oak: {
    shape: 'round', crown: '#6FA24B', crownDark: '#547A38', trunk: '#6B5B45',
    accent: 'acorns', accentColor: '#8A5A2B', scale: 1.08,
  },
  lote: {
    // Sidrat al-Muntaha — luminous, so it carries gold sparkles.
    shape: 'round', crown: '#7FBF6A', crownDark: '#5F9E4E', trunk: '#6B5B45',
    accent: 'sparkles', accentColor: '#F5C542',
  },
  sakura: {
    shape: 'round', crown: '#F2A8C4', crownDark: '#E086A8', trunk: '#6B5645',
    accent: 'blossoms', accentColor: '#FFFFFF',
  },
  banyan: {
    shape: 'round', crown: '#5F9346', crownDark: '#476F34', trunk: '#6E5C48',
    accent: 'roots', accentColor: '#6E5C48', scale: 1.12, spread: 1.2,
  },
  baobab: {
    // Bulbous bottle trunk with a small crown perched on top.
    shape: 'bottle', crown: '#8FA05E', crownDark: '#6E8043', trunk: '#A08763',
    accent: 'none', scale: 0.62,
  },
}

const STAGE_SCALE: Record<TreeStage, number> = {
  seed: 0.28,
  sprout: 0.46,
  sapling: 0.62,
  young: 0.78,
  mature: 0.92,
  ancient: 1.0,
}

// ─── Deterministic accent placement ──────────────────────────────────────────
//
// Accents must land in the same spot every render, or fruit would jitter around
// the canopy on each re-render. Seeded from the tree's id, as on web.

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededPoints(seed: string, count: number): { x: number; y: number }[] {
  let state = hashSeed(seed) || 1
  const next = () => {
    // xorshift32 — cheap, deterministic, good enough for scatter.
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 1000) / 1000
  }
  return Array.from({ length: count }, () => {
    // Rejection-free polar placement keeps points inside the canopy circle.
    const angle = next() * Math.PI * 2
    const radius = 0.25 + next() * 0.5
    return { x: 0.5 + Math.cos(angle) * radius * 0.5, y: 0.42 + Math.sin(angle) * radius * 0.4 }
  })
}

export interface SvgTreeProps {
  species: TreeSpecies
  stage: TreeStage
  /** Stable per-tree value (its id) so accents do not move between renders. */
  seed: string
  size?: number
  ariaLabel?: string
}

export function SvgTree({ species, stage, seed, size = 120, ariaLabel }: SvgTreeProps) {
  const visual = SPECIES_VISUAL[species]
  const scale = STAGE_SCALE[stage] * (visual.scale ?? 1)
  const spread = visual.spread ?? 1

  const accents = useMemo(
    () => (visual.accent === 'none' ? [] : seededPoints(seed, 6)),
    [seed, visual.accent],
  )

  // A seed is a sprout, not a shrunken tree — species only becomes legible
  // once there is a canopy to colour.
  const isSeedling = stage === 'seed'

  const W = size
  const H = size
  const groundY = H * 0.92

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ariaLabel ?? `${species} at ${stage} stage`}
      style={{ width: W, height: H }}
    >
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {isSeedling ? (
          <G>
            <Path
              d={`M ${W / 2} ${groundY} L ${W / 2} ${groundY - H * 0.14}`}
              stroke="#6E8842"
              strokeWidth={Math.max(1.5, W * 0.02)}
              strokeLinecap="round"
            />
            <Ellipse
              cx={W / 2 - W * 0.06} cy={groundY - H * 0.14}
              rx={W * 0.07} ry={W * 0.04} fill="#7FBF6A"
            />
            <Ellipse
              cx={W / 2 + W * 0.06} cy={groundY - H * 0.16}
              rx={W * 0.07} ry={W * 0.04} fill="#8FD07A"
            />
          </G>
        ) : (
          <G>
            <Trunk shape={visual.shape} color={visual.trunk} w={W} h={H} scale={scale} />
            <Crown
              visual={visual}
              w={W}
              h={H}
              scale={scale}
              spread={spread}
            />
            {accents.map((p, i) => (
              <Accent
                key={i}
                kind={visual.accent}
                color={visual.accentColor ?? '#ffffff'}
                x={p.x * W}
                y={p.y * H + (1 - scale) * H * 0.3}
                r={Math.max(1.5, W * 0.022 * scale)}
              />
            ))}
          </G>
        )}
      </Svg>
    </View>
  )
}

// ─── Parts ───────────────────────────────────────────────────────────────────

function Trunk({
  shape, color, w, h, scale,
}: { shape: CrownShape; color: string; w: number; h: number; scale: number }) {
  const cx = w / 2
  const groundY = h * 0.92
  const height = h * 0.34 * scale

  if (shape === 'bottle') {
    // Baobab: wide at the base, tapering sharply towards the crown.
    const bw = w * 0.3 * scale
    return (
      <Path
        d={`M ${cx - bw / 2} ${groundY}
            Q ${cx - bw * 0.62} ${groundY - height * 0.55} ${cx - bw * 0.2} ${groundY - height}
            L ${cx + bw * 0.2} ${groundY - height}
            Q ${cx + bw * 0.62} ${groundY - height * 0.55} ${cx + bw / 2} ${groundY} Z`}
        fill={color}
      />
    )
  }

  if (shape === 'umbrella' || shape === 'palm') {
    // Tall, slim trunk — the crown sits high above it.
    const tw = Math.max(2, w * 0.05 * scale)
    const tall = h * 0.5 * scale
    return <Rect x={cx - tw / 2} y={groundY - tall} width={tw} height={tall} rx={tw / 2} fill={color} />
  }

  const tw = Math.max(2, w * 0.08 * scale)
  return <Rect x={cx - tw / 2} y={groundY - height} width={tw} height={height} rx={tw / 3} fill={color} />
}

function Crown({
  visual, w, h, scale, spread,
}: { visual: SpeciesVisual; w: number; h: number; scale: number; spread: number }) {
  const cx = w / 2
  const groundY = h * 0.92
  const { crown, crownDark, shape } = visual

  if (shape === 'conifer') {
    // Three stacked tiers, narrowing towards the top.
    const base = groundY - h * 0.22 * scale
    const width = w * 0.52 * scale
    const tier = (i: number) => {
      const t = i / 3
      const y = base - h * 0.42 * scale * t
      const halfW = (width / 2) * (1 - t * 0.45)
      const tierH = h * 0.24 * scale
      return (
        <Path
          key={i}
          d={`M ${cx} ${y - tierH} L ${cx + halfW} ${y} L ${cx - halfW} ${y} Z`}
          fill={i % 2 === 0 ? crown : crownDark}
        />
      )
    }
    return <G>{[2, 1, 0].map(tier)}</G>
  }

  if (shape === 'palm') {
    // Fronds radiating from the top of the trunk.
    const topY = groundY - h * 0.5 * scale
    const len = w * 0.32 * scale
    return (
      <G>
        {[-75, -40, -12, 12, 40, 75].map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const ex = cx + Math.sin(rad) * len
          const ey = topY - Math.cos(rad) * len * 0.55
          return (
            <Path
              key={i}
              d={`M ${cx} ${topY} Q ${(cx + ex) / 2} ${ey - len * 0.28} ${ex} ${ey}`}
              stroke={i % 2 === 0 ? crown : crownDark}
              strokeWidth={Math.max(2, w * 0.045 * scale)}
              strokeLinecap="round"
              fill="none"
            />
          )
        })}
      </G>
    )
  }

  if (shape === 'umbrella') {
    // Flat-topped savanna canopy.
    const topY = groundY - h * 0.5 * scale
    const rx = w * 0.4 * scale * spread
    return (
      <G>
        <Ellipse cx={cx} cy={topY} rx={rx} ry={h * 0.1 * scale} fill={crownDark} />
        <Ellipse cx={cx} cy={topY - h * 0.03 * scale} rx={rx * 0.88} ry={h * 0.085 * scale} fill={crown} />
      </G>
    )
  }

  if (shape === 'bottle') {
    const topY = groundY - h * 0.34 * scale
    const rx = w * 0.26 * scale
    return (
      <G>
        <Ellipse cx={cx} cy={topY} rx={rx} ry={rx * 0.62} fill={crownDark} />
        <Ellipse cx={cx - rx * 0.2} cy={topY - rx * 0.16} rx={rx * 0.72} ry={rx * 0.5} fill={crown} />
      </G>
    )
  }

  // round — three overlapping lobes read as a fuller canopy than one circle.
  const cy = groundY - h * 0.42 * scale
  const r = w * 0.26 * scale * spread
  return (
    <G>
      <Circle cx={cx - r * 0.5} cy={cy + r * 0.18} r={r * 0.78} fill={crownDark} />
      <Circle cx={cx + r * 0.5} cy={cy + r * 0.18} r={r * 0.78} fill={crownDark} />
      <Circle cx={cx} cy={cy - r * 0.18} r={r} fill={crown} />
    </G>
  )
}

function Accent({
  kind, color, x, y, r,
}: { kind: Accent; color: string; x: number; y: number; r: number }) {
  if (kind === 'none') return null

  if (kind === 'roots') {
    // Banyan's hanging aerial roots.
    return <Line x1={x} y1={y} x2={x} y2={y + r * 5} stroke={color} strokeWidth={Math.max(1, r * 0.5)} strokeLinecap="round" />
  }

  if (kind === 'sparkles') {
    return (
      <G>
        <Line x1={x - r} y1={y} x2={x + r} y2={y} stroke={color} strokeWidth={Math.max(1, r * 0.45)} strokeLinecap="round" />
        <Line x1={x} y1={y - r} x2={x} y2={y + r} stroke={color} strokeWidth={Math.max(1, r * 0.45)} strokeLinecap="round" />
      </G>
    )
  }

  if (kind === 'blossoms') {
    return <Circle cx={x} cy={y} r={r * 1.1} fill={color} opacity={0.85} />
  }

  if (kind === 'acorns') {
    return <Ellipse cx={x} cy={y} rx={r * 0.8} ry={r * 1.05} fill={color} />
  }

  // berries, fruit, dates
  return <Circle cx={x} cy={y} r={kind === 'fruit' ? r * 1.15 : r * 0.85} fill={color} />
}

export { STAGE_SCALE }
