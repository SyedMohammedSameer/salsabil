import type { TreeSpecies, TreeStage } from '@/lib/database.types'

// ─── Asset map ──────────────────────────────────────────────────────────────
// Base hand-illustrated tree SVGs from Google Noto Emoji (Apache 2.0).
// Each species composes one base emoji with custom underlays and overlays
// so every species reads as visually distinct.

type AssetKey = 'seedling' | 'deciduous' | 'evergreen' | 'palm' | 'blossom'

interface SpeciesVisual {
  asset: AssetKey
  /** CSS color filter applied to the base emoji */
  filter?: string
  /** Vertical offset (% of size) — positive moves the crown up (e.g. acacia) */
  yOffset?: number
  /** Horizontal scale of the base emoji (e.g. 0.85 makes acacia narrower) */
  widthScale?: number
  /** Crown size multiplier on top of stage scale */
  scale?: number
  /** Custom underlay (drawn behind the emoji) */
  underlay?: 'savanna_trunk' | 'baobab_trunk'
  /** Custom overlay (drawn over the emoji) */
  overlay?:
    | 'berries'
    | 'fruit'
    | 'dates'
    | 'glow_sparkles'
    | 'acorns'
    | 'fig_leaves'
    | 'aerial_roots'
    | 'sakura_blossoms'
}

const SPECIES_VISUAL: Record<TreeSpecies, SpeciesVisual> = {
  olive: {
    asset: 'deciduous',
    filter: 'hue-rotate(-12deg) saturate(0.55) brightness(1.05)',
    overlay: 'berries',
  },
  acacia: {
    // Tall thin trunk with crown raised high → savanna umbrella look
    asset: 'deciduous',
    filter: 'hue-rotate(35deg) saturate(1.05) brightness(1.05)',
    underlay: 'savanna_trunk',
    yOffset: 28,
    widthScale: 1.05,
    scale: 0.7,
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
    overlay: 'fig_leaves',
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
    overlay: 'acorns',
  },
  lote: {
    asset: 'deciduous',
    filter: 'hue-rotate(32deg) saturate(1.15) brightness(1.1)',
    overlay: 'glow_sparkles',
  },
  sakura: {
    // Pink-tint a real tree shape and overlay blossom puffs (the bare emoji
    // is just one flower face, doesn't look like a tree).
    asset: 'deciduous',
    filter: 'hue-rotate(220deg) saturate(2.4) brightness(1.15)',
    overlay: 'sakura_blossoms',
    scale: 1.0,
  },
  banyan: {
    asset: 'deciduous',
    filter: 'hue-rotate(-4deg) saturate(1.05)',
    scale: 1.12,
    overlay: 'aerial_roots',
  },
  baobab: {
    // Bulbous bottle trunk drawn underneath, small deciduous crown on top
    asset: 'deciduous',
    filter: 'hue-rotate(20deg) saturate(0.55) brightness(0.95)',
    underlay: 'baobab_trunk',
    yOffset: 22,
    scale: 0.55,
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

// ─── Deterministic positions for fruit/berry overlays ───────────────────────

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededPositions(
  seed: string,
  count: number,
  cx = 50,
  cy = 40,
  rxRange: [number, number] = [5, 27],
  ryScale = 0.7,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  let h = hashSeed(seed)
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    const angle = ((h >>> 0) / 4294967296) * Math.PI * 2
    h = Math.imul(h ^ (h >>> 17), 0x85ebca6b)
    const r = rxRange[0] + ((h >>> 0) / 4294967296) * (rxRange[1] - rxRange[0])
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r * ryScale,
    })
  }
  return points
}

// ─── Underlays (drawn behind the emoji) ─────────────────────────────────────

function SavannaTrunk({ size }: { size: number }) {
  // Thin tall trunk for acacia — connects from ground up to where the
  // raised crown sits.
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <path d="M 47 95 Q 49 65 49 45 L 51 45 Q 51 65 53 95 Z" fill="#8c6a3c" />
      <path d="M 50 95 Q 51 65 51 45 L 51 45 Q 51 65 53 95 Z" fill="#5e4524" opacity={0.6} />
      {/* Branch fork up to canopy */}
      <line
        x1="50"
        y1="48"
        x2="40"
        y2="42"
        stroke="#8c6a3c"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="48"
        x2="60"
        y2="42"
        stroke="#8c6a3c"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  )
}

