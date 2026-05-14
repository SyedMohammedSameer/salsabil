import { useMemo, type ReactElement } from 'react'
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
  sapling: 0.58,
  young: 0.76,
  mature: 0.92,
  ancient: 1.0,
}

// ─── Geometry ────────────────────────────────────────────────────────────────

const VB_W = 100
const VB_H = 120
const GROUND_Y = 112

interface RenderArgs {
  spec: TreeSpec
  stage: TreeStage
  rand: () => number
  uid: string
}

// ─── Shared primitives ───────────────────────────────────────────────────────

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

// A leafy cluster with rim puffs so it reads as leaves, not a balloon.
function LeafyCluster({
  cx,
  cy,
  r,
  spec,
  rand,
  squash = 0.9,
}: {
  cx: number
  cy: number
  r: number
  spec: TreeSpec
  rand: () => number
  squash?: number
}) {
  const puffs: Array<{ x: number; y: number; r: number }> = []
  const puffCount = 5 + Math.floor(rand() * 3)
  for (let i = 0; i < puffCount; i++) {
    const a = (i / puffCount) * Math.PI * 2 + rand() * 0.5
    const dist = r * (0.7 + rand() * 0.25)
    puffs.push({
      x: cx + Math.cos(a) * dist,
      y: cy + Math.sin(a) * dist * squash,
      r: r * (0.32 + rand() * 0.18),
    })
  }
  return (
    <g>
      <ellipse
        cx={cx + 1.2}
        cy={cy + 1.2}
        rx={r * 1.05}
        ry={r * squash}
        fill={spec.foliageShadow}
      />
      {puffs.map((p, i) => (
        <circle key={`ps${i}`} cx={p.x + 0.7} cy={p.y + 0.7} r={p.r} fill={spec.foliageShadow} />
      ))}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * squash} fill={spec.foliage} />
      {puffs.map((p, i) => (
        <circle key={`pb${i}`} cx={p.x} cy={p.y} r={p.r} fill={spec.foliage} />
      ))}
      <ellipse
        cx={cx - r * 0.35}
        cy={cy - r * 0.4}
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
      <ellipse cx={cx} cy={GROUND_Y - 1} rx={9} ry={2.5} fill="#7a5a3a" />
      <ellipse cx={cx} cy={GROUND_Y - 2} rx={7} ry={1.8} fill="#9a7a52" />
      {isSeed ? (
        <>
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

// Generic tapered trunk path
function trunkPath(
  cx: number,
  trunkH: number,
  baseW: number,
  topW: number,
  lean: number,
): { d: string; topX: number; topY: number } {
  const topY = GROUND_Y - trunkH
  const topX = cx + lean
  return {
    d: `
      M ${cx - baseW / 2} ${GROUND_Y}
      Q ${cx - baseW * 0.3 + lean * 0.4} ${GROUND_Y - trunkH * 0.5}
        ${topX - topW / 2} ${topY}
      L ${topX + topW / 2} ${topY}
      Q ${cx + baseW * 0.3 + lean * 0.4} ${GROUND_Y - trunkH * 0.5}
        ${cx + baseW / 2} ${GROUND_Y}
      Z
    `,
    topX,
    topY,
  }
}

function trunkShadow(
  cx: number,
  trunkH: number,
  baseW: number,
  topW: number,
  lean: number,
  color: string,
) {
  const topY = GROUND_Y - trunkH
  const topX = cx + lean
  return (
    <path
      d={`
        M ${cx} ${GROUND_Y} L ${cx + baseW / 2} ${GROUND_Y}
        Q ${cx + baseW * 0.3 + lean * 0.4} ${GROUND_Y - trunkH * 0.5}
          ${topX + topW / 2} ${topY}
        L ${topX} ${topY} Z
      `}
      fill={color}
      opacity={0.55}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECIES RENDERERS — each with its own silhouette
// ═══════════════════════════════════════════════════════════════════════════

// ─── Olive — gnarled twisty trunk, lumpy asymmetric crown ────────────────────

function renderOlive({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 40 * scale
  const baseW = Math.max(3, 8 * scale)
  const topW = Math.max(2, 5 * scale)
  const lean = (rand() - 0.5) * 6
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Olives have multiple gnarled branches splaying out
  const branchCount = stage === 'sapling' ? 2 : stage === 'young' ? 3 : 4
  const branches: Array<{ x1: number; y1: number; x2: number; y2: number; w: number }> = []
  for (let i = 0; i < branchCount; i++) {
    const t = (i + 0.5) / branchCount
    const angle = -Math.PI / 2 + (t - 0.5) * 1.8
    const len = topW * 3.2 * (0.8 + rand() * 0.4)
    branches.push({
      x1: topX,
      y1: topY,
      x2: topX + Math.cos(angle) * len,
      y2: topY + Math.sin(angle) * len,
      w: topW * 0.6,
    })
  }

  // Lumpy asymmetric crown — 3-5 distinct lobes, not one mass
  const lobeCount = stage === 'sapling' ? 3 : stage === 'mature' ? 5 : stage === 'ancient' ? 6 : 4
  const crownR = 18 * scale
  const lobes: Array<{ cx: number; cy: number; r: number }> = []
  for (let i = 0; i < lobeCount; i++) {
    const angle = -Math.PI / 2 + ((i - (lobeCount - 1) / 2) / lobeCount) * 2.4
    const dist = crownR * (0.8 + rand() * 0.4)
    lobes.push({
      cx: topX + Math.cos(angle) * dist,
      cy: topY + Math.sin(angle) * dist * 0.7 - crownR * 0.4,
      r: crownR * (0.7 + rand() * 0.35),
    })
  }

  // Berries (mature+)
  const showAccents = (stage === 'mature' || stage === 'ancient') && spec.accent === 'berries'
  const berries: Array<{ x: number; y: number }> = []
  if (showAccents) {
    const count = stage === 'ancient' ? 18 : 12
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2
      const dist = crownR * (0.4 + rand() * 0.9)
      berries.push({
        x: topX + Math.cos(angle) * dist,
        y: topY - crownR * 0.4 + Math.sin(angle) * dist * 0.6,
      })
    }
  }

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {/* Knot lumps on trunk */}
      {(stage === 'young' || stage === 'mature' || stage === 'ancient') && (
        <>
          <ellipse
            cx={cx - 1}
            cy={GROUND_Y - trunkH * 0.4}
            rx={2}
            ry={1.4}
            fill={spec.trunkShadow}
            opacity={0.5}
          />
          <ellipse
            cx={cx + 1.5}
            cy={GROUND_Y - trunkH * 0.65}
            rx={1.6}
            ry={1.2}
            fill={spec.trunkShadow}
            opacity={0.5}
          />
        </>
      )}
      {branches.map((b, i) => (
        <line
          key={i}
          x1={b.x1}
          y1={b.y1}
          x2={b.x2}
          y2={b.y2}
          stroke={spec.trunkBase}
          strokeWidth={b.w}
          strokeLinecap="round"
        />
      ))}
      {lobes.map((l, i) => (
        <LeafyCluster key={i} cx={l.cx} cy={l.cy} r={l.r} spec={spec} rand={rand} squash={0.85} />
      ))}
      {berries.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={1.1} fill={spec.accentColor ?? '#2c2118'} />
      ))}
    </g>
  )
}

// ─── Acacia — tall thin trunk, FLAT umbrella canopy ──────────────────────────

function renderAcacia({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 65 * scale
  const baseW = Math.max(2, 4.5 * scale)
  const topW = Math.max(1.5, 3 * scale)
  const lean = (rand() - 0.5) * 4
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Branch splits below umbrella
  const splitY = topY + 2

  // Wide flat canopy — much wider than tall
  const crownW = 56 * scale
  const crownH = 12 * scale
  const crownCy = topY - crownH * 0.2

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {/* Branch fork */}
      <line
        x1={topX - crownW * 0.3}
        y1={splitY + 2}
        x2={topX}
        y2={topY}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.7}
        strokeLinecap="round"
      />
      <line
        x1={topX + crownW * 0.3}
        y1={splitY + 2}
        x2={topX}
        y2={topY}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.7}
        strokeLinecap="round"
      />
      <line
        x1={topX - crownW * 0.1}
        y1={splitY + 4}
        x2={topX}
        y2={topY}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.5}
        strokeLinecap="round"
      />
      {/* Flat canopy: shadow */}
      <ellipse
        cx={topX + 1.2}
        cy={crownCy + 1.5}
        rx={crownW / 2}
        ry={crownH / 2}
        fill={spec.foliageShadow}
      />
      {/* Wide base */}
      <ellipse cx={topX} cy={crownCy} rx={crownW / 2} ry={crownH / 2} fill={spec.foliage} />
      {/* Top bumps for texture */}
      {Array.from({ length: 7 }).map((_, i) => {
        const t = i / 6
        const x = topX - crownW / 2 + crownW * t
        const y = crownCy - crownH * 0.55 - rand() * 1.5
        const r = crownW * 0.11 + rand() * 1.4
        return (
          <g key={i}>
            <circle cx={x + 0.6} cy={y + 0.6} r={r} fill={spec.foliageShadow} />
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
      {/* Highlight band on top-left */}
      <ellipse
        cx={topX - crownW * 0.2}
        cy={crownCy - crownH * 0.1}
        rx={crownW * 0.3}
        ry={crownH * 0.3}
        fill={spec.foliageHighlight}
        opacity={0.5}
      />
    </g>
  )
}

// ─── Date Palm — slim banded trunk, drooping arched fronds with leaflets ─────

function renderDatePalm({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 70 * scale
  const baseW = Math.max(2.5, 5.5 * scale)
  const topW = Math.max(2, 4 * scale)
  const sway = (rand() - 0.5) * 5
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, sway)

  const frondCount = stage === 'sapling' ? 5 : stage === 'young' ? 7 : stage === 'mature' ? 9 : 11
  const frondLen = 36 * scale
  const fronds: Array<{ angle: number; len: number; droop: number }> = []
  for (let i = 0; i < frondCount; i++) {
    const angle = -Math.PI + (Math.PI * i) / Math.max(1, frondCount - 1)
    fronds.push({ angle, len: frondLen * (0.85 + rand() * 0.3), droop: 0.4 + rand() * 0.4 })
  }

  const showDates = spec.accent === 'dates' && (stage === 'mature' || stage === 'ancient')

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, sway, spec.trunkShadow)}
      {/* Banded trunk — chevron rings */}
      {Array.from({ length: Math.floor(trunkH / 5) }).map((_, i) => {
        const yLine = GROUND_Y - i * 5 - 3
        const t = i / Math.max(1, trunkH / 5)
        const offset = sway * (1 - t)
        const w = baseW + (topW - baseW) * t
        return (
          <path
            key={i}
            d={`M ${cx - w / 2 + offset + 0.5} ${yLine}
                Q ${cx + offset} ${yLine - 0.8}
                  ${cx + w / 2 + offset - 0.5} ${yLine}`}
            stroke={spec.trunkShadow}
            strokeWidth={0.7}
            opacity={0.7}
            fill="none"
          />
        )
      })}
      {/* Fronds — drooping arches with leaflets */}
      {fronds.map((f, i) => {
        // Frond is a Bezier from trunk top → arc out → droops down
        const upAngle = f.angle
        const peakX = topX + Math.cos(upAngle) * f.len * 0.45
        const peakY = topY + Math.sin(upAngle) * f.len * 0.25 - 7
        const tipX = topX + Math.cos(upAngle) * f.len * 0.95
        const tipY = topY + Math.sin(upAngle) * f.len * 0.4 + 2 + f.droop * 5
        // Sample along the curve for leaflets
        const leaflets: Array<{ x: number; y: number; angle: number; len: number }> = []
        const samples = 8
        for (let j = 1; j <= samples; j++) {
          const t = j / (samples + 1)
          const px = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * peakX + t * t * tipX
          const py = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * peakY + t * t * tipY
          const dx = 2 * (1 - t) * (peakX - topX) + 2 * t * (tipX - peakX)
          const dy = 2 * (1 - t) * (peakY - topY) + 2 * t * (tipY - peakY)
          const tangentLen = Math.hypot(dx, dy) || 1
          const nx = -dy / tangentLen
          const ny = dx / tangentLen
          const ll = 4 * scale * (1 - t * 0.3)
          leaflets.push({ x: px, y: py, angle: Math.atan2(ny, nx), len: ll })
        }
        return (
          <g key={i}>
            {leaflets.map((l, k) => {
              const ax = l.x + Math.cos(l.angle) * l.len * 0.5
              const ay = l.y + Math.sin(l.angle) * l.len * 0.5
              const bx = l.x - Math.cos(l.angle) * l.len * 0.5
              const by = l.y - Math.sin(l.angle) * l.len * 0.5
              return (
                <g key={k}>
                  <line
                    x1={ax + 0.5}
                    y1={ay + 0.5}
                    x2={bx + 0.5}
                    y2={by + 0.5}
                    stroke={spec.foliageShadow}
                    strokeWidth={2.2 * scale}
                    strokeLinecap="round"
                  />
                  <line
                    x1={ax}
                    y1={ay}
                    x2={bx}
                    y2={by}
                    stroke={spec.foliage}
                    strokeWidth={1.7 * scale}
                    strokeLinecap="round"
                  />
                </g>
              )
            })}
            {/* Spine */}
            <path
              d={`M ${topX} ${topY} Q ${peakX} ${peakY} ${tipX} ${tipY}`}
              stroke={spec.foliageHighlight}
              strokeWidth={1 * scale}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )
      })}
      {showDates &&
        Array.from({ length: 10 }).map((_, i) => (
          <circle
            key={i}
            cx={topX + (i - 4.5) * 1.7}
            cy={topY + 3 + Math.abs(i - 4.5) * 0.5}
            r={1.3}
            fill={spec.accentColor ?? '#f1c14a'}
          />
        ))}
    </g>
  )
}

