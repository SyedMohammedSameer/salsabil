import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, Droplets, X, ShoppingBag } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GardenScene } from '@/components/garden/GardenScene'
import { WeekSelector } from '@/components/garden/WeekSelector'
import { SvgTree } from '@/components/garden/SvgTree'
import { cn } from '@/lib/cn'
import { useProfile } from '@/hooks/useProfile'
import { useGardenTrees, usePlantTree, useWaterTree } from '@/hooks/useGarden'
import { SPECIES_INFO } from '@/lib/api/garden'
import type { GardenTree, TreeSpecies, TreeStage } from '@/lib/database.types'
import { XP_THRESHOLDS } from '@/lib/api/garden'
import { WATER_COST_COINS, WATER_XP_GAIN } from '@/lib/rewards'
import { endOfWeek, startOfWeek } from '@/lib/weeks'

// ─── Stage progress bar ───────────────────────────────────────────────────────

const STAGE_ORDER: TreeStage[] = ['seed', 'sprout', 'sapling', 'young', 'mature', 'ancient']

function StageBar({ tree }: { tree: GardenTree }) {
  const currentIdx = STAGE_ORDER.indexOf(tree.stage)
  const nextStage = STAGE_ORDER[currentIdx + 1] as TreeStage | undefined
  const nextXP = nextStage ? XP_THRESHOLDS[nextStage] : XP_THRESHOLDS.ancient
  const prevXP = XP_THRESHOLDS[tree.stage]
  const pct = nextStage ? Math.min(((tree.xp - prevXP) / (nextXP - prevXP)) * 100, 100) : 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="capitalize">{tree.stage}</span>
        {nextStage && <span className="capitalize">{nextStage}</span>}
        {!nextStage && <span className="text-amber-500">Ancient</span>}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{tree.xp} XP</p>
    </div>
  )
}

// ─── Selected tree panel ──────────────────────────────────────────────────────

