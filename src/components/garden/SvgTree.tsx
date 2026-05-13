import { useMemo } from 'react'
import type { TreeSpecies, TreeStage } from '@/lib/database.types'
import { TREE_SPECS, type TreeSpec } from './treeSpecies'

// ─── Deterministic PRNG ──────────────────────────────────────────────────────
// FNV-1a hash → mulberry32. Same id always renders the same tree.

function seededRandom(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Stage scaling ───────────────────────────────────────────────────────────
// Multiplies the visual size of the tree relative to "ancient" full-size.
// A seed is barely a sprout; ancient fills the canvas.

const STAGE_SCALE: Record<TreeStage, number> = {
  seed: 0.18,
  sprout: 0.32,
  sapling: 0.5,
  young: 0.68,
  mature: 0.86,
  ancient: 1.0,
}

const STAGE_FOLIAGE_DENSITY: Record<TreeStage, number> = {
  seed: 0,
  sprout: 1,
  sapling: 2,
  young: 3,
  mature: 4,
  ancient: 5,
}

// ─── Geometry ────────────────────────────────────────────────────────────────
// All trees render into a fixed 100×120 viewBox. Ground line is y=110.

const VB_W = 100
const VB_H = 120
const GROUND_Y = 110

// ─── Family renderers ────────────────────────────────────────────────────────
// Each returns the JSX <g> for a tree, scaled by stage.

interface RenderArgs {
  spec: TreeSpec
  stage: TreeStage
  rand: () => number
  uid: string
}

// Soft elliptical shadow on the ground beneath every tree.
function GroundShadow({ widthScale }: { widthScale: number }) {
  return (
    <ellipse
      cx={VB_W / 2}
      cy={GROUND_Y + 2}
      rx={18 * widthScale}
      ry={2.4}
      fill="rgba(0,0,0,0.18)"
    />
  )
}

// ─── Seed / sprout — universal tiny stage ────────────────────────────────────

function renderSeedling({ spec, stage }: RenderArgs) {
  // Tiny green sprout poking out of brown earth
  const isSeed = stage === 'seed'
  return (
    <g>
      <ellipse cx={VB_W / 2} cy={GROUND_Y} rx={6} ry={1.5} fill={spec.trunkShadow} opacity={0.4} />
      {isSeed ? (
        <>
          {/* Just two tiny cotyledon leaves */}
          <ellipse
            cx={VB_W / 2 - 1.4}
            cy={GROUND_Y - 2}
            rx={1.6}
            ry={1.1}
            fill={spec.foliage}
            transform={`rotate(-20 ${VB_W / 2 - 1.4} ${GROUND_Y - 2})`}
          />
          <ellipse
            cx={VB_W / 2 + 1.4}
            cy={GROUND_Y - 2}
            rx={1.6}
            ry={1.1}
            fill={spec.foliage}
            transform={`rotate(20 ${VB_W / 2 + 1.4} ${GROUND_Y - 2})`}
          />
        </>
      ) : (
        <>
          {/* Small sprout — thin stem with a leaf cluster */}
          <path
            d={`M ${VB_W / 2} ${GROUND_Y} Q ${VB_W / 2 + 0.5} ${GROUND_Y - 5} ${VB_W / 2} ${GROUND_Y - 10}`}
            stroke={spec.trunkBase}
            strokeWidth={1.2}
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx={VB_W / 2 - 2.5} cy={GROUND_Y - 10} rx={3} ry={2} fill={spec.foliageShadow} />
          <ellipse cx={VB_W / 2 + 2.5} cy={GROUND_Y - 10} rx={3} ry={2} fill={spec.foliage} />
          <ellipse cx={VB_W / 2} cy={GROUND_Y - 13} rx={3} ry={2.2} fill={spec.foliageHighlight} />
        </>
      )}
    </g>
  )
}

// ─── Broadleaf — trunk + overlapping foliage blobs ───────────────────────────

function renderBroadleaf({ spec, stage, rand, uid }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 40 * scale
  const trunkW = Math.max(1.5, 4.5 * scale)
  const lean = (rand() - 0.5) * 4 // -2..2 horizontal sway
  const cx = VB_W / 2
  const trunkTop = GROUND_Y - trunkH

  const trunkPath = `
    M ${cx - trunkW / 2} ${GROUND_Y}
    Q ${cx - trunkW / 2 + lean * 0.4} ${GROUND_Y - trunkH * 0.5}
      ${cx - trunkW / 2 + lean * 0.7} ${trunkTop}
    L ${cx + trunkW / 2 + lean * 0.7} ${trunkTop}
    Q ${cx + trunkW / 2 + lean * 0.4} ${GROUND_Y - trunkH * 0.5}
      ${cx + trunkW / 2} ${GROUND_Y}
    Z
  `

  const trunkTopX = cx + lean * 0.7

  // Foliage clusters — varying count by stage
  const density = STAGE_FOLIAGE_DENSITY[stage]
  const clusters: Array<{ cx: number; cy: number; rx: number; ry: number }> = []
  const crownCx = trunkTopX
  const crownCy = trunkTop - 6 * scale
  const crownR = 22 * scale

  // Center crown
  clusters.push({ cx: crownCx, cy: crownCy, rx: crownR, ry: crownR * 0.85 })

  // Additional offset clusters
  for (let i = 0; i < density - 1; i++) {
    const angle = rand() * Math.PI * 2
    const dist = crownR * (0.4 + rand() * 0.5)
    clusters.push({
      cx: crownCx + Math.cos(angle) * dist,
      cy: crownCy + Math.sin(angle) * dist * 0.7,
      rx: crownR * (0.55 + rand() * 0.3),
      ry: crownR * (0.5 + rand() * 0.3),
    })
  }

  // Accents — only mature+
  const showAccents = (stage === 'mature' || stage === 'ancient') && spec.accent
  const accents: Array<{ x: number; y: number; r: number }> = []
  if (showAccents) {
    const accentCount = stage === 'ancient' ? 7 : 5
    for (let i = 0; i < accentCount; i++) {
      const angle = rand() * Math.PI * 2
      const dist = crownR * (0.3 + rand() * 0.6)
      accents.push({
        x: crownCx + Math.cos(angle) * dist,
        y: crownCy + Math.sin(angle) * dist * 0.7,
        r: spec.accent === 'blossom' ? 1.2 : 1.5,
      })
    }
  }

  const glowId = `glow-${uid}`
  const hasGlow = spec.accent === 'glow' && (stage === 'mature' || stage === 'ancient')

  return (
    <g>
      {hasGlow && spec.glow && (
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor={spec.glow} />
            <stop offset="100%" stopColor="rgba(255,233,122,0)" />
          </radialGradient>
        </defs>
      )}
      {hasGlow && <circle cx={crownCx} cy={crownCy} r={crownR * 1.8} fill={`url(#${glowId})`} />}

      {/* Trunk */}
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Trunk shadow stripe (right side) */}
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + trunkW / 2} ${GROUND_Y} L ${cx + trunkW / 2 + lean * 0.7} ${trunkTop} L ${trunkTopX} ${trunkTop} Z`}
        fill={spec.trunkShadow}
        opacity={0.55}
      />

      {/* Foliage: shadow layer (offset down-right), base layer, highlight layer (offset up-left) */}
      {clusters.map((c, i) => (
        <ellipse
          key={`s${i}`}
          cx={c.cx + 1.5}
          cy={c.cy + 1.5}
          rx={c.rx}
          ry={c.ry}
          fill={spec.foliageShadow}
        />
      ))}
      {clusters.map((c, i) => (
        <ellipse key={`b${i}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill={spec.foliage} />
      ))}
      {clusters.map((c, i) => (
        <ellipse
          key={`h${i}`}
          cx={c.cx - c.rx * 0.3}
          cy={c.cy - c.ry * 0.3}
          rx={c.rx * 0.55}
          ry={c.ry * 0.5}
          fill={spec.foliageHighlight}
          opacity={0.7}
        />
      ))}

      {/* Accents (fruits, blossoms, berries) */}
      {accents.map((a, i) => (
        <circle key={`a${i}`} cx={a.x} cy={a.y} r={a.r} fill={spec.accentColor ?? '#fff'} />
      ))}
    </g>
  )
}