// ─── Pomegranate — SHORT bushy tree with bright red fruits ───────────────────

function renderPomegranate({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  // Shorter than other trees — pomegranates are bush-like
  const trunkH = 22 * scale
  const baseW = Math.max(2.5, 6 * scale)
  const topW = Math.max(2, 4 * scale)
  const lean = (rand() - 0.5) * 3
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Several short branches splitting low
  const branchCount = stage === 'sapling' ? 3 : 5
  const branches: Array<{ angle: number; len: number }> = []
  for (let i = 0; i < branchCount; i++) {
    const angle = -Math.PI / 2 + ((i - (branchCount - 1) / 2) / branchCount) * 2.0
    branches.push({ angle, len: 12 * scale * (0.7 + rand() * 0.4) })
  }

  // Bushy compact crown — wider than tall, dense
  const crownR = 24 * scale
  const crownCy = topY - crownR * 0.7
  const clusterCount = stage === 'sapling' ? 4 : stage === 'young' ? 6 : stage === 'mature' ? 9 : 12
  const clusters: Array<{ cx: number; cy: number; r: number }> = []
  clusters.push({ cx: topX, cy: crownCy, r: crownR * 0.85 })
  for (let i = 0; i < clusterCount; i++) {
    const a = rand() * Math.PI * 2
    const d = crownR * (0.5 + rand() * 0.5)
    clusters.push({
      cx: topX + Math.cos(a) * d * 1.1,
      cy: crownCy + Math.sin(a) * d * 0.6,
      r: crownR * (0.35 + rand() * 0.25),
    })
  }

  // Many bright red fruits — pomegranate's defining feature
  const showFruit = (stage === 'mature' || stage === 'ancient') && spec.accent === 'fruit'
  const fruits: Array<{ x: number; y: number }> = []
  if (showFruit) {
    const count = stage === 'ancient' ? 14 : 10
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2
      const d = crownR * (0.4 + rand() * 0.7)
      fruits.push({
        x: topX + Math.cos(a) * d * 1.1,
        y: crownCy + Math.sin(a) * d * 0.6 + crownR * 0.1,
      })
    }
  }

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {branches.map((b, i) => (
        <line
          key={i}
          x1={topX}
          y1={topY}
          x2={topX + Math.cos(b.angle) * b.len}
          y2={topY + Math.sin(b.angle) * b.len}
          stroke={spec.trunkBase}
          strokeWidth={topW * 0.55}
          strokeLinecap="round"
        />
      ))}
      {clusters.map((c, i) => (
        <LeafyCluster key={i} cx={c.cx} cy={c.cy} r={c.r} spec={spec} rand={rand} squash={0.85} />
      ))}
      {/* Pomegranate fruits: larger with calyx top */}
      {fruits.map((f, i) => (
        <g key={i}>
          <circle cx={f.x + 0.3} cy={f.y + 0.3} r={2.2} fill="#7a1f1f" />
          <circle cx={f.x} cy={f.y} r={2.2} fill={spec.accentColor ?? '#c83c3c'} />
          <circle cx={f.x - 0.7} cy={f.y - 0.7} r={0.8} fill="rgba(255,255,255,0.6)" />
          {/* Crown/calyx */}
          <path
            d={`M ${f.x - 0.8} ${f.y - 1.8} L ${f.x} ${f.y - 2.6} L ${f.x + 0.8} ${f.y - 1.8} Z`}
            fill="#4a1818"
          />
        </g>
      ))}
    </g>
  )
}