function SelectedTreePanel({
  tree,
  coins,
  onClose,
  onWater,
  watering,
}: {
  tree: GardenTree
  coins: number
  onClose: () => void
  onWater: (id: string) => void
  watering: boolean
}) {
  const info = SPECIES_INFO[tree.species]
  const canAfford = coins >= WATER_COST_COINS
  const isAncient = tree.stage === 'ancient'
  const plantedAt = new Date(tree.planted_at)
  const plantedLabel = plantedAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
    >
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 rounded-xl bg-background/60 p-1">
                <SvgTree
                  species={tree.species}
                  stage={tree.stage}
                  seed={tree.id}
                  size={56}
                  ariaLabel={`${tree.species} ${tree.stage}`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{info.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{info.description}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Planted {plantedLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <StageBar tree={tree} />
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => onWater(tree.id)}
              disabled={watering || !canAfford || isAncient}
            >
              <Droplets className="h-3.5 w-3.5 text-blue-400" />
              {isAncient
                ? 'Fully grown'
                : `Water (−${WATER_COST_COINS} coins → +${WATER_XP_GAIN} XP)`}
            </Button>
            {!isAncient && !canAfford && (
              <p className="text-[10px] text-muted-foreground text-center">
                Earn coins from focus sessions, tasks, workouts, and challenges.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Shop panel ───────────────────────────────────────────────────────────────

const ALL_SPECIES = Object.keys(SPECIES_INFO) as TreeSpecies[]

function ShopPanel({
  coins,
  trees,
  onPlant,
  planting,
}: {
  coins: number
  trees: GardenTree[]
  onPlant: (species: TreeSpecies) => void
  planting: boolean
}) {
  const ownedSpecies = new Set(trees.map((t) => t.species))

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Plant a tree</p>
        <Badge variant="secondary" className="ml-auto gap-1 text-xs">
          <Coins className="h-3 w-3 text-amber-500" />
          {coins} coins
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ALL_SPECIES.map((species) => {
          const info = SPECIES_INFO[species]
          const canAfford = coins >= info.cost
          const alreadyOwn = ownedSpecies.has(species)

          return (
            <motion.button
              key={species}
              onClick={() => !planting && canAfford && onPlant(species)}
              whileTap={canAfford ? { scale: 0.97 } : undefined}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-left transition-colors overflow-hidden',
                canAfford
                  ? 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer'
                  : 'border-border/50 opacity-50 cursor-not-allowed',
              )}
            >
              {/* Mini sky + ground backdrop so dark trunks stay visible on dark mode */}
              <div
                className="relative w-full rounded-xl overflow-hidden flex items-end justify-center"
                style={{
                  height: 108,
                  background: 'linear-gradient(to bottom, #d6e9f3 0%, #e6efd6 60%, #b8cf90 100%)',
                }}
              >
                {/* Grass strip */}
                <svg
                  className="absolute inset-x-0 bottom-0 w-full pointer-events-none"
                  height={18}
                  viewBox="0 0 100 18"
                  preserveAspectRatio="none"
                >
                  <path d="M 0 6 Q 25 4 50 5 T 100 5 L 100 18 L 0 18 Z" fill="#9bbd6f" />
                  <path
                    d="M 0 8 Q 25 6 50 7 T 100 7 L 100 18 L 0 18 Z"
                    fill="#b3cf85"
                    opacity={0.6}
                  />
                </svg>
                <SvgTree
                  species={species}
                  stage="ancient"
                  seed={`shop-${species}`}
                  size={96}
                  ariaLabel={`${info.name} preview`}
                />
              </div>
              <p className="text-xs font-semibold text-foreground text-center leading-tight">
                {info.name}
              </p>
              <div className="flex items-center gap-1">
                {info.cost === 0 ? (
                  <span className="text-[10px] text-emerald-500 font-medium">Free</span>
                ) : (
                  <>
                    <Coins className="h-2.5 w-2.5 text-amber-500" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {info.cost}
                    </span>
                  </>
                )}
                {alreadyOwn && <span className="text-[10px] text-noor-500 ml-1">✓</span>}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function GardenView() {
  const { data: profile } = useProfile()
  const { data: trees = [], isLoading } = useGardenTrees()
  const plantTree = usePlantTree()
  const waterTree = useWaterTree()

  const [selectedTree, setSelectedTree] = useState<GardenTree | null>(null)
  const [showShop, setShowShop] = useState(false)
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

  const coins = profile?.coins ?? 0

  // Trees planted in the selected week (local time).
  const weekTrees = useMemo(() => {
    const start = weekStart.getTime()
    const end = endOfWeek(weekStart).getTime()
    return trees.filter((t) => {
      const planted = new Date(t.planted_at).getTime()
      return planted >= start && planted <= end
    })
  }, [trees, weekStart])

  const handleSelect = (tree: GardenTree) => {
    setSelectedTree((prev) => (prev?.id === tree.id ? null : tree))
    setShowShop(false)
  }

  const handlePlant = (species: TreeSpecies) => {
    plantTree.mutate({ species })
    // Jump back to current week so the user sees the new tree appear.
    setWeekStart(startOfWeek(new Date()))
    setShowShop(false)
  }

  // Deselect if user switches to a week where the selected tree doesn't live.
  if (selectedTree && !weekTrees.find((t) => t.id === selectedTree.id)) {
    setSelectedTree(null)
  }

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">My Garden</h1>
            <p className="text-sm text-muted-foreground">
              {trees.length === 0
                ? 'Plant your first tree to begin'
                : `${trees.length} tree${trees.length === 1 ? '' : 's'} growing in total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Coins className="h-3 w-3 text-amber-500" />
              <span className="font-semibold">{coins}</span>
            </Badge>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setShowShop((p) => !p)
                setSelectedTree(null)
              }}
            >
              <ShoppingBag className="h-4 w-4" />
              Plant
            </Button>
          </div>
        </div>

        {/* Week selector */}
        <WeekSelector
          weekStart={weekStart}
          onChange={(d) => {
            setWeekStart(d)
            setSelectedTree(null)
          }}
          treeCount={weekTrees.length}
        />

        {/* Garden canvas */}
        {isLoading ? (
          <div className="w-full rounded-2xl bg-muted animate-pulse" style={{ height: 280 }} />
        ) : (
          <GardenScene
            trees={weekTrees}
            selectedId={selectedTree?.id}
            onSelect={handleSelect}
            height={280}
          />
        )}

        {/* Click a tree hint */}
        {weekTrees.length > 0 && !selectedTree && !showShop && (
          <p className="text-center text-xs text-muted-foreground/60">
            Tap a tree to see its progress
          </p>
        )}

        {/* Selected tree panel */}
        <AnimatePresence mode="wait">
          {selectedTree && (
            <SelectedTreePanel
              key={selectedTree.id}
              tree={selectedTree}
              coins={coins}
              onClose={() => setSelectedTree(null)}
              onWater={waterTree.mutate}
              watering={waterTree.isPending}
            />
          )}
        </AnimatePresence>

        {/* Shop panel */}
        <AnimatePresence>
          {showShop && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Card>
                <CardContent className="p-4">
                  <ShopPanel
                    coins={coins}
                    trees={trees}
                    onPlant={handlePlant}
                    planting={plantTree.isPending}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* XP tip */}
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-start gap-3">
            <Droplets className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">How trees grow</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real effort grows the garden. Focus sessions, study rooms, completed tasks,
                workouts, and challenges all add XP to your newest tree and earn coins. Spend{' '}
                {WATER_COST_COINS} coins to water any tree for +{WATER_XP_GAIN} XP. Each week gets
                its own scene — browse past weeks with the arrows above.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  )
}
