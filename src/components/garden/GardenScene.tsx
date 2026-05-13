import { useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import type { GardenTree } from '@/lib/database.types'
import { SvgTree } from './SvgTree'

interface GardenSceneProps {
  trees: GardenTree[]
  selectedId?: string
  onSelect: (tree: GardenTree) => void
  /** Height in px of the scene canvas */
  height?: number
}

// Each tree tile reserves this much horizontal space. Bigger trees (mature/
// ancient) get more room so they don't crowd; smaller stages can pack tighter.
const TILE_BASE_PX = 88
const TILE_MIN_PX = 64
const TILE_MAX_PX = 130

function tileWidthFor(stage: GardenTree['stage']) {
  switch (stage) {
    case 'seed':
    case 'sprout':
      return TILE_MIN_PX
    case 'sapling':
      return 76
    case 'young':
      return TILE_BASE_PX
    case 'mature':
      return 110
    case 'ancient':
      return TILE_MAX_PX
  }
}

export function GardenScene({ trees, selectedId, onSelect, height = 280 }: GardenSceneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Stable-ish ordering: by planted_at ascending so older trees stay on the left.
  const ordered = useMemo(
    () =>
      [...trees].sort(
        (a, b) => new Date(a.planted_at).getTime() - new Date(b.planted_at).getTime(),
      ),
    [trees],
  )

  // Auto-scroll to selected tree
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-tree-id="${selectedId}"]`)
    if (el && 'scrollIntoView' in el) {
      ;(el as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [selectedId])

  if (ordered.length === 0) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border"
        style={{
          height,
          background: 'linear-gradient(to bottom, #cfe6f5 0%, #e8f1d8 55%, #c8d8a0 100%)',
        }}
      >
        <GroundLayer />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
          <p className="text-sm font-medium text-foreground/70">No trees this week — yet.</p>
          <p className="text-xs text-foreground/50">Plant one to start growing your garden.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{
        height,
        background: 'linear-gradient(to bottom, #cfe6f5 0%, #e8f1d8 55%, #c8d8a0 100%)',
      }}
    >
      {/* Distant hills */}
      <svg
        className="absolute inset-x-0 top-0 w-full pointer-events-none"
        height={height * 0.55}
        viewBox={`0 0 400 ${Math.round(height * 0.55)}`}
        preserveAspectRatio="none"
      >
        <path
          d={`M 0 ${height * 0.55} L 0 ${height * 0.38}
              Q 80 ${height * 0.3} 160 ${height * 0.36}
              T 320 ${height * 0.34}
              T 400 ${height * 0.38}
              L 400 ${height * 0.55} Z`}
          fill="rgba(155, 187, 144, 0.5)"
        />
        <path
          d={`M 0 ${height * 0.55} L 0 ${height * 0.45}
              Q 100 ${height * 0.38} 200 ${height * 0.44}
              T 400 ${height * 0.42}
              L 400 ${height * 0.55} Z`}
          fill="rgba(132, 168, 122, 0.6)"
        />
      </svg>

      <GroundLayer />

      {/* Trees laid out on a horizontal scroller along the ground */}
      <div
        ref={scrollRef}
        className="absolute inset-x-0 bottom-0 overflow-x-auto overflow-y-hidden"
        style={{ height: height * 0.78, scrollbarWidth: 'thin' }}
      >
        <div className="flex h-full items-end px-4 pb-1 gap-1 min-w-full justify-center">
          {ordered.map((tree) => {
            const tileW = tileWidthFor(tree.stage)
            const isSelected = tree.id === selectedId
            return (
              <button
                key={tree.id}
                data-tree-id={tree.id}
                type="button"
                onClick={() => onSelect(tree)}
                className={cn(
                  'group relative flex-shrink-0 outline-none transition-transform',
                  'hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
                )}
                style={{ width: tileW }}
                aria-label={`${tree.species} — ${tree.stage}, ${tree.xp} XP`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="tree-selection-ring"
                    className="absolute inset-x-2 bottom-0 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
                <div
                  className={cn(
                    'flex flex-col items-center justify-end h-full pb-1',
                    isSelected && 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
                  )}
                >
                  <SvgTree
                    species={tree.species}
                    stage={tree.stage}
                    seed={tree.id}
                    size={tileW}
                    ariaLabel={`${tree.species} ${tree.stage}`}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Ground strip with grass tufts ───────────────────────────────────────────

function GroundLayer() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 w-full pointer-events-none"
      height={56}
      viewBox="0 0 400 56"
      preserveAspectRatio="none"
    >
      {/* Earth strip */}
      <rect x={0} y={20} width={400} height={36} fill="#8a7a52" opacity={0.4} />
      {/* Grass curve over earth */}
      <path d="M 0 20 Q 100 14 200 18 T 400 16 L 400 56 L 0 56 Z" fill="#9bbd6f" />
      <path d="M 0 22 Q 100 18 200 21 T 400 19 L 400 56 L 0 56 Z" fill="#b3cf85" opacity={0.6} />
      {/* Grass tufts */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = (i / 24) * 400 + (i % 3) * 4
        const h = 3 + (i % 4)
        return (
          <path
            key={i}
            d={`M ${x} 20 l -1.2 -${h} M ${x + 0.5} 20 l 0 -${h + 1} M ${x + 1.5} 20 l 1 -${h}`}
            stroke="#6e9b4a"
            strokeWidth={0.6}
            strokeLinecap="round"
            opacity={0.7}
          />
        )
      })}
    </svg>
  )
}