// ─── Fig — broad oblate canopy, big leaves, thick gray trunk ─────────────────

function renderFig({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 32 * scale
  const baseW = Math.max(3, 8.5 * scale)
  const topW = Math.max(2.5, 5 * scale)
  const lean = (rand() - 0.5) * 3
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Broad oblate crown — wider than tall
  const crownW = 64 * scale
  const crownH = 38 * scale
  const crownCy = topY - crownH * 0.45

  // Many overlapping clusters arranged in a horizontal oval
  const clusterCount =
    stage === 'sapling' ? 5 : stage === 'young' ? 8 : stage === 'mature' ? 12 : 16
  const clusters: Array<{ cx: number; cy: number; r: number }> = []
  for (let i = 0; i < clusterCount; i++) {
    const a = rand() * Math.PI * 2
    const dx = Math.cos(a) * (crownW / 2) * (0.4 + rand() * 0.55)
    const dy = Math.sin(a) * (crownH / 2) * (0.4 + rand() * 0.55)
    clusters.push({
      cx: topX + dx,
      cy: crownCy + dy,
      r: crownH * (0.25 + rand() * 0.2),
    })
  }
  // Lobed "leaf hint" silhouette accents on rim
  const leafHints: Array<{ x: number; y: number; rot: number }> = []
  if (stage === 'mature' || stage === 'ancient') {
    const count = stage === 'ancient' ? 10 : 7
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand() * 0.3
      leafHints.push({
        x: topX + Math.cos(a) * crownW * 0.42,
        y: crownCy + Math.sin(a) * crownH * 0.42,
        rot: (a * 180) / Math.PI,
      })
    }
  }

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {/* Bark scars */}
      <ellipse
        cx={cx - 1}
        cy={GROUND_Y - trunkH * 0.55}
        rx={1.5}
        ry={1}
        fill={spec.trunkShadow}
        opacity={0.4}
      />
      {/* Main forking branches */}
      <line
        x1={topX}
        y1={topY}
        x2={topX - crownW * 0.25}
        y2={topY - crownH * 0.3}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.5}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX + crownW * 0.25}
        y2={topY - crownH * 0.3}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.5}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX}
        y2={topY - crownH * 0.4}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.5}
        strokeLinecap="round"
      />
      {clusters.map((c, i) => (
        <LeafyCluster key={i} cx={c.cx} cy={c.cy} r={c.r} spec={spec} rand={rand} squash={0.85} />
      ))}
      {/* Lobed leaf hints poking out */}
      {leafHints.map((l, i) => (
        <g key={i} transform={`rotate(${l.rot} ${l.x} ${l.y})`}>
          <path
            d={`M ${l.x} ${l.y}
                Q ${l.x + 2} ${l.y - 2} ${l.x + 3.5} ${l.y}
                Q ${l.x + 3} ${l.y + 1.5} ${l.x + 4.5} ${l.y + 1}
                Q ${l.x + 2.5} ${l.y + 3.5} ${l.x} ${l.y + 2}
                Z`}
            fill={spec.foliageHighlight}
            opacity={0.85}
          />
        </g>
      ))}
    </g>
  )
}

