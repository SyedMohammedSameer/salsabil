import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Coins, Check, Lock, Sparkles } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { WorldScene } from '@/components/world/WorldScene'
import { ItemPreview } from '@/components/world/sprites'
import { Avatar } from '@/components/world/Avatar'
import { cn } from '@/lib/cn'
import { useProfile } from '@/hooks/useProfile'
import {
  useWorldState,
  useWorldItems,
  useBuyItem,
  useSetEquipped,
  useSetAvatar,
} from '@/hooks/useWorld'
import {
  ACCESSORIES,
  AVATARS,
  BIOMES,
  SLOT_LABELS,
  itemsForBiome,
  type CatalogItem,
} from '@/data/worldCatalog'
import { levelProgress } from '@/lib/world/levels'
import type { AvatarVariant, WorldItem, WorldState } from '@/lib/database.types'

// ─── Shop item card ───────────────────────────────────────────────────────────

function ItemCard({
  item,
  owned,
  equipped,
  coins,
  variant,
  onBuy,
  onToggleEquip,
  busy,
}: {
  item: CatalogItem
  owned: WorldItem | undefined
  equipped: boolean
  coins: number
  variant: AvatarVariant
  onBuy: (key: string) => void
  onToggleEquip: (owned: WorldItem, equip: boolean) => void
  busy: boolean
}) {
  const isOwned = !!owned
  const canAfford = coins >= item.cost
  const isAccessory = item.category === 'accessory'

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border p-2.5 overflow-hidden',
        equipped ? 'border-noor-500/50 bg-noor-500/5' : 'border-border',
      )}
    >
      <div
        className="relative flex w-full items-end justify-center rounded-xl overflow-hidden"
        style={{
          height: 96,
          background: 'linear-gradient(to bottom, #fbe0b8 0%, #f8c48a 55%, #e8b878 100%)',
        }}
      >
        <ItemPreview itemKey={item.key} variant={variant} size={90} />
        {isOwned && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-noor-500 p-0.5 text-white">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>

      <div className="w-full text-center">
        <p className="text-xs font-semibold leading-tight text-foreground">{item.name}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{item.description}</p>
      </div>

      {!isOwned ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full gap-1 text-xs"
          disabled={busy || !canAfford}
          onClick={() => onBuy(item.key)}
        >
          <Coins className="h-3 w-3 text-amber-500" />
          {item.cost}
        </Button>
      ) : isAccessory ? (
        <Button
          size="sm"
          variant={equipped ? 'secondary' : 'outline'}
          className="h-7 w-full text-xs"
          disabled={busy}
          onClick={() => owned && onToggleEquip(owned, !equipped)}
        >
          {equipped ? 'Equipped' : 'Wear'}
        </Button>
      ) : (
        <span className="flex h-7 items-center text-[10px] font-medium text-noor-500">
          In your world
        </span>
      )}
    </motion.div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function WorldView() {
  const { data: profile } = useProfile()
  const { data: world, isLoading: worldLoading } = useWorldState()
  const { data: items = [] } = useWorldItems()
  const buyItem = useBuyItem()
  const setEquipped = useSetEquipped()
  const setAvatar = useSetAvatar()

  const [tab, setTab] = useState('decor')

  const coins = profile?.coins ?? 0
  const variant: AvatarVariant = world?.avatar_variant ?? 'man'
  const progress = levelProgress(world?.xp ?? 0)
  const characterName = profile?.display_name || profile?.username || 'Your character'

  const ownedByKey = useMemo(() => {
    const map = new Map<string, WorldItem>()
    for (const it of items) map.set(it.item_key, it)
    return map
  }, [items])

  const decorations = world ? itemsForBiome(world.biome) : []
  const ownedCount = items.length
  const totalCount = decorations.length + ACCESSORIES.length

  const busy = buyItem.isPending || setEquipped.isPending

  const renderCard = (item: CatalogItem) => {
    const owned = ownedByKey.get(item.key)
    return (
      <ItemCard
        key={item.key}
        item={item}
        owned={owned}
        equipped={!!owned?.equipped}
        coins={coins}
        variant={variant}
        busy={busy}
        onBuy={(key) => buyItem.mutate(key)}
        onToggleEquip={(o, equip) => setEquipped.mutate({ item: o, equip })}
      />
    )
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
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {characterName}&apos;s World
            </h1>
            <p className="text-sm text-muted-foreground">
              {ownedCount === 0
                ? 'Earn coins, then bring your world to life'
                : `${ownedCount} of ${totalCount} things collected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3 text-noor-500" />
              <span className="font-semibold">Lv {progress.level}</span>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Coins className="h-3 w-3 text-amber-500" />
              <span className="font-semibold">{coins}</span>
            </Badge>
          </div>
        </div>

        {/* Scene */}
        {worldLoading || !world ? (
          <div className="w-full rounded-2xl bg-muted animate-pulse" style={{ height: 240 }} />
        ) : (
          <div className="w-full overflow-hidden rounded-2xl border border-border">
            <WorldScene
              world={world as WorldState}
              items={items}
              level={progress.level}
              className="h-[240px] w-full"
            />
          </div>
        )}

        {/* Level progress — driven by real activity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Level {progress.level}</span>
            <span className="text-muted-foreground">
              {progress.intoLevel} / {progress.levelSpan} XP to Lv {progress.level + 1}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-noor-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Every prayer, focus session, task, workout, and challenge grows your world.
          </p>
        </div>

        {/* Shop */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="decor" className="flex-1">
              Decorations
            </TabsTrigger>
            <TabsTrigger value="wear" className="flex-1">
              Wardrobe
            </TabsTrigger>
            <TabsTrigger value="char" className="flex-1">
              Character
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decor" className="mt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {decorations.map(renderCard)}
            </div>
          </TabsContent>

          <TabsContent value="wear" className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              One item per slot: {Object.values(SLOT_LABELS).join(' · ')}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ACCESSORIES.map(renderCard)}
            </div>
          </TabsContent>

          <TabsContent value="char" className="mt-3 space-y-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">
                {characterName}
                <span className="ml-1 font-normal text-muted-foreground">— that&apos;s you</span>
              </p>
              <p className="mb-2 text-xs text-muted-foreground">Choose your character</p>
              <div className="grid grid-cols-2 gap-3">
                {AVATARS.map((a) => {
                  const active = variant === a.variant
                  return (
                    <button
                      key={a.variant}
                      onClick={() => !active && setAvatar.mutate(a.variant)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-2xl border p-3 transition-colors',
                        active
                          ? 'border-noor-500/50 bg-noor-500/5'
                          : 'border-border hover:border-noor-500/30',
                      )}
                    >
                      <div
                        className="flex w-full items-end justify-center rounded-xl overflow-hidden"
                        style={{
                          height: 112,
                          background: 'linear-gradient(to bottom, #fbe0b8, #e8b878)',
                        }}
                      >
                        <svg width={96} height={108} viewBox="-42 -136 84 144">
                          <Avatar variant={a.variant} />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Biome</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BIOMES.map((b) => (
                  <div
                    key={b.key}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 text-xs',
                      b.locked
                        ? 'border-border/50 text-muted-foreground'
                        : 'border-noor-500/50 bg-noor-500/5 text-foreground',
                    )}
                  >
                    {b.locked ? (
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Check className="h-3.5 w-3.5 shrink-0 text-noor-500" />
                    )}
                    <span className="font-medium">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* How it works */}
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-noor-500" />
            <div>
              <p className="text-xs font-medium text-foreground">How your world grows</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Every focus session, prayer, task, workout, and challenge earns coins. Spend them
                here to dress your character and fill your world. More biomes and characters are on
                the way, inshaAllah.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  )
}
