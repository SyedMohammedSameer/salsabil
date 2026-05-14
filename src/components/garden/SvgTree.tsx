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

const STAGE_SCALE: Record<TreeStage, number> = {
  seed: 0.2,
  sprout: 0.36,
  sapling: 0.56,
  young: 0.74,
  mature: 0.9,
  ancient: 1.0,
}

const STAGE_DENSITY: Record<TreeStage, number> = {
  seed: 0,
  sprout: 1,
  sapling: 4,
  young: 7,
  mature: 11,
  ancient: 15,
}

// ─── Geometry ────────────────────────────────────────────────────────────────
// All trees render into a 100×120 viewBox. Ground line at y=112.

const VB_W = 100
const VB_H = 120
const GROUND_Y = 112

interface RenderArgs {
  spec: TreeSpec
  stage: TreeStage
  rand: () => number
  uid: string
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function GroundShadow({ widthScale }: { widthScale: number }) {
  return (
    <ellipse
      cx={VB_W / 2}
      cy={GROUND_Y + 1.5}
      rx={26 * widthScale}
      ry={3.5}
      fill="rgba(0,0,0,0.22)"
    />
  )
}

// A leafy cluster: shadow blob + base blob + 2-3 small leaf bumps + highlight.
function LeafyCluster({
  cx,
  cy,
  r,
  spec,
  rand,
  seedKey,
}: {
  cx: number
  cy: number
  r: number
  spec: TreeSpec
  rand: () => number
  seedKey: string
}) {
  // Small leaf "puffs" around the cluster perimeter so it reads as leaves
  // instead of a flat blob.
  const puffs: Array<{ x: number; y: number; r: number }> = []
  const puffCount = 5 + Math.floor(rand() * 3)
  for (let i = 0; i < puffCount; i++) {
    const a = (i / puffCount) * Math.PI * 2 + rand() * 0.4
    const dist = r * (0.7 + rand() * 0.25)
    puffs.push({
      x: cx + Math.cos(a) * dist,
      y: cy + Math.sin(a) * dist * 0.85,
      r: r * (0.32 + rand() * 0.18),
    })
  }

  return (
    <g key={seedKey}>
      {/* Shadow halo */}
      <ellipse cx={cx + 1.2} cy={cy + 1.2} rx={r * 1.05} ry={r * 0.95} fill={spec.foliageShadow} />
      {puffs.map((p, i) => (
        <circle key={`ps${i}`} cx={p.x + 0.7} cy={p.y + 0.7} r={p.r} fill={spec.foliageShadow} />
      ))}
      {/* Base */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.9} fill={spec.foliage} />
      {puffs.map((p, i) => (
        <circle key={`pb${i}`} cx={p.x} cy={p.y} r={p.r} fill={spec.foliage} />
      ))}
      {/* Highlight (upper-left) */}
      <ellipse
        cx={cx - r * 0.35}
        cy={cy - r * 0.35}
        rx={r * 0.55}
        ry={r * 0.5}
        fill={spec.foliageHighlight}
        opacity={0.8}
      />
      {puffs.slice(0, Math.ceil(puffs.length / 2)).map((p, i) => (
        <circle
          key={`ph${i}`}
          cx={p.x - p.r * 0.3}
          cy={p.y - p.r * 0.3}
          r={p.r * 0.55}
          fill={spec.foliageHighlight}
          opacity={0.65}
        />
      ))}
    </g>
  )
}

// ─── Seed / sprout — universal tiny stage ────────────────────────────────────

function renderSeedling({ spec, stage }: RenderArgs) {
  const isSeed = stage === 'seed'
  const cx = VB_W / 2
  return (
    <g>
      {/* Dirt mound */}
      <ellipse cx={cx} cy={GROUND_Y - 1} rx={9} ry={2.5} fill="#7a5a3a" />
      <ellipse cx={cx} cy={GROUND_Y - 2} rx={7} ry={1.8} fill="#9a7a52" />
      {isSeed ? (
        <>
          {/* Two tiny cotyledon leaves */}
          <ellipse
            cx={cx - 2}
            cy={GROUND_Y - 4}
            rx={2.5}
            ry={1.6}
            fill={spec.foliage}
            transform={`rotate(-25 ${cx - 2} ${GROUND_Y - 4})`}
          />
          <ellipse
            cx={cx + 2}
            cy={GROUND_Y - 4}
            rx={2.5}
            ry={1.6}
            fill={spec.foliage}
            transform={`rotate(25 ${cx + 2} ${GROUND_Y - 4})`}
          />
          <ellipse cx={cx} cy={GROUND_Y - 5} rx={1.5} ry={1} fill={spec.foliageHighlight} />
        </>
      ) : (
        <>
          {/* Sprout — small stem + 3 leaves */}
          <path
            d={`M ${cx} ${GROUND_Y - 2} L ${cx} ${GROUND_Y - 12}`}
            stroke={spec.trunkBase}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <ellipse
            cx={cx - 4}
            cy={GROUND_Y - 9}
            rx={3.5}
            ry={2.2}
            fill={spec.foliage}
            transform={`rotate(-30 ${cx - 4} ${GROUND_Y - 9})`}
          />
          <ellipse
            cx={cx + 4}
            cy={GROUND_Y - 9}
            rx={3.5}
            ry={2.2}
            fill={spec.foliage}
            transform={`rotate(30 ${cx + 4} ${GROUND_Y - 9})`}
          />
          <ellipse cx={cx} cy={GROUND_Y - 14} rx={3.8} ry={2.6} fill={spec.foliage} />
          <ellipse
            cx={cx - 0.8}
            cy={GROUND_Y - 15}
            rx={2.2}
            ry={1.4}
            fill={spec.foliageHighlight}
          />
        </>
      )}
    </g>
  )
}

// ─── Broadleaf — trunk + branches + leafy clusters ───────────────────────────

function renderBroadleaf({ spec, stage, rand, uid }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 52 * scale
  const trunkBaseW = Math.max(2.5, 7 * scale)
  const trunkTopW = Math.max(1.8, 4.5 * scale)
  const lean = (rand() - 0.5) * 4
  const cx = VB_W / 2
  const trunkTopY = GROUND_Y - trunkH
  const trunkTopX = cx + lean * 0.6

  // Trunk path — tapered with slight curve
  const trunkPath = `
    M ${cx - trunkBaseW / 2} ${GROUND_Y}
    Q ${cx - trunkBaseW * 0.35 + lean * 0.3} ${GROUND_Y - trunkH * 0.5}
      ${trunkTopX - trunkTopW / 2} ${trunkTopY}
    L ${trunkTopX + trunkTopW / 2} ${trunkTopY}
    Q ${cx + trunkBaseW * 0.35 + lean * 0.3} ${GROUND_Y - trunkH * 0.5}
      ${cx + trunkBaseW / 2} ${GROUND_Y}
    Z
  `

  // Main branches forking into the canopy (visible on sapling+)
  type Branch = { x1: number; y1: number; x2: number; y2: number; w: number }
  const branches: Branch[] = []
  if (stage !== 'seed' && stage !== 'sprout') {
    const branchCount = stage === 'sapling' ? 2 : stage === 'young' ? 3 : 4
    for (let i = 0; i < branchCount; i++) {
      const t = (i + 0.5) / branchCount
      const angle = -Math.PI / 2 + (t - 0.5) * 1.4 + (rand() - 0.5) * 0.3
      const len = trunkTopW * 2.4 * (0.8 + rand() * 0.4)
      branches.push({
        x1: trunkTopX,
        y1: trunkTopY,
        x2: trunkTopX + Math.cos(angle) * len,
        y2: trunkTopY + Math.sin(angle) * len,
        w: trunkTopW * 0.5,
      })
    }
  }

  // Canopy — multiple overlapping leafy clusters
  const crownR = 34 * scale
  const crownCy = trunkTopY - crownR * 0.55
  const density = STAGE_DENSITY[stage]
  type Cluster = { cx: number; cy: number; r: number }
  const clusters: Cluster[] = []

  // Center anchor cluster (biggest)
  clusters.push({ cx: trunkTopX, cy: crownCy, r: crownR * 0.95 })

  // Surrounding satellite clusters
  for (let i = 0; i < density; i++) {
    const angle = rand() * Math.PI * 2
    // Squash distribution vertically — crowns are wider than tall
    const dist = crownR * (0.5 + rand() * 0.55)
    clusters.push({
      cx: trunkTopX + Math.cos(angle) * dist,
      cy: crownCy + Math.sin(angle) * dist * 0.7,
      r: crownR * (0.4 + rand() * 0.3),
    })
  }

  // Accents (fruits, blossoms, berries)
  const showAccents = (stage === 'mature' || stage === 'ancient') && spec.accent
  const accents: Array<{ x: number; y: number; r: number }> = []
  if (showAccents) {
    const count = stage === 'ancient' ? 14 : 9
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2
      const dist = crownR * (0.3 + rand() * 0.7)
      accents.push({
        x: trunkTopX + Math.cos(angle) * dist,
        y: crownCy + Math.sin(angle) * dist * 0.7,
        r: spec.accent === 'blossom' ? 1.6 : spec.accent === 'berries' ? 1.1 : 1.8,
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
            <stop offset="0%" stopColor={spec.glow} stopOpacity={0.8} />
            <stop offset="100%" stopColor="rgba(255,233,122,0)" />
          </radialGradient>
        </defs>
      )}
      {hasGlow && <circle cx={trunkTopX} cy={crownCy} r={crownR * 2} fill={`url(#${glowId})`} />}

      {/* Trunk */}
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Trunk shadow stripe */}
      <path
        d={`
          M ${cx} ${GROUND_Y}
          L ${cx + trunkBaseW / 2} ${GROUND_Y}
          Q ${cx + trunkBaseW * 0.35 + lean * 0.3} ${GROUND_Y - trunkH * 0.5}
            ${trunkTopX + trunkTopW / 2} ${trunkTopY}
          L ${trunkTopX} ${trunkTopY}
          Z
        `}
        fill={spec.trunkShadow}
        opacity={0.6}
      />
      {/* Bark texture: subtle vertical strokes */}
      {stage !== 'sapling' &&
        stage !== 'seed' &&
        stage !== 'sprout' &&
        Array.from({ length: 3 }).map((_, i) => (
          <path
            key={`bark${i}`}
            d={`M ${cx + (i - 1) * trunkBaseW * 0.25} ${GROUND_Y - 2}
                L ${trunkTopX + (i - 1) * trunkTopW * 0.25} ${trunkTopY + 4}`}
            stroke={spec.trunkShadow}
            strokeWidth={0.4}
            opacity={0.55}
            fill="none"
          />
        ))}

      {/* Branches */}
      {branches.map((b, i) => (
        <line
          key={`br${i}`}
          x1={b.x1}
          y1={b.y1}
          x2={b.x2}
          y2={b.y2}
          stroke={spec.trunkBase}
          strokeWidth={b.w}
          strokeLinecap="round"
        />
      ))}

      {/* Foliage clusters */}
      {clusters.map((c, i) => (
        <LeafyCluster
          key={`cl${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          spec={spec}
          rand={rand}
          seedKey={`${uid}-c${i}`}
        />
      ))}

      {/* Accents */}
      {accents.map((a, i) => (
        <g key={`a${i}`}>
          {spec.accent === 'blossom' && (
            <circle cx={a.x} cy={a.y} r={a.r * 1.4} fill="rgba(255,255,255,0.4)" />
          )}
          <circle cx={a.x} cy={a.y} r={a.r} fill={spec.accentColor ?? '#fff'} />
          <circle
            cx={a.x - a.r * 0.3}
            cy={a.y - a.r * 0.3}
            r={a.r * 0.35}
            fill="rgba(255,255,255,0.6)"
          />
        </g>
      ))}
    </g>
  )
}

// ─── Conifer — trunk + stacked triangular layers ─────────────────────────────

function renderConifer({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 18 * scale
  const trunkBaseW = Math.max(2, 5 * scale)
  const trunkTopW = Math.max(1.5, 3.5 * scale)
  const totalH = 80 * scale
  const cx = VB_W / 2
  const trunkTopY = GROUND_Y - trunkH

  const layers = Math.max(3, Math.floor(STAGE_DENSITY[stage] / 2) + 1)
  const layerH = (totalH - trunkH) / layers
  const baseW = 42 * scale

  return (
    <g>
      {/* Trunk */}
      <path
        d={`
          M ${cx - trunkBaseW / 2} ${GROUND_Y}
          L ${cx - trunkTopW / 2} ${trunkTopY}
          L ${cx + trunkTopW / 2} ${trunkTopY}
          L ${cx + trunkBaseW / 2} ${GROUND_Y}
          Z
        `}
        fill={spec.trunkBase}
      />
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + trunkBaseW / 2} ${GROUND_Y}
            L ${cx + trunkTopW / 2} ${trunkTopY} L ${cx} ${trunkTopY} Z`}
        fill={spec.trunkShadow}
        opacity={0.5}
      />

      {/* Layers bottom-up — each is a "skirt" with jagged bottom */}
      {Array.from({ length: layers }).map((_, i) => {
        const t = i / Math.max(1, layers - 1)
        const yBottom = trunkTopY - layerH * i + 4
        const yTop = trunkTopY - layerH * (i + 1) + 4
        const w = baseW * (1 - t * 0.55) * (0.92 + rand() * 0.16)
        // Build a jagged bottom edge for foliage texture
        const steps = 8
        const jagPath: string[] = [`M ${cx - w / 2} ${yBottom}`]
        for (let s = 1; s <= steps; s++) {
          const sx = cx - w / 2 + (w * s) / steps
          const sy = yBottom + (s % 2 === 0 ? -1.2 : 0.8)
          jagPath.push(`L ${sx} ${sy}`)
        }
        jagPath.push(`L ${cx + w / 2} ${yBottom}`)
        jagPath.push(`L ${cx} ${yTop}`)
        jagPath.push('Z')

        return (
          <g key={i}>
            <g transform="translate(1.2 1.4)">
              <path d={jagPath.join(' ')} fill={spec.foliageShadow} />
            </g>
            <path d={jagPath.join(' ')} fill={spec.foliage} />
            {/* Highlight on left half */}
            <path
              d={`M ${cx - w / 2} ${yBottom} L ${cx} ${yBottom} L ${cx} ${yTop} Z`}
              fill={spec.foliageHighlight}
              opacity={0.4}
            />
          </g>
        )
      })}
    </g>
  )
}

// ─── Palm — curved trunk with banded bark + arched fronds with leaflets ──────

function renderPalm({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 62 * scale
  const trunkBaseW = Math.max(2.5, 5 * scale)
  const trunkTopW = Math.max(2, 4 * scale)
  const cx = VB_W / 2
  const sway = (rand() - 0.5) * 6
  const trunkTopX = cx + sway
  const trunkTopY = GROUND_Y - trunkH

  const trunkPath = `
    M ${cx - trunkBaseW / 2} ${GROUND_Y}
    Q ${cx + sway * 0.3 - trunkBaseW * 0.4} ${GROUND_Y - trunkH * 0.5}
      ${trunkTopX - trunkTopW / 2} ${trunkTopY}
    L ${trunkTopX + trunkTopW / 2} ${trunkTopY}
    Q ${cx + sway * 0.3 + trunkBaseW * 0.4} ${GROUND_Y - trunkH * 0.5}
      ${cx + trunkBaseW / 2} ${GROUND_Y}
    Z
  `

  const frondCount = stage === 'sapling' ? 5 : stage === 'young' ? 7 : stage === 'mature' ? 9 : 11
  const frondLen = 30 * scale
  const fronds: Array<{ angle: number; len: number }> = []
  for (let i = 0; i < frondCount; i++) {
    const angle = -Math.PI + (Math.PI * i) / Math.max(1, frondCount - 1)
    fronds.push({ angle, len: frondLen * (0.85 + rand() * 0.3) })
  }

  const showDates = spec.accent === 'dates' && (stage === 'mature' || stage === 'ancient')

  return (
    <g>
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Trunk shadow */}
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + trunkBaseW / 2} ${GROUND_Y}
            Q ${cx + sway * 0.3 + trunkBaseW * 0.4} ${GROUND_Y - trunkH * 0.5}
              ${trunkTopX + trunkTopW / 2} ${trunkTopY}
            L ${trunkTopX} ${trunkTopY} Z`}
        fill={spec.trunkShadow}
        opacity={0.55}
      />
      {/* Banded bark */}
      {Array.from({ length: Math.floor(trunkH / 5) }).map((_, i) => {
        const yLine = GROUND_Y - i * 5 - 3
        const t = i / Math.max(1, trunkH / 5)
        const offset = sway * 0.3 * (1 - t)
        return (
          <path
            key={i}
            d={`M ${cx - trunkBaseW / 2 + offset + 0.5} ${yLine}
                Q ${cx + offset} ${yLine - 0.6}
                  ${cx + trunkBaseW / 2 + offset - 0.5} ${yLine}`}
            stroke={spec.trunkShadow}
            strokeWidth={0.6}
            opacity={0.7}
            fill="none"
          />
        )
      })}

      {/* Fronds — each is a curved spine with little leaflets */}
      {fronds.map((f, i) => {
        const tipX = trunkTopX + Math.cos(f.angle) * f.len
        const tipY = trunkTopY + Math.sin(f.angle) * f.len * 0.5 - 4
        const midX = trunkTopX + Math.cos(f.angle) * f.len * 0.55
        const midY = trunkTopY + Math.sin(f.angle) * f.len * 0.25 - 6
        // Leaflets perpendicular to the spine
        const leaflets: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
        const leafletCount = 6
        for (let j = 1; j <= leafletCount; j++) {
          const t = j / (leafletCount + 1)
          // Position along the quadratic curve
          const px = (1 - t) * (1 - t) * trunkTopX + 2 * (1 - t) * t * midX + t * t * tipX
          const py = (1 - t) * (1 - t) * trunkTopY + 2 * (1 - t) * t * midY + t * t * tipY
          // Tangent perpendicular
          const tangentAngle = f.angle + Math.PI / 2
          const llen = 3 * scale * (1 - t * 0.4)
          leaflets.push({
            x1: px - Math.cos(tangentAngle) * llen * 0.4,
            y1: py - Math.sin(tangentAngle) * llen * 0.4 - 0.5,
            x2: px + Math.cos(tangentAngle) * llen * 0.4,
            y2: py + Math.sin(tangentAngle) * llen * 0.4 - 0.5,
          })
        }
        return (
          <g key={i}>
            {/* Leaflets shadow */}
            {leaflets.map((l, k) => (
              <line
                key={`ls${k}`}
                x1={l.x1 + 0.5}
                y1={l.y1 + 0.5}
                x2={l.x2 + 0.5}
                y2={l.y2 + 0.5}
                stroke={spec.foliageShadow}
                strokeWidth={2 * scale}
                strokeLinecap="round"
              />
            ))}
            {/* Leaflets */}
            {leaflets.map((l, k) => (
              <line
                key={`l${k}`}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={spec.foliage}
                strokeWidth={1.6 * scale}
                strokeLinecap="round"
              />
            ))}
            {/* Spine */}
            <path
              d={`M ${trunkTopX} ${trunkTopY} Q ${midX} ${midY} ${tipX} ${tipY}`}
              stroke={spec.foliageHighlight}
              strokeWidth={1 * scale}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )
      })}

      {/* Date clusters */}
      {showDates &&
        Array.from({ length: 8 }).map((_, i) => (
          <circle
            key={i}
            cx={trunkTopX + (i - 3.5) * 1.6}
            cy={trunkTopY + 3 + Math.abs(i - 3.5) * 0.4}
            r={1.2}
            fill={spec.accentColor ?? '#f1c14a'}
          />
        ))}
    </g>
  )
}

// ─── Umbrella (acacia) — thin tall trunk + flat wide crown ───────────────────

function renderUmbrella({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 58 * scale
  const trunkW = Math.max(1.5, 4 * scale)
  const cx = VB_W / 2
  const trunkTop = GROUND_Y - trunkH
  const lean = (rand() - 0.5) * 4

  const crownW = 52 * scale
  const crownH = 18 * scale
  const crownCy = trunkTop - crownH * 0.4
  const crownCx = cx + lean

  return (
    <g>
      {/* Trunk */}
      <path
        d={`
          M ${cx - trunkW / 2} ${GROUND_Y}
          Q ${cx + lean * 0.3 - trunkW / 2} ${GROUND_Y - trunkH * 0.5}
            ${crownCx - trunkW / 2} ${trunkTop}
          L ${crownCx + trunkW / 2} ${trunkTop}
          Q ${cx + lean * 0.3 + trunkW / 2} ${GROUND_Y - trunkH * 0.5}
            ${cx + trunkW / 2} ${GROUND_Y}
          Z
        `}
        fill={spec.trunkBase}
      />
      {/* Trunk shadow */}
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + trunkW / 2} ${GROUND_Y}
            Q ${cx + lean * 0.3 + trunkW / 2} ${GROUND_Y - trunkH * 0.5}
              ${crownCx + trunkW / 2} ${trunkTop}
            L ${crownCx} ${trunkTop} Z`}
        fill={spec.trunkShadow}
        opacity={0.5}
      />
      {/* Branch splits below crown */}
      <line
        x1={crownCx - crownW * 0.25}
        y1={trunkTop + 4}
        x2={crownCx}
        y2={trunkTop}
        stroke={spec.trunkBase}
        strokeWidth={1.5 * scale}
        strokeLinecap="round"
      />
      <line
        x1={crownCx + crownW * 0.25}
        y1={trunkTop + 4}
        x2={crownCx}
        y2={trunkTop}
        stroke={spec.trunkBase}
        strokeWidth={1.5 * scale}
        strokeLinecap="round"
      />

      {/* Crown made of overlapping bump clusters along a flat plane */}
      <ellipse
        cx={crownCx + 1}
        cy={crownCy + 1.5}
        rx={crownW / 2}
        ry={crownH / 2}
        fill={spec.foliageShadow}
      />
      <ellipse cx={crownCx} cy={crownCy} rx={crownW / 2} ry={crownH / 2} fill={spec.foliage} />
      {Array.from({ length: 6 }).map((_, i) => {
        const t = i / 5
        const x = crownCx - crownW / 2 + crownW * t
        const y = crownCy - crownH * 0.5 - rand() * 1.5
        const r = crownW * 0.13 + rand() * 1.5
        return (
          <g key={i}>
            <circle cx={x + 0.5} cy={y + 0.6} r={r} fill={spec.foliageShadow} />
            <circle cx={x} cy={y} r={r} fill={spec.foliage} />
            <circle
              cx={x - r * 0.3}
              cy={y - r * 0.3}
              r={r * 0.5}
              fill={spec.foliageHighlight}
              opacity={0.75}
            />
          </g>
        )
      })}
    </g>
  )
}

// ─── Baobab — massive bulbous trunk + sparse branches with tufts ─────────────

function renderBaobab({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const trunkH = 54 * scale
  const trunkBaseW = 32 * scale
  const trunkMidW = 36 * scale
  const trunkTopW = 12 * scale
  const cx = VB_W / 2
  const trunkTop = GROUND_Y - trunkH

  // Bulging trunk: wide at base AND middle, narrowing at top
  const trunkPath = `
    M ${cx - trunkBaseW / 2} ${GROUND_Y}
    Q ${cx - trunkMidW / 2} ${GROUND_Y - trunkH * 0.35}
      ${cx - trunkMidW / 2 + 1} ${GROUND_Y - trunkH * 0.55}
    Q ${cx - trunkTopW * 0.8} ${trunkTop + trunkH * 0.2}
      ${cx - trunkTopW / 2} ${trunkTop}
    L ${cx + trunkTopW / 2} ${trunkTop}
    Q ${cx + trunkTopW * 0.8} ${trunkTop + trunkH * 0.2}
      ${cx + trunkMidW / 2 - 1} ${GROUND_Y - trunkH * 0.55}
    Q ${cx + trunkMidW / 2} ${GROUND_Y - trunkH * 0.35}
      ${cx + trunkBaseW / 2} ${GROUND_Y}
    Z
  `

  const branchCount = stage === 'sapling' ? 2 : stage === 'young' ? 3 : 5
  const branches: Array<{ x: number; y: number; angle: number; len: number }> = []
  for (let i = 0; i < branchCount; i++) {
    const angle = -Math.PI * 0.85 + (i / Math.max(1, branchCount - 1)) * Math.PI * 0.7
    branches.push({
      x: cx + (rand() - 0.5) * trunkTopW,
      y: trunkTop + 1,
      angle,
      len: 18 * scale * (0.7 + rand() * 0.5),
    })
  }

  return (
    <g>
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Bulge highlight (left) */}
      <ellipse
        cx={cx - trunkMidW * 0.2}
        cy={GROUND_Y - trunkH * 0.5}
        rx={trunkMidW * 0.18}
        ry={trunkH * 0.3}
        fill="rgba(255,255,255,0.18)"
      />
      {/* Trunk shadow (right) */}
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + trunkBaseW / 2} ${GROUND_Y}
            Q ${cx + trunkMidW / 2} ${GROUND_Y - trunkH * 0.35}
              ${cx + trunkMidW / 2 - 1} ${GROUND_Y - trunkH * 0.55}
            Q ${cx + trunkTopW * 0.8} ${trunkTop + trunkH * 0.2}
              ${cx + trunkTopW / 2} ${trunkTop}
            L ${cx} ${trunkTop} Z`}
        fill={spec.trunkShadow}
        opacity={0.4}
      />
      {/* Vertical bark furrows */}
      {Array.from({ length: 5 }).map((_, i) => {
        const t = (i + 1) / 6
        const xB = cx - trunkBaseW / 2 + trunkBaseW * t
        const xM = cx - trunkMidW / 2 + trunkMidW * t
        const xT = cx - trunkTopW / 2 + trunkTopW * t
        return (
          <path
            key={i}
            d={`M ${xB} ${GROUND_Y} Q ${xM} ${GROUND_Y - trunkH * 0.5} ${xT} ${trunkTop}`}
            stroke={spec.trunkShadow}
            strokeWidth={0.6}
            opacity={0.5}
            fill="none"
          />
        )
      })}

      {/* Branches with foliage tufts */}
      {branches.map((b, i) => {
        const tipX = b.x + Math.cos(b.angle) * b.len
        const tipY = b.y + Math.sin(b.angle) * b.len
        const tuftR = 7 * scale * (0.8 + rand() * 0.3)
        return (
          <g key={i}>
            <line
              x1={b.x}
              y1={b.y}
              x2={tipX}
              y2={tipY}
              stroke={spec.trunkBase}
              strokeWidth={1.6 * scale}
              strokeLinecap="round"
            />
            {/* Tuft: 3 small leaf bumps */}
            <circle cx={tipX + 0.8} cy={tipY + 0.8} r={tuftR} fill={spec.foliageShadow} />
            <circle cx={tipX} cy={tipY} r={tuftR} fill={spec.foliage} />
            <circle
              cx={tipX - tuftR * 0.4}
              cy={tipY - tuftR * 0.4}
              r={tuftR * 0.5}
              fill={spec.foliageHighlight}
              opacity={0.8}
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
  ariaLabel?: string
}

export function SvgTree({ species, stage, seed, size = 120, ariaLabel }: SvgTreeProps) {
  const spec = TREE_SPECS[species]

  const body = useMemo(() => {
    const rand = seededRandom(`${species}-${seed}`)
    const uid = `${species}-${seed}`.replace(/[^a-z0-9]/gi, '')
    const args: RenderArgs = { spec, stage, rand, uid }

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
      <GroundShadow widthScale={widthScale} />
      {body}
    </svg>
  )
}