function BaobabTrunk({ size }: { size: number }) {
  // Wide bulbous bottle trunk for baobab — wide at base AND middle, narrow at top
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <path
        d="M 25 95
           Q 18 75 18 60
           Q 22 50 35 48
           L 65 48
           Q 78 50 82 60
           Q 82 75 75 95
           Z"
        fill="#a78962"
      />
      {/* Highlight bulge on left */}
      <ellipse cx="32" cy="68" rx="6" ry="14" fill="rgba(255,255,255,0.18)" />
      {/* Shadow on right */}
      <path
        d="M 50 95
           L 75 95
           Q 82 75 82 60
           Q 78 50 65 48
           L 50 48
           Z"
        fill="#7a6244"
        opacity={0.4}
      />
      {/* Vertical bark furrows */}
      <path
        d="M 35 95 Q 32 70 36 50"
        stroke="#7a6244"
        strokeWidth={0.7}
        opacity={0.55}
        fill="none"
      />
      <path
        d="M 50 95 Q 50 70 50 50"
        stroke="#7a6244"
        strokeWidth={0.7}
        opacity={0.55}
        fill="none"
      />
      <path
        d="M 65 95 Q 68 70 64 50"
        stroke="#7a6244"
        strokeWidth={0.7}
        opacity={0.55}
        fill="none"
      />
    </svg>
  )
}

// ─── Overlays (drawn over the emoji) ────────────────────────────────────────

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
          <circle cx={p.x + 0.5} cy={p.y + 0.5} r={2.2} fill="rgba(0,0,0,0.3)" />
          <circle cx={p.x} cy={p.y} r={2.1} fill="#c83c3c" />
          <circle cx={p.x - 0.7} cy={p.y - 0.8} r={0.7} fill="rgba(255,255,255,0.7)" />
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
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
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
    </svg>
  )
}

function GlowSparklesOverlay({ seed, size }: { seed: string; size: number }) {
  const sparkles = seededPositions(seed, 11, 50, 40, [3, 26], 0.7)
  return (
    <>
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
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {sparkles.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={1.4} fill="rgba(255,255,255,0.4)" />
            <circle cx={p.x} cy={p.y} r={0.7} fill="#fff4c4" />
          </g>
        ))}
      </svg>
    </>
  )
}

function AcornsOverlay({ seed, size }: { seed: string; size: number }) {
  // Acorns hang at the bottom of the canopy
  const points = seededPositions(seed, 6, 50, 50, [10, 24], 0.5)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {points.map((p, i) => (
        <g key={i}>
          {/* Acorn body */}
          <ellipse cx={p.x} cy={p.y + 1} rx={1.4} ry={1.8} fill="#a7733e" />
          <ellipse cx={p.x - 0.4} cy={p.y + 0.5} rx={0.5} ry={0.9} fill="rgba(255,255,255,0.4)" />
          {/* Acorn cap */}
          <path
            d={`M ${p.x - 1.6} ${p.y - 0.5} Q ${p.x} ${p.y - 1.8} ${p.x + 1.6} ${p.y - 0.5}
                Q ${p.x} ${p.y - 0.2} ${p.x - 1.6} ${p.y - 0.5} Z`}
            fill="#5a3d22"
          />
        </g>
      ))}
    </svg>
  )
}

function FigLeavesOverlay({ seed, size }: { seed: string; size: number }) {
  // Big visible 5-lobed fig leaves poking out around the canopy rim
  const points = seededPositions(seed, 7, 50, 40, [22, 30], 0.7)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {points.map((p, i) => {
        const angle = Math.atan2(p.y - 40, p.x - 50)
        const rot = (angle * 180) / Math.PI
        return (
          <g key={i} transform={`rotate(${rot} ${p.x} ${p.y})`}>
            {/* Stylized 5-lobed leaf */}
            <path
              d={`M ${p.x} ${p.y}
                  Q ${p.x + 2.5} ${p.y - 2.5} ${p.x + 4} ${p.y - 1}
                  Q ${p.x + 5} ${p.y + 0.5} ${p.x + 4} ${p.y + 2}
                  Q ${p.x + 5.5} ${p.y + 3} ${p.x + 4} ${p.y + 4.5}
                  Q ${p.x + 2} ${p.y + 5} ${p.x} ${p.y + 3.5}
                  Z`}
              fill="#4a7c3a"
              stroke="#1f3815"
              strokeWidth={0.3}
            />
            <path
              d={`M ${p.x + 0.5} ${p.y + 1} L ${p.x + 4} ${p.y + 1.5}`}
              stroke="#2a4a1a"
              strokeWidth={0.3}
            />
          </g>
        )
      })}
    </svg>
  )
}