// ─── Pine — tall narrow conifer pyramid ──────────────────────────────────────

function renderPine({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 14 * scale
  const baseW = Math.max(2, 4.5 * scale)
  const topW = Math.max(1.5, 3 * scale)
  const totalH = 88 * scale
  const trunkTopY = GROUND_Y - trunkH
  const maxLayerW = 34 * scale

  const layers = stage === 'sapling' ? 4 : stage === 'young' ? 5 : stage === 'mature' ? 6 : 7
  const layerH = (totalH - trunkH) / layers

  return (
    <g>
      {/* Trunk */}
      <path
        d={`M ${cx - baseW / 2} ${GROUND_Y} L ${cx - topW / 2} ${trunkTopY} L ${cx + topW / 2} ${trunkTopY} L ${cx + baseW / 2} ${GROUND_Y} Z`}
        fill={spec.trunkBase}
      />
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + baseW / 2} ${GROUND_Y} L ${cx + topW / 2} ${trunkTopY} L ${cx} ${trunkTopY} Z`}
        fill={spec.trunkShadow}
        opacity={0.5}
      />
      {/* Layered conifer skirts — bottom to top */}
      {Array.from({ length: layers }).map((_, i) => {
        const t = i / Math.max(1, layers - 1)
        const yBottom = trunkTopY - layerH * i + 4
        const yTop = trunkTopY - layerH * (i + 1) + 4
        const w = maxLayerW * (1 - t * 0.7) * (0.92 + rand() * 0.16)
        const jag: string[] = [`M ${cx - w / 2} ${yBottom}`]
        const steps = 6
        for (let s = 1; s <= steps; s++) {
          const sx = cx - w / 2 + (w * s) / steps
          const sy = yBottom + (s % 2 === 0 ? -1.4 : 1)
          jag.push(`L ${sx} ${sy}`)
        }
        jag.push(`L ${cx + w / 2} ${yBottom} L ${cx} ${yTop} Z`)
        return (
          <g key={i}>
            <g transform="translate(1.2 1.4)">
              <path d={jag.join(' ')} fill={spec.foliageShadow} />
            </g>
            <path d={jag.join(' ')} fill={spec.foliage} />
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

// ─── Cedar — pyramidal, wider with drooping branch tips ──────────────────────

function renderCedar({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 16 * scale
  const baseW = Math.max(2.5, 5.5 * scale)
  const topW = Math.max(2, 3.5 * scale)
  const totalH = 78 * scale
  const trunkTopY = GROUND_Y - trunkH
  // Cedar is wider than pine
  const maxLayerW = 50 * scale

  const layers = stage === 'sapling' ? 4 : stage === 'young' ? 5 : stage === 'mature' ? 6 : 7
  const layerH = (totalH - trunkH) / layers

  return (
    <g>
      <path
        d={`M ${cx - baseW / 2} ${GROUND_Y} L ${cx - topW / 2} ${trunkTopY} L ${cx + topW / 2} ${trunkTopY} L ${cx + baseW / 2} ${GROUND_Y} Z`}
        fill={spec.trunkBase}
      />
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + baseW / 2} ${GROUND_Y} L ${cx + topW / 2} ${trunkTopY} L ${cx} ${trunkTopY} Z`}
        fill={spec.trunkShadow}
        opacity={0.5}
      />
      {/* Wider, flatter layers with downturned tips */}
      {Array.from({ length: layers }).map((_, i) => {
        const t = i / Math.max(1, layers - 1)
        const yBottom = trunkTopY - layerH * i + 5
        const yTop = trunkTopY - layerH * (i + 1) + 5
        const w = maxLayerW * (1 - t * 0.6) * (0.9 + rand() * 0.18)
        // Use a curve with drooping tips
        const d = `
          M ${cx - w / 2} ${yBottom}
          Q ${cx - w / 2 - 1} ${yBottom + 2} ${cx - w / 2 + 1} ${yBottom + 1}
          L ${cx + w / 2 - 1} ${yBottom + 1}
          Q ${cx + w / 2 + 1} ${yBottom + 2} ${cx + w / 2} ${yBottom}
          L ${cx} ${yTop}
          Z
        `
        return (
          <g key={i}>
            <g transform="translate(1 1.5)">
              <path d={d} fill={spec.foliageShadow} />
            </g>
            <path d={d} fill={spec.foliage} />
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

// ─── Oak — VERY thick trunk, massive rounded canopy ──────────────────────────

function renderOak({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 40 * scale
  const baseW = Math.max(4, 11 * scale)
  const topW = Math.max(3, 7 * scale)
  const lean = (rand() - 0.5) * 2
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Massive rounded canopy
  const crownW = 70 * scale
  const crownH = 48 * scale
  const crownCy = topY - crownH * 0.4

  // Many overlapping clusters
  const clusterCount =
    stage === 'sapling' ? 5 : stage === 'young' ? 9 : stage === 'mature' ? 14 : 18
  const clusters: Array<{ cx: number; cy: number; r: number }> = []
  for (let i = 0; i < clusterCount; i++) {
    const a = rand() * Math.PI * 2
    const dx = Math.cos(a) * (crownW / 2) * (0.3 + rand() * 0.65)
    const dy = Math.sin(a) * (crownH / 2) * (0.3 + rand() * 0.65)
    clusters.push({
      cx: topX + dx,
      cy: crownCy + dy,
      r: crownH * (0.28 + rand() * 0.2),
    })
  }

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {/* Heavy bark texture */}
      {Array.from({ length: 4 }).map((_, i) => {
        const t = (i + 0.5) / 4
        const xB = cx - baseW / 2 + baseW * t
        const xT = topX - topW / 2 + topW * t
        return (
          <path
            key={i}
            d={`M ${xB} ${GROUND_Y - 2} Q ${(xB + xT) / 2} ${GROUND_Y - trunkH * 0.55} ${xT} ${topY + 2}`}
            stroke={spec.trunkShadow}
            strokeWidth={0.6}
            opacity={0.5}
            fill="none"
          />
        )
      })}
      {/* Major branches */}
      <line
        x1={topX}
        y1={topY}
        x2={topX - crownW * 0.3}
        y2={topY - crownH * 0.2}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.55}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX + crownW * 0.3}
        y2={topY - crownH * 0.2}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.55}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX - crownW * 0.12}
        y2={topY - crownH * 0.5}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.45}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX + crownW * 0.12}
        y2={topY - crownH * 0.5}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.45}
        strokeLinecap="round"
      />
      {clusters.map((c, i) => (
        <LeafyCluster key={i} cx={c.cx} cy={c.cy} r={c.r} spec={spec} rand={rand} squash={0.85} />
      ))}
    </g>
  )
}

