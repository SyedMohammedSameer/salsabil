import { useEffect, useRef } from 'react'
import 'pixi.js/unsafe-eval'
import { Application, Graphics, Container, Text } from 'pixi.js'
import type { GardenTree, TreeSpecies, TreeStage } from '@/lib/database.types'

// ─── Visual config per species ────────────────────────────────────────────────

const SPECIES_COLORS: Record<TreeSpecies, { trunk: number; crown: number; accent?: number }> = {
  olive: { trunk: 0x5c3d1e, crown: 0x7a9c3a },
  acacia: { trunk: 0x7a5c1e, crown: 0xc8a028 },
  date_palm: { trunk: 0x8b6914, crown: 0x2d8a4e, accent: 0xf5c842 },
  pomegranate: { trunk: 0x5c2010, crown: 0x2e7d32, accent: 0xe53935 },
  fig: { trunk: 0x5c3d1e, crown: 0x4a7c59 },
  pine: { trunk: 0x3d2b0a, crown: 0x2e7d32, accent: 0x1b5e20 },
  cedar: { trunk: 0x4a2c0a, crown: 0x1b5e20, accent: 0x2e7d32 },
  oak: { trunk: 0x4a2c0a, crown: 0x388e3c },
  lote: { trunk: 0x5a4a2a, crown: 0x80cbc4, accent: 0xe0f7fa },
  sakura: { trunk: 0x5c3d1e, crown: 0xf48fb1, accent: 0xfce4ec },
  banyan: { trunk: 0x4a3520, crown: 0x2e7d32, accent: 0x43a047 },
  baobab: { trunk: 0x9e8060, crown: 0x558b2f, accent: 0x8d6e63 },
}

// ─── Visual params per stage ──────────────────────────────────────────────────

interface StageParams {
  trunkW: number
  trunkH: number
  crownR: number
  crownLayers: number // extra overlapping circles for fullness
}

const STAGE_PARAMS: Record<TreeStage, StageParams> = {
  seed: { trunkW: 0, trunkH: 0, crownR: 5, crownLayers: 0 },
  sprout: { trunkW: 2, trunkH: 10, crownR: 7, crownLayers: 0 },
  sapling: { trunkW: 4, trunkH: 22, crownR: 14, crownLayers: 0 },
  young: { trunkW: 6, trunkH: 38, crownR: 22, crownLayers: 1 },
  mature: { trunkW: 9, trunkH: 58, crownR: 32, crownLayers: 2 },
  ancient: { trunkW: 14, trunkH: 82, crownR: 46, crownLayers: 3 },
}

// ─── Draw a single tree ───────────────────────────────────────────────────────

function drawTree(g: Graphics, tree: GardenTree, selected: boolean) {
  const c = SPECIES_COLORS[tree.species]
  const p = STAGE_PARAMS[tree.stage]

  // Selection halo
  if (selected && p.crownR > 0) {
    g.circle(0, -(p.trunkH + p.crownR * 0.6), p.crownR + 10)
    g.fill({ color: 0xfbbf24, alpha: 0.25 })
    g.circle(0, -(p.trunkH + p.crownR * 0.6), p.crownR + 10)
    g.stroke({ color: 0xfbbf24, width: 2 })
  }

  // Ground shadow
  g.ellipse(0, 2, Math.max(p.trunkW * 2, 8), 4)
  g.fill({ color: 0x000000, alpha: 0.25 })

  // Seed stage: just a small mound
  if (tree.stage === 'seed') {
    g.ellipse(0, -3, 8, 5)
    g.fill({ color: c.trunk })
    return
  }

  // Trunk
  g.rect(-p.trunkW / 2, -p.trunkH, p.trunkW, p.trunkH)
  g.fill({ color: c.trunk })

  // Crown layers (back to front for depth)
  const crownCenterY = -(p.trunkH + p.crownR * 0.6)

  if (p.crownLayers >= 2) {
    // Side clusters (back layer)
    g.circle(-p.crownR * 0.55, crownCenterY + p.crownR * 0.1, p.crownR * 0.65)
    g.fill({ color: c.crown })
    g.circle(p.crownR * 0.55, crownCenterY + p.crownR * 0.1, p.crownR * 0.65)
    g.fill({ color: c.crown })
  }

  if (p.crownLayers >= 3) {
    // Extra outer tufts for ancient
    g.circle(-p.crownR * 0.75, crownCenterY + p.crownR * 0.3, p.crownR * 0.5)
    g.fill({ color: c.accent ?? c.crown })
    g.circle(p.crownR * 0.75, crownCenterY + p.crownR * 0.3, p.crownR * 0.5)
    g.fill({ color: c.accent ?? c.crown })
  }

  if (p.crownLayers >= 1) {
    // Lower-mid clusters
    g.circle(-p.crownR * 0.4, crownCenterY + p.crownR * 0.25, p.crownR * 0.72)
    g.fill({ color: c.accent ?? c.crown })
    g.circle(p.crownR * 0.4, crownCenterY + p.crownR * 0.25, p.crownR * 0.72)
    g.fill({ color: c.accent ?? c.crown })
  }

  // Main crown (front, center)
  g.circle(0, crownCenterY, p.crownR)
  g.fill({ color: c.crown })

  // Top highlight for ancient
  if (tree.stage === 'ancient') {
    g.circle(0, crownCenterY - p.crownR * 0.4, p.crownR * 0.45)
    g.fill({ color: c.accent ?? c.crown })
  }
}