function AerialRootsOverlay({ seed, size }: { seed: string; size: number }) {
  // Banyan's signature: vertical roots descending from canopy to ground
  let h = hashSeed(seed)
  const roots: Array<{ x: number; topY: number; bottomY: number; w: number }> = []
  const count = 5
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    const xOffset = ((h >>> 0) / 4294967296 - 0.5) * 6
    const x = 18 + (i / (count - 1)) * 64 + xOffset
    h = Math.imul(h ^ (h >>> 17), 0x85ebca6b)
    const wiggle = ((h >>> 0) / 4294967296 - 0.5) * 4
    roots.push({
      x,
      topY: 50 + ((h >>> 0) % 8),
      bottomY: 95,
      w: 1.6 + ((h >>> 0) % 100) / 200,
    })
    void wiggle
  }
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {roots.map((r, i) => (
        <g key={i}>
          <line
            x1={r.x + 0.5}
            y1={r.topY}
            x2={r.x + 0.5}
            y2={r.bottomY}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={r.w + 0.3}
            strokeLinecap="round"
          />
          <line
            x1={r.x}
            y1={r.topY}
            x2={r.x}
            y2={r.bottomY}
            stroke="#6a4528"
            strokeWidth={r.w}
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  )
}

function SakuraBlossomsOverlay({ seed, size }: { seed: string; size: number }) {
  // White & soft pink blossom puffs scattered across the (already pink) canopy
  const points = seededPositions(seed, 22, 50, 38, [4, 28], 0.7)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={1.8} fill="rgba(255,255,255,0.55)" />
          <circle cx={p.x - 0.5} cy={p.y - 0.5} r={0.9} fill="#ffffff" />
        </g>
      ))}
    </svg>
  )
}

// ─── Public component ───────────────────────────────────────────────────────

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
  const stageScale = STAGE_SCALE[stage]
  const speciesScale = isSeedling ? 1 : (visual.scale ?? 1)
  const widthScale = isSeedling ? 1 : (visual.widthScale ?? 1)
  const imgSize = size * stageScale * speciesScale
  const imgWidth = imgSize * widthScale
  const yOffset = isSeedling ? 0 : (visual.yOffset ?? 0)
  const yOffsetPx = (yOffset / 100) * size

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
      {/* Underlay (e.g. baobab bottle trunk, acacia thin trunk) */}
      {!isSeedling && visual.underlay === 'savanna_trunk' && <SavannaTrunk size={size} />}
      {!isSeedling && visual.underlay === 'baobab_trunk' && <BaobabTrunk size={size} />}

      {/* The base tree illustration */}
      <img
        src={`/trees/${asset}.svg`}
        width={imgWidth}
        height={imgSize}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: yOffsetPx,
          transform: 'translateX(-50%)',
          filter: isSeedling ? undefined : visual.filter,
        }}
      />

      {/* Per-species decorative overlays — same size and offset as base */}
      {!isSeedling && visual.overlay && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: yOffsetPx,
            transform: 'translateX(-50%)',
            width: imgWidth,
            height: imgSize,
            pointerEvents: 'none',
          }}
        >
          {visual.overlay === 'berries' && <BerriesOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'fruit' && <FruitOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'dates' && <DatesOverlay size={imgSize} />}
          {visual.overlay === 'glow_sparkles' && <GlowSparklesOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'acorns' && <AcornsOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'fig_leaves' && <FigLeavesOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'aerial_roots' && <AerialRootsOverlay seed={seed} size={imgSize} />}
          {visual.overlay === 'sakura_blossoms' && (
            <SakuraBlossomsOverlay seed={seed} size={imgSize} />
          )}
        </div>
      )}
    </div>
  )
}