// ─── Lote (Sidra) — round bushy with golden glow ─────────────────────────────

function renderLote({ spec, stage, rand, uid }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 30 * scale
  const baseW = Math.max(3, 7 * scale)
  const topW = Math.max(2.5, 4.5 * scale)
  const lean = (rand() - 0.5) * 3
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  const crownR = 30 * scale
  const crownCy = topY - crownR * 0.6
  const clusterCount =
    stage === 'sapling' ? 4 : stage === 'young' ? 7 : stage === 'mature' ? 11 : 14
  const clusters: Array<{ cx: number; cy: number; r: number }> = []
  clusters.push({ cx: topX, cy: crownCy, r: crownR })
  for (let i = 0; i < clusterCount; i++) {
    const a = rand() * Math.PI * 2
    const d = crownR * (0.5 + rand() * 0.5)
    clusters.push({
      cx: topX + Math.cos(a) * d,
      cy: crownCy + Math.sin(a) * d * 0.75,
      r: crownR * (0.4 + rand() * 0.25),
    })
  }

  const hasGlow = stage === 'mature' || stage === 'ancient'
  const sparkleCount = stage === 'ancient' ? 14 : 9
  const sparkles: Array<{ x: number; y: number; r: number }> = []
  if (hasGlow) {
    for (let i = 0; i < sparkleCount; i++) {
      const a = rand() * Math.PI * 2
      const d = crownR * (0.3 + rand() * 0.8)
      sparkles.push({
        x: topX + Math.cos(a) * d,
        y: crownCy + Math.sin(a) * d * 0.75,
        r: 0.7 + rand() * 0.6,
      })
    }
  }

  const glowId = `glow-${uid}`

  return (
    <g>
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={spec.glow ?? 'rgba(255,233,122,0.45)'} />
          <stop offset="100%" stopColor="rgba(255,233,122,0)" />
        </radialGradient>
      </defs>
      {hasGlow && <circle cx={topX} cy={crownCy} r={crownR * 2.4} fill={`url(#${glowId})`} />}
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {clusters.map((c, i) => (
        <LeafyCluster key={i} cx={c.cx} cy={c.cy} r={c.r} spec={spec} rand={rand} squash={0.9} />
      ))}
      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.r * 1.8} fill="rgba(255,255,255,0.35)" />
          <circle cx={s.x} cy={s.y} r={s.r} fill="#fff4c4" />
        </g>
      ))}
    </g>
  )
}