// ─── Render full garden scene ─────────────────────────────────────────────────

function renderScene(
  app: Application,
  trees: GardenTree[],
  selectedId: string | null | undefined,
  onSelect: (tree: GardenTree) => void,
) {
  app.stage.removeChildren()

  const { width, height } = app.screen
  const groundY = height * 0.78

  // Sky / background
  const bg = new Graphics()
  bg.rect(0, 0, width, height).fill({ color: 0x0d1a0d })
  app.stage.addChild(bg)

  // Stars (ambient dots for night-garden feel)
  const stars = new Graphics()
  const rng = (seed: number) => (Math.sin(seed * 9301 + 49297) * 233280) % 1
  for (let i = 0; i < 40; i++) {
    const sx = rng(i * 3) * width
    const sy = rng(i * 7) * groundY * 0.85
    const sr = rng(i * 11) < 0.3 ? 1.5 : 1
    stars.circle(sx, sy, sr).fill({ color: 0xffffff, alpha: 0.4 + rng(i) * 0.4 })
  }
  app.stage.addChild(stars)

  // Ground strip
  const ground = new Graphics()
  ground.rect(0, groundY, width, height - groundY).fill({ color: 0x1a3a1a })
  ground.rect(0, groundY, width, 3).fill({ color: 0x2e6b2e })
  app.stage.addChild(ground)

  // Empty state
  if (trees.length === 0) {
    const msg = new Text({
      text: 'Your garden is empty\nPlant your first tree below ↓',
      style: {
        fill: '#4a7c4a',
        fontSize: 13,
        fontFamily: 'system-ui',
        align: 'center',
        lineHeight: 20,
      },
    })
    msg.anchor.set(0.5)
    msg.x = width / 2
    msg.y = groundY / 2
    app.stage.addChild(msg)
    return
  }

  // Sort trees by position_y so ones further back render first (depth effect)
  const sorted = [...trees].sort((a, b) => a.position_y - b.position_y)

  sorted.forEach((tree) => {
    const x = tree.position_x * width
    const treeContainer = new Container()
    treeContainer.x = x
    treeContainer.y = groundY
    treeContainer.eventMode = 'static'
    treeContainer.cursor = 'pointer'
    treeContainer.on('pointerdown', () => onSelect(tree))

    const g = new Graphics()
    drawTree(g, tree, selectedId === tree.id)
    treeContainer.addChild(g)

    // Stage label for seed/sprout (tiny, so otherwise invisible)
    if (tree.stage === 'seed' || tree.stage === 'sprout') {
      const label = new Text({
        text: tree.stage === 'seed' ? '🌱' : '🌿',
        style: { fontSize: 14 },
      })
      label.anchor.set(0.5)
      label.y = -20
      treeContainer.addChild(label)
    }

    app.stage.addChild(treeContainer)
  })
}

// ─── React component ──────────────────────────────────────────────────────────

interface PixiGardenProps {
  trees: GardenTree[]
  selectedId?: string | null
  onSelect: (tree: GardenTree) => void
  height?: number
}

export function PixiGarden({ trees, selectedId, onSelect, height = 320 }: PixiGardenProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  // Keep stable callback ref so the render effect doesn't re-run on every onSelect change
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Init PixiJS app once
  useEffect(() => {
    let mounted = true
    const wrap = wrapRef.current
    if (!wrap) return

    const initApp = async () => {
      const w = wrap.clientWidth || 600

      const app = new Application()
      await app.init({
        width: w,
        height,
        background: 0x0d1a0d,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })

      if (!mounted) {
        app.destroy(true)
        return
      }

      appRef.current = app
      wrap.appendChild(app.canvas)

      renderScene(app, trees, selectedId, (t) => onSelectRef.current(t))
    }

    initApp()

    return () => {
      mounted = false
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render when trees or selection changes
  useEffect(() => {
    if (!appRef.current) return
    renderScene(appRef.current, trees, selectedId, (t) => onSelectRef.current(t))
  }, [trees, selectedId])

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-2xl overflow-hidden cursor-default"
      style={{ height }}
    />
  )
}