// ─── Conifer — trunk + stacked triangles ─────────────────────────────────────

function renderConifer({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 22 * scale
  const trunkW = Math.max(1.5, 3.5 * scale)
  const totalH = 60 * scale
  const cx = VB_W / 2
  const trunkTop = GROUND_Y - trunkH

  const layers = Math.max(2, STAGE_FOLIAGE_DENSITY[stage])
  const layerH = (totalH - trunkH) / layers
  const tips: Array<{ x: number; y: number; w: number }> = []

  for (let i = 0; i < layers; i++) {
    const yBottom = trunkTop - layerH * i + 3
    const yTop = trunkTop - layerH * (i + 1) + 3
    const w = (30 - i * 5) * scale * (0.9 + rand() * 0.2)
    tips.push({ x: cx, y: yTop, w })
    void yBottom
  }

  return (
    <g>
      {/* Trunk */}
      <rect x={cx - trunkW / 2} y={trunkTop} width={trunkW} height={trunkH} fill={spec.trunkBase} />
      <rect
        x={cx}
        y={trunkTop}
        width={trunkW / 2}
        height={trunkH}
        fill={spec.trunkShadow}
        opacity={0.6}
      />

      {/* Stacked triangles, bottom up */}
      {tips.map((t, i) => {
        const yBottom = trunkTop - layerH * i + 3
        const yTop = trunkTop - layerH * (i + 1) + 3
        const w = t.w
        return (
          <g key={i}>
            {/* shadow */}
            <path
              d={`M ${cx - w / 2 + 1} ${yBottom + 1.5} L ${cx + w / 2 + 1} ${yBottom + 1.5} L ${cx + 1} ${yTop + 1.5} Z`}
              fill={spec.foliageShadow}
            />
            {/* base */}
            <path
              d={`M ${cx - w / 2} ${yBottom} L ${cx + w / 2} ${yBottom} L ${cx} ${yTop} Z`}
              fill={spec.foliage}
            />
            {/* highlight on left side */}
            <path
              d={`M ${cx - w / 2} ${yBottom} L ${cx} ${yBottom} L ${cx} ${yTop} Z`}
              fill={spec.foliageHighlight}
              opacity={0.45}
            />
          </g>
        )
      })}
    </g>
  )
}

// ─── Palm — curved trunk + radiating fronds ──────────────────────────────────

function renderPalm({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 50 * scale
  const trunkW = Math.max(1.5, 3.5 * scale)
  const cx = VB_W / 2
  const sway = (rand() - 0.5) * 8
  const trunkTopX = cx + sway
  const trunkTopY = GROUND_Y - trunkH

  // Trunk: curved path with bands
  const trunkPath = `
    M ${cx - trunkW / 2} ${GROUND_Y}
    Q ${cx + sway * 0.3 - trunkW / 2} ${GROUND_Y - trunkH * 0.5}
      ${trunkTopX - trunkW / 2} ${trunkTopY}
    L ${trunkTopX + trunkW / 2} ${trunkTopY}
    Q ${cx + sway * 0.3 + trunkW / 2} ${GROUND_Y - trunkH * 0.5}
      ${cx + trunkW / 2} ${GROUND_Y}
    Z
  `

  const frondCount = Math.max(3, STAGE_FOLIAGE_DENSITY[stage] + 2)
  const frondLen = 22 * scale
  const fronds: Array<{ angle: number; len: number }> = []
  for (let i = 0; i < frondCount; i++) {
    const angle = -Math.PI + (Math.PI * i) / (frondCount - 1)
    fronds.push({ angle, len: frondLen * (0.8 + rand() * 0.3) })
  }

  // Date clusters under crown (mature+)
  const showDates = spec.accent === 'dates' && (stage === 'mature' || stage === 'ancient')

  return (
    <g>
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Bark bands */}
      {Array.from({ length: Math.floor(trunkH / 5) }).map((_, i) => (
        <line
          key={i}
          x1={cx - trunkW / 2 + sway * 0.3 * (1 - i / 10)}
          y1={GROUND_Y - i * 5}
          x2={cx + trunkW / 2 + sway * 0.3 * (1 - i / 10)}
          y2={GROUND_Y - i * 5}
          stroke={spec.trunkShadow}
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}

      {/* Fronds — each is a long curved leaf */}
      {fronds.map((f, i) => {
        const tipX = trunkTopX + Math.cos(f.angle) * f.len
        const tipY = trunkTopY + Math.sin(f.angle) * f.len * 0.6 - 2
        const midX = trunkTopX + Math.cos(f.angle) * f.len * 0.5
        const midY = trunkTopY + Math.sin(f.angle) * f.len * 0.3 - 4
        return (
          <g key={i}>
            <path
              d={`M ${trunkTopX} ${trunkTopY} Q ${midX} ${midY} ${tipX} ${tipY}`}
              stroke={spec.foliageShadow}
              strokeWidth={3.5 * scale}
              strokeLinecap="round"
              fill="none"
              opacity={0.7}
            />
            <path
              d={`M ${trunkTopX} ${trunkTopY} Q ${midX} ${midY} ${tipX} ${tipY}`}
              stroke={spec.foliage}
              strokeWidth={2.5 * scale}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M ${trunkTopX} ${trunkTopY} Q ${midX - 0.5} ${midY - 0.5} ${tipX - 0.5} ${tipY - 0.5}`}
              stroke={spec.foliageHighlight}
              strokeWidth={0.9 * scale}
              strokeLinecap="round"
              fill="none"
              opacity={0.8}
            />
          </g>
        )
      })}

      {showDates &&
        Array.from({ length: 6 }).map((_, i) => (
          <circle
            key={i}
            cx={trunkTopX + (i - 2.5) * 1.4}
            cy={trunkTopY + 2 + Math.abs(i - 2.5) * 0.3}
            r={0.9}
            fill={spec.accentColor ?? '#f1c14a'}
          />
        ))}
    </g>
  )
}

// ─── Umbrella (acacia) — thin trunk + flat wide crown ────────────────────────

function renderUmbrella({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 45 * scale
  const trunkW = Math.max(1, 3 * scale)
  const cx = VB_W / 2
  const trunkTop = GROUND_Y - trunkH
  const lean = (rand() - 0.5) * 3

  const crownW = 38 * scale
  const crownH = 12 * scale
  const crownCy = trunkTop - crownH * 0.3
  const crownCx = cx + lean

  return (
    <g>
      {/* Trunk — thin and slightly curved */}
      <path
        d={`
          M ${cx - trunkW / 2} ${GROUND_Y}
          Q ${cx + lean * 0.4 - trunkW / 2} ${GROUND_Y - trunkH * 0.5}
            ${crownCx - trunkW / 2} ${trunkTop}
          L ${crownCx + trunkW / 2} ${trunkTop}
          Q ${cx + lean * 0.4 + trunkW / 2} ${GROUND_Y - trunkH * 0.5}
            ${cx + trunkW / 2} ${GROUND_Y}
          Z
        `}
        fill={spec.trunkBase}
      />
      {/* Branch splits near the top */}
      <line
        x1={crownCx - trunkW * 1.5}
        y1={trunkTop + 4}
        x2={crownCx}
        y2={trunkTop}
        stroke={spec.trunkBase}
        strokeWidth={1.2 * scale}
      />
      <line
        x1={crownCx + trunkW * 1.5}
        y1={trunkTop + 4}
        x2={crownCx}
        y2={trunkTop}
        stroke={spec.trunkBase}
        strokeWidth={1.2 * scale}
      />

      {/* Flat umbrella canopy — shadow, base, highlight */}
      <ellipse
        cx={crownCx + 1}
        cy={crownCy + 1}
        rx={crownW / 2}
        ry={crownH / 2}
        fill={spec.foliageShadow}
      />
      <ellipse cx={crownCx} cy={crownCy} rx={crownW / 2} ry={crownH / 2} fill={spec.foliage} />
      <ellipse
        cx={crownCx - crownW * 0.15}
        cy={crownCy - crownH * 0.2}
        rx={crownW * 0.3}
        ry={crownH * 0.35}
        fill={spec.foliageHighlight}
        opacity={0.7}
      />
      {/* Texture bumps */}
      {Array.from({ length: 4 }).map((_, i) => {
        const t = (i + 1) / 5
        return (
          <ellipse
            key={i}
            cx={crownCx - crownW / 2 + crownW * t}
            cy={crownCy - crownH * 0.4 - rand() * 1}
            rx={crownW * 0.12}
            ry={crownH * 0.3}
            fill={spec.foliage}
          />
        )
      })}
    </g>
  )
}

// ─── Baobab — thick tapered trunk + small crown ──────────────────────────────

function renderBaobab({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 42 * scale
  const trunkBaseW = 22 * scale
  const trunkTopW = 8 * scale
  const cx = VB_W / 2
  const trunkTop = GROUND_Y - trunkH

  const trunkPath = `
    M ${cx - trunkBaseW / 2} ${GROUND_Y}
    Q ${cx - trunkBaseW * 0.6} ${GROUND_Y - trunkH * 0.4}
      ${cx - trunkTopW / 2} ${trunkTop}
    L ${cx + trunkTopW / 2} ${trunkTop}
    Q ${cx + trunkBaseW * 0.6} ${GROUND_Y - trunkH * 0.4}
      ${cx + trunkBaseW / 2} ${GROUND_Y}
    Z
  `

  // Sparse, angular branches with small foliage tufts
  const branchCount = STAGE_FOLIAGE_DENSITY[stage] + 1
  const branches: Array<{ x: number; y: number; angle: number; len: number }> = []
  for (let i = 0; i < branchCount; i++) {
    const angle = -Math.PI * 0.6 - rand() * Math.PI * 0.4 + (i / branchCount) * Math.PI
    branches.push({
      x: cx + (rand() - 0.5) * trunkTopW,
      y: trunkTop + 1,
      angle,
      len: 14 * scale * (0.7 + rand() * 0.5),
    })
  }

  return (
    <g>
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Trunk shadow on right */}
      <path
        d={`
          M ${cx} ${GROUND_Y}
          L ${cx + trunkBaseW / 2} ${GROUND_Y}
          Q ${cx + trunkBaseW * 0.6} ${GROUND_Y - trunkH * 0.4}
            ${cx + trunkTopW / 2} ${trunkTop}
          L ${cx} ${trunkTop} Z
        `}
        fill={spec.trunkShadow}
        opacity={0.45}
      />
      {/* Vertical bark lines */}
      {Array.from({ length: 4 }).map((_, i) => (
        <line
          key={i}
          x1={cx - trunkBaseW / 2 + (trunkBaseW / 5) * (i + 1)}
          y1={GROUND_Y}
          x2={cx - trunkTopW / 2 + (trunkTopW / 5) * (i + 1)}
          y2={trunkTop}
          stroke={spec.trunkShadow}
          strokeWidth={0.5}
          opacity={0.4}
        />
      ))}

      {/* Branches with foliage tufts */}
      {branches.map((b, i) => {
        const tipX = b.x + Math.cos(b.angle) * b.len
        const tipY = b.y + Math.sin(b.angle) * b.len
        return (
          <g key={i}>
            <line
              x1={b.x}
              y1={b.y}
              x2={tipX}
              y2={tipY}
              stroke={spec.trunkBase}
              strokeWidth={1.2 * scale}
              strokeLinecap="round"
            />
            <ellipse
              cx={tipX + 0.8}
              cy={tipY + 0.8}
              rx={5 * scale}
              ry={3.5 * scale}
              fill={spec.foliageShadow}
            />
            <ellipse cx={tipX} cy={tipY} rx={5 * scale} ry={3.5 * scale} fill={spec.foliage} />
            <ellipse
              cx={tipX - 1.5}
              cy={tipY - 1}
              rx={2.2 * scale}
              ry={1.5 * scale}
              fill={spec.foliageHighlight}
              opacity={0.7}
            />
          </g>
        )
      })}
    </g>
  )
}

// ─── Public component ───────────────────────────────────────────────────────

export interface SvgTreeProps {
  species: TreeSpecies
  stage: TreeStage
  /** Unique id (e.g. tree.id) for deterministic randomness */
  seed: string
  size?: number
  /** Visual scale multiplier on top of stage scale — for thumbnails etc. */
  scaleMul?: number
  ariaLabel?: string
}

export function SvgTree({
  species,
  stage,
  seed,
  size = 120,
  scaleMul = 1,
  ariaLabel,
}: SvgTreeProps) {
  const spec = TREE_SPECS[species]

  const body = useMemo(() => {
    const rand = seededRandom(`${species}-${seed}`)
    const uid = `${species}-${seed}`.replace(/[^a-z0-9]/gi, '')
    const args: RenderArgs = { spec, stage, rand, uid }

    // Tiny stages render the same regardless of family
    if (stage === 'seed' || stage === 'sprout') return renderSeedling(args)

    switch (spec.family) {
      case 'broadleaf':
        return renderBroadleaf(args)
      case 'conifer':
        return renderConifer(args)
      case 'palm':
        return renderPalm(args)
      case 'umbrella':
        return renderUmbrella(args)
      case 'baobab':
        return renderBaobab(args)
    }
  }, [species, stage, seed, spec])

  const widthScale = STAGE_SCALE[stage]
  const aspectH = (size * VB_H) / VB_W

  return (
    <svg
      width={size}
      height={aspectH}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={ariaLabel ?? `${species} ${stage}`}
      style={{ overflow: 'visible' }}
    >
      <g
        transform={
          scaleMul !== 1
            ? `translate(${VB_W / 2} ${GROUND_Y}) scale(${scaleMul}) translate(${-VB_W / 2} ${-GROUND_Y})`
            : undefined
        }
      >
        <GroundShadow widthScale={widthScale} />
        {body}
      </g>
    </svg>
  )
}