// ─── Sakura — multi-fork trunk, drooping pink blossom branches ───────────────

function renderSakura({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 30 * scale
  const baseW = Math.max(3, 7 * scale)
  const topW = Math.max(2.5, 5 * scale)
  const lean = (rand() - 0.5) * 2
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Multi-fork: 3-4 main branches reaching outward and upward, then drooping
  const forks = stage === 'sapling' ? 3 : stage === 'mature' ? 5 : stage === 'ancient' ? 6 : 4
  const forkPaths: Array<{ tipX: number; tipY: number; d: string }> = []
  for (let i = 0; i < forks; i++) {
    const t = (i + 0.5) / forks
    const angle = -Math.PI / 2 + (t - 0.5) * 1.8
    const len = 28 * scale * (0.8 + rand() * 0.4)
    const midX = topX + Math.cos(angle) * len * 0.5
    const midY = topY + Math.sin(angle) * len * 0.4 - 4
    const tipX = topX + Math.cos(angle) * len * 0.95
    const tipY = topY + Math.sin(angle) * len * 0.5 + len * 0.2 // droop down
    forkPaths.push({
      tipX,
      tipY,
      d: `M ${topX} ${topY} Q ${midX} ${midY} ${tipX} ${tipY}`,
    })
  }

  // Pink blossom clusters hang at the tip of each branch + along it
  const blossoms: Array<{ x: number; y: number; r: number }> = []
  forkPaths.forEach((f, idx) => {
    // Cluster at tip
    blossoms.push({ x: f.tipX, y: f.tipY, r: 11 * scale })
    // Clusters along the branch
    const along = stage === 'sapling' ? 1 : stage === 'young' ? 2 : 3
    for (let j = 0; j < along; j++) {
      const t = (j + 1) / (along + 2)
      const px = (1 - t) * topX + t * f.tipX + (rand() - 0.5) * 4
      const py = (1 - t) * topY + t * f.tipY + (rand() - 0.5) * 3
      blossoms.push({ x: px, y: py, r: 7 * scale * (0.8 + rand() * 0.3) })
    }
    void idx
  })

  // Petal accents (mature+)
  const showPetals = stage === 'mature' || stage === 'ancient'

  return (
    <g>
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {/* Branches */}
      {forkPaths.map((f, i) => (
        <path
          key={i}
          d={f.d}
          stroke={spec.trunkBase}
          strokeWidth={topW * 0.45}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {/* Blossom clusters */}
      {blossoms.map((b, i) => (
        <LeafyCluster key={i} cx={b.x} cy={b.y} r={b.r} spec={spec} rand={rand} squash={0.95} />
      ))}
      {/* Bright petal highlights */}
      {showPetals &&
        Array.from({ length: stage === 'ancient' ? 16 : 10 }).map((_, i) => {
          const b = blossoms[i % blossoms.length]
          const a = rand() * Math.PI * 2
          const d = b.r * 0.7
          return (
            <g key={i}>
              <circle
                cx={b.x + Math.cos(a) * d}
                cy={b.y + Math.sin(a) * d}
                r={1.6}
                fill="rgba(255,255,255,0.7)"
              />
              <circle cx={b.x + Math.cos(a) * d} cy={b.y + Math.sin(a) * d} r={0.9} fill="#fff" />
            </g>
          )
        })}
    </g>
  )
}

// ─── Banyan — multi-trunk with aerial roots, wide spread ─────────────────────

function renderBanyan({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 38 * scale
  const baseW = Math.max(4, 10 * scale)
  const topW = Math.max(3, 6 * scale)
  const lean = (rand() - 0.5) * 2
  const { d: tp, topX, topY } = trunkPath(cx, trunkH, baseW, topW, lean)

  // Wide spreading canopy
  const crownW = 78 * scale
  const crownH = 36 * scale
  const crownCy = topY - crownH * 0.4

  // Aerial roots descending from canopy to ground (signature feature)
  const showRoots = stage === 'young' || stage === 'mature' || stage === 'ancient'
  const rootCount = stage === 'ancient' ? 7 : stage === 'mature' ? 5 : 3
  const roots: Array<{ x: number; topY: number; bottomY: number; w: number }> = []
  if (showRoots) {
    for (let i = 0; i < rootCount; i++) {
      const tt = (i + 0.5) / rootCount
      const rx = topX + (tt - 0.5) * crownW * 0.9 + (rand() - 0.5) * 4
      const rTopY = crownCy + crownH * 0.3 + rand() * 3
      // Roots stop short of ground for sapling/young (still descending)
      const rBottomY = stage === 'ancient' ? GROUND_Y - rand() * 2 : GROUND_Y - 6 - rand() * 8
      roots.push({ x: rx, topY: rTopY, bottomY: rBottomY, w: 1.5 + rand() * 1 })
    }
  }

  // Many small dense clusters across the wide canopy
  const clusterCount =
    stage === 'sapling' ? 5 : stage === 'young' ? 10 : stage === 'mature' ? 16 : 22
  const clusters: Array<{ cx: number; cy: number; r: number }> = []
  for (let i = 0; i < clusterCount; i++) {
    const a = rand() * Math.PI * 2
    const dx = Math.cos(a) * (crownW / 2) * (0.3 + rand() * 0.7)
    const dy = Math.sin(a) * (crownH / 2) * (0.3 + rand() * 0.7)
    clusters.push({
      cx: topX + dx,
      cy: crownCy + dy,
      r: crownH * (0.22 + rand() * 0.18),
    })
  }

  return (
    <g>
      {/* Aerial roots — drawn behind trunk so they appear to descend from canopy */}
      {roots.map((r, i) => (
        <line
          key={`root${i}`}
          x1={r.x}
          y1={r.topY}
          x2={r.x + (rand() - 0.5) * 2}
          y2={r.bottomY}
          stroke={spec.trunkBase}
          strokeWidth={r.w}
          strokeLinecap="round"
        />
      ))}
      <path d={tp} fill={spec.trunkBase} />
      {trunkShadow(cx, trunkH, baseW, topW, lean, spec.trunkShadow)}
      {/* Spreading branches */}
      <line
        x1={topX}
        y1={topY}
        x2={topX - crownW * 0.35}
        y2={topY - crownH * 0.1}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.5}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX + crownW * 0.35}
        y2={topY - crownH * 0.1}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.5}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX - crownW * 0.15}
        y2={topY - crownH * 0.4}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.4}
        strokeLinecap="round"
      />
      <line
        x1={topX}
        y1={topY}
        x2={topX + crownW * 0.15}
        y2={topY - crownH * 0.4}
        stroke={spec.trunkBase}
        strokeWidth={topW * 0.4}
        strokeLinecap="round"
      />
      {clusters.map((c, i) => (
        <LeafyCluster key={i} cx={c.cx} cy={c.cy} r={c.r} spec={spec} rand={rand} squash={0.85} />
      ))}
    </g>
  )
}

