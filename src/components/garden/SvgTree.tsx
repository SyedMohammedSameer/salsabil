import type { TreeSpecies, TreeStage } from '@/lib/database.types'

// ─── Asset mapping ──────────────────────────────────────────────────────────
// Base tree art comes from Google's Noto Emoji set (Apache 2.0). We map each
// of our 12 species onto the closest emoji silhouette and tint it via CSS
// filters + add overlays (fruit, berries, glow) for species-specific accents.

type AssetKey = 'seedling' | 'deciduous' | 'evergreen' | 'palm' | 'blossom'

type OverlayKind = 'berries' | 'fruit' | 'dates' | 'glow' | null

interface SpeciesVisual {
  asset: AssetKey
  filter?: string
  overlay?: OverlayKind
  /** Additional size multiplier on top of stage scale (1 = default) */
  scale?: number
}

const SPECIES_VISUAL: Record<TreeSpecies, SpeciesVisual> = {
  olive: {
    asset: 'deciduous',
    filter: 'hue-rotate(-12deg) saturate(0.55) brightness(1.05)',
    overlay: 'berries',
  },
  acacia: {
    asset: 'deciduous',
    filter: 'hue-rotate(38deg) saturate(1.05) brightness(1.05)',
  },
  date_palm: {
    asset: 'palm',
    overlay: 'dates',
  },
  pomegranate: {
    asset: 'deciduous',
    filter: 'saturate(0.95) brightness(0.98)',
    overlay: 'fruit',
    scale: 0.92,
  },
  fig: {
    asset: 'deciduous',
    filter: 'hue-rotate(-12deg) saturate(1.1) brightness(0.88)',
  },
  pine: {
    asset: 'evergreen',
    filter: 'hue-rotate(-6deg) saturate(1.05) brightness(0.95)',
  },
  cedar: {
    asset: 'evergreen',
    filter: 'hue-rotate(20deg) saturate(0.75) brightness(1.05)',
    scale: 1.05,
  },
  oak: {
    asset: 'deciduous',
    scale: 1.08,
  },
  lote: {
    asset: 'deciduous',
    filter: 'hue-rotate(32deg) saturate(1.15) brightness(1.1)',
    overlay: 'glow',
  },
  sakura: {
    asset: 'blossom',
  },
  banyan: {
    asset: 'deciduous',
    filter: 'hue-rotate(-4deg) saturate(1.05)',
    scale: 1.1,
  },
  baobab: {
    asset: 'deciduous',
    filter: 'hue-rotate(22deg) saturate(0.6) brightness(0.92)',
  },
}

// ─── Stage scaling ──────────────────────────────────────────────────────────

const STAGE_SCALE: Record<TreeStage, number> = {
  seed: 0.28,
  sprout: 0.46,
  sapling: 0.62,
  young: 0.78,
  mature: 0.92,
  ancient: 1.0,
}

// ─── Deterministic placement of fruit / berry overlays ──────────────────────
// We need positions stable across renders, so seed → indices.

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededPositions(seed: string, count: number): Array<{ x: number; y: number }> {
  // Distribute count points within the upper-center crown circle of the emoji.
  // Crown is roughly at 50% x, 38% y, radius 28%.
  const points: Array<{ x: number; y: number }> = []
  let h = hashSeed(seed)
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    const angle = ((h >>> 0) / 4294967296) * Math.PI * 2
    h = Math.imul(h ^ (h >>> 17), 0x85ebca6b)
    const r = 0.05 + ((h >>> 0) / 4294967296) * 0.22
    points.push({
      x: 50 + Math.cos(angle) * r * 100,
      y: 40 + Math.sin(angle) * r * 70,
    })
  }
  return points
}

// ─── Overlays ───────────────────────────────────────────────────────────────

function BerriesOverlay({ seed, size }: { seed: string; size: number }) {
  const points = seededPositions(seed, 14)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x + 0.4} cy={p.y + 0.4} r={1.1} fill="rgba(0,0,0,0.35)" />
          <circle cx={p.x} cy={p.y} r={1.0} fill="#2c2118" />
        </g>
      ))}
    </svg>
  )
}

function FruitOverlay({ seed, size }: { seed: string; size: number }) {
  const points = seededPositions(seed, 9)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {points.map((p, i) => (
        <g key={i}>
          {/* shadow */}
          <circle cx={p.x + 0.5} cy={p.y + 0.5} r={2.2} fill="rgba(0,0,0,0.3)" />
          {/* fruit body */}
          <circle cx={p.x} cy={p.y} r={2.1} fill="#c83c3c" />
          {/* highlight */}
          <circle cx={p.x - 0.7} cy={p.y - 0.8} r={0.7} fill="rgba(255,255,255,0.7)" />
          {/* calyx */}
          <path
            d={`M ${p.x - 0.8} ${p.y - 1.8} L ${p.x} ${p.y - 2.6} L ${p.x + 0.8} ${p.y - 1.8} Z`}
            fill="#4a1818"
          />
        </g>
      ))}
    </svg>
  )
}

function DatesOverlay({ size }: { size: number }) {
  // Date clusters hang under the palm crown — fixed cluster of small yellow dots
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <g>
        {Array.from({ length: 8 }).map((_, i) => {
          const cx = 50 + (i - 3.5) * 1.6
          const cy = 44 + Math.abs(i - 3.5) * 0.6
          return (
            <g key={i}>
              <circle cx={cx + 0.3} cy={cy + 0.3} r={1.3} fill="rgba(0,0,0,0.3)" />
              <circle cx={cx} cy={cy} r={1.2} fill="#f1c14a" />
              <circle cx={cx - 0.4} cy={cy - 0.4} r={0.4} fill="rgba(255,255,255,0.7)" />
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function GlowOverlay({ size }: { size: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: '-15%',
        background:
          'radial-gradient(circle at 50% 40%, rgba(255,233,122,0.45) 0%, rgba(255,233,122,0.18) 35%, transparent 65%)',
        pointerEvents: 'none',
        width: `${size * 1.3}px`,
        height: `${size * 1.3}px`,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}

// ─── Public component ──────────────────────────────────────────────────────

export interface SvgTreeProps {
  species: TreeSpecies
  stage: TreeStage
  /** Unique id for deterministic overlay placement */
  seed: string
  /** Width/height of the tree box in pixels */
  size?: number
  ariaLabel?: string
}

export function SvgTree({ species, stage, seed, size = 120, ariaLabel }: SvgTreeProps) {
  const visual = SPECIES_VISUAL[species]
  const isSeedling = stage === 'seed' || stage === 'sprout'
  const asset: AssetKey = isSeedling ? 'seedling' : visual.asset
  const scale = STAGE_SCALE[stage] * (isSeedling ? 1 : (visual.scale ?? 1))
  const imgSize = size * scale

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `${species} ${stage}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-block',
      }}
    >
      {/* Glow halo behind the tree */}
      {!isSeedling && visual.overlay === 'glow' && <GlowOverlay size={size} />}

      {/* The tree itself */}
      <img
        src={`/trees/${asset}.svg`}
        width={imgSize}
        height={imgSize}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          filter: isSeedling ? undefined : visual.filter,
        }}
      />

      {/* Per-species overlays — sized to match the tree */}
      {!isSeedling && visual.overlay && visual.overlay !== 'glow' && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            width: imgSize,
            height: imgSize,
            pointerEvents: 'none',
          }}
        >
          {visual.overlay === 'berries' && <BerriesOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'fruit' && <FruitOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'dates' && <DatesOverlay size={imgSize} />}
        </div>
      )}
    </div>
  )
}