// ─── Baobab — massive bulbous trunk, tiny sparse "upside-down" crown ─────────

function renderBaobab({ spec, stage, rand }: RenderArgs) {
  const scale = STAGE_SCALE[stage]
  const cx = VB_W / 2
  const trunkH = 58 * scale
  const trunkBaseW = 36 * scale
  const trunkMidW = 40 * scale
  const trunkTopW = 14 * scale
  const trunkTop = GROUND_Y - trunkH

  // Massive bottle-shaped trunk (wide at base AND middle)
  const trunkPath = `
    M ${cx - trunkBaseW / 2} ${GROUND_Y}
    Q ${cx - trunkMidW / 2 - 1} ${GROUND_Y - trunkH * 0.3}
      ${cx - trunkMidW / 2} ${GROUND_Y - trunkH * 0.5}
    Q ${cx - trunkTopW * 0.9} ${trunkTop + trunkH * 0.22}
      ${cx - trunkTopW / 2} ${trunkTop}
    L ${cx + trunkTopW / 2} ${trunkTop}
    Q ${cx + trunkTopW * 0.9} ${trunkTop + trunkH * 0.22}
      ${cx + trunkMidW / 2} ${GROUND_Y - trunkH * 0.5}
    Q ${cx + trunkMidW / 2 + 1} ${GROUND_Y - trunkH * 0.3}
      ${cx + trunkBaseW / 2} ${GROUND_Y}
    Z
  `

  // Sparse gnarled branches with small leaf tufts at tips
  const branchCount = stage === 'sapling' ? 3 : stage === 'young' ? 5 : 7
  const branches: Array<{ x1: number; y1: number; x2: number; y2: number; tipR: number }> = []
  for (let i = 0; i < branchCount; i++) {
    const t = i / Math.max(1, branchCount - 1)
    const angle = -Math.PI * 0.9 + t * Math.PI * 0.8 + (rand() - 0.5) * 0.2
    const len = 18 * scale * (0.7 + rand() * 0.5)
    branches.push({
      x1: cx + (rand() - 0.5) * trunkTopW * 0.7,
      y1: trunkTop + 1,
      x2: cx + Math.cos(angle) * len,
      y2: trunkTop + Math.sin(angle) * len,
      tipR: 6 * scale * (0.7 + rand() * 0.4),
    })
  }

  return (
    <g>
      <path d={trunkPath} fill={spec.trunkBase} />
      {/* Highlight bulge on left */}
      <ellipse
        cx={cx - trunkMidW * 0.22}
        cy={GROUND_Y - trunkH * 0.5}
        rx={trunkMidW * 0.16}
        ry={trunkH * 0.32}
        fill="rgba(255,255,255,0.2)"
      />
      {/* Shadow on right */}
      <path
        d={`M ${cx} ${GROUND_Y} L ${cx + trunkBaseW / 2} ${GROUND_Y}
            Q ${cx + trunkMidW / 2 + 1} ${GROUND_Y - trunkH * 0.3}
              ${cx + trunkMidW / 2} ${GROUND_Y - trunkH * 0.5}
            Q ${cx + trunkTopW * 0.9} ${trunkTop + trunkH * 0.22}
              ${cx + trunkTopW / 2} ${trunkTop}
            L ${cx} ${trunkTop} Z`}
        fill={spec.trunkShadow}
        opacity={0.4}
      />
      {/* Vertical bark furrows */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t = (i + 1) / 7
        const xB = cx - trunkBaseW / 2 + trunkBaseW * t
        const xM = cx - trunkMidW / 2 + trunkMidW * t
        const xT = cx - trunkTopW / 2 + trunkTopW * t
        return (
          <path
            key={i}
            d={`M ${xB} ${GROUND_Y} Q ${xM} ${GROUND_Y - trunkH * 0.5} ${xT} ${trunkTop}`}
            stroke={spec.trunkShadow}
            strokeWidth={0.6}
            opacity={0.55}
            fill="none"
          />
        )
      })}
      {/* Sparse gnarled branches with tiny tufts */}
      {branches.map((b, i) => (
        <g key={i}>
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={spec.trunkBase}
            strokeWidth={1.8 * scale}
            strokeLinecap="round"
          />
          <circle cx={b.x2 + 0.6} cy={b.y2 + 0.6} r={b.tipR} fill={spec.foliageShadow} />
          <circle cx={b.x2} cy={b.y2} r={b.tipR} fill={spec.foliage} />
          <circle
            cx={b.x2 - b.tipR * 0.35}
            cy={b.y2 - b.tipR * 0.35}
            r={b.tipR * 0.5}
            fill={spec.foliageHighlight}
            opacity={0.8}
          />
        </g>
      ))}
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Public component
// ═══════════════════════════════════════════════════════════════════════════

export interface SvgTreeProps {
  species: TreeSpecies
  stage: TreeStage
  /** Unique id (e.g. tree.id) for deterministic randomness */
  seed: string
  size?: number
  ariaLabel?: string
}

const SPECIES_RENDERERS: Record<TreeSpecies, (args: RenderArgs) => ReactElement> = {
  olive: renderOlive,
  acacia: renderAcacia,
  date_palm: renderDatePalm,
  pomegranate: renderPomegranate,
  fig: renderFig,
  pine: renderPine,
  cedar: renderCedar,
  oak: renderOak,
  lote: renderLote,
  sakura: renderSakura,
  banyan: renderBanyan,
  baobab: renderBaobab,
}

export function SvgTree({ species, stage, seed, size = 120, ariaLabel }: SvgTreeProps) {
  const spec = TREE_SPECS[species]

  const body = useMemo(() => {
    const rand = seededRandom(`${species}-${seed}`)
    const uid = `${species}-${seed}`.replace(/[^a-z0-9]/gi, '')
    const args: RenderArgs = { spec, stage, rand, uid }
    if (stage === 'seed' || stage === 'sprout') return renderSeedling(args)
    return SPECIES_RENDERERS[species](args)
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
