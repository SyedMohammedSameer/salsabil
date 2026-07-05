import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Coins, Check, Lock, Sparkles } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RoomScene, FurnitureIcon } from '@/components/world/RoomScene'
import { PixelAvatar } from '@/components/world/PixelAvatar'
import type { Placed } from '@/lib/world/pixel/room'
import { cn } from '@/lib/cn'
import { useProfile } from '@/hooks/useProfile'
import {
  useWorldState,
  useWorldItems,
  useBuyItem,
  useSetEquipped,
  useSetAvatar,
  useSetCustomization,
} from '@/hooks/useWorld'
import {
  ACCESSORIES,
  AVATARS,
  BIOMES,
  CATALOG_BY_KEY,
  itemsForBiome,
  type CatalogItem,
} from '@/data/worldCatalog'
import {
  SKIN_TONES,
  SKIN_ORDER,
  HAIR_COLORS,
  HAIR_ORDER,
  HIJAB_COLORS,
  HIJAB_ORDER,
  type RGBA,
} from '@/lib/world/pixel/palette'
import { levelProgress } from '@/lib/world/levels'
import type { CharacterLook } from '@/lib/world/pixel/draw'
import type { AvatarVariant, WorldItem, WorldState } from '@/lib/database.types'

const rgb = (c: RGBA) => `rgb(${c[0]},${c[1]},${c[2]})`

// Compose the character look from saved state + currently-equipped items.
function buildLook(
  world: WorldState,
  items: WorldItem[],
  overrides: Partial<CharacterLook> = {},
): CharacterLook {
  const eq: Record<string, string> = {}
  for (const it of items) if (it.equipped && it.slot) eq[it.slot] = it.item_key
  return {
    variant: world.avatar_variant,
    skin: world.skin_tone,
    hair: world.hair_color,
    hijab: world.hijab_color,
    outfit: eq.outfit ?? (world.avatar_variant === 'woman' ? 'abaya' : 'thobe'),
    hat: eq.hat,
    face: eq.face,
    held: eq.held,
    companion: eq.companion,
    ...overrides,
  }
}

// ─── Shop item card ───────────────────────────────────────────────────────────

function ItemCard({
  item,
  owned,
  equipped,
  coins,
  baseLook,
  onBuy,
  onToggleEquip,
  busy,
}: {
  item: CatalogItem
  owned: WorldItem | undefined
  equipped: boolean
  coins: number
  baseLook: CharacterLook
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
        'flex flex-col items-center gap-2 overflow-hidden rounded-2xl border p-2.5',
        equipped ? 'border-noor-500/50 bg-noor-500/5' : 'border-border',
      )}
    >
      <div
        className="relative flex w-full items-end justify-center overflow-hidden rounded-xl"
        style={{ height: 96, background: 'linear-gradient(to bottom, #fbe0b8 0%, #f2c48c 100%)' }}
      >
        {isAccessory && item.slot ? (
          <PixelAvatar look={{ ...baseLook, [item.slot]: item.key }} height={104} />
        ) : (
          <FurnitureIcon itemKey={item.key} size={88} />
        )}
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
          {equipped ? 'Worn' : 'Wear'}
        </Button>
      ) : (
        <span className="flex h-7 items-center text-[10px] font-medium text-noor-500">
          In your world
        </span>
      )}
    </motion.div>
  )
}

// ─── Colour swatch row ──────────────────────────────────────────────────────

function Swatches({
  label,
  keys,
  colorOf,
  active,
  onPick,
}: {
  label: string
  keys: readonly string[]
  colorOf: (k: string) => string
  active: string
  onPick: (k: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => onPick(k)}
            aria-label={k}
            className={cn(
              'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
              active === k ? 'border-noor-500 ring-2 ring-noor-500/30' : 'border-border',
            )}
            style={{ background: colorOf(k) }}
          />
        ))}
      </div>
    </div>
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
  const setCustom = useSetCustomization()

  const [tab, setTab] = useState('wear')

  const coins = profile?.coins ?? 0
  const progress = levelProgress(world?.xp ?? 0)
  const characterName = profile?.display_name || profile?.username || 'Your character'

  const ownedByKey = useMemo(() => {
    const map = new Map<string, WorldItem>()
    for (const it of items) map.set(it.item_key, it)
    return map
  }, [items])

  const look = useMemo(() => (world ? buildLook(world, items) : null), [world, items])
  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = []
    for (const it of items) {
      const c = CATALOG_BY_KEY[it.item_key]
      if (c?.category === 'decoration' && c.tile)
        out.push({ key: it.item_key, gx: c.tile.gx, gy: c.tile.gy })
    }
    return out
  }, [items])
  const decorations = world ? itemsForBiome(world.biome) : []
  const ownedCount = items.length
  const totalCount = decorations.length + ACCESSORIES.length
  const busy = buyItem.isPending || setEquipped.isPending

  const renderCard = (item: CatalogItem) =>
    look ? (
      <ItemCard
        key={item.key}
        item={item}
        owned={ownedByKey.get(item.key)}
        equipped={!!ownedByKey.get(item.key)?.equipped}
        coins={coins}
        baseLook={look}
        busy={busy}
        onBuy={(key) => buyItem.mutate(key)}
        onToggleEquip={(o, equip) => setEquipped.mutate({ item: o, equip })}
      />
    ) : null

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
                ? 'Earn coins, then make it yours'
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

        {/* Scene — pixel character in an isometric room */}
        {worldLoading || !world || !look ? (
          <div className="w-full animate-pulse rounded-2xl bg-muted" style={{ height: 240 }} />
        ) : (
          <div
            className="w-full overflow-hidden rounded-2xl border border-border"
            style={{ height: 240 }}
          >
            <RoomScene look={look} placed={placed} animated className="h-full w-full" />
          </div>
        )}

        {/* Level progress */}
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
            <TabsTrigger value="wear" className="flex-1">
              Wardrobe
            </TabsTrigger>
            <TabsTrigger value="decor" className="flex-1">
              Decor
            </TabsTrigger>
            <TabsTrigger value="char" className="flex-1">
              Looks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wear" className="mt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ACCESSORIES.map(renderCard)}
            </div>
          </TabsContent>

          <TabsContent value="decor" className="mt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {decorations.map(renderCard)}
            </div>
          </TabsContent>

          <TabsContent value="char" className="mt-3 space-y-5">
            {/* Character body */}
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">
                {characterName}
                <span className="ml-1 font-normal text-muted-foreground">— that&apos;s you</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {AVATARS.map((a) => {
                  const active = world?.avatar_variant === a.variant
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
                        className="flex h-[116px] w-full items-end justify-center overflow-hidden rounded-xl"
                        style={{ background: 'linear-gradient(to bottom, #fbe0b8, #e8b878)' }}
                      >
                        {look && (
                          <PixelAvatar
                            look={{ ...look, variant: a.variant as AvatarVariant }}
                            height={108}
                          />
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Colours */}
            {world && (
              <div className="space-y-4 rounded-2xl border border-border p-3">
                <Swatches
                  label="Skin tone"
                  keys={SKIN_ORDER}
                  colorOf={(k) => rgb(SKIN_TONES[k].base)}
                  active={world.skin_tone}
                  onPick={(k) => setCustom.mutate({ skin_tone: k })}
                />
                {world.avatar_variant === 'man' ? (
                  <Swatches
                    label="Hair colour"
                    keys={HAIR_ORDER}
                    colorOf={(k) => rgb(HAIR_COLORS[k].base)}
                    active={world.hair_color}
                    onPick={(k) => setCustom.mutate({ hair_color: k })}
                  />
                ) : (
                  <Swatches
                    label="Hijab colour"
                    keys={HIJAB_ORDER}
                    colorOf={(k) => rgb(HIJAB_COLORS[k].base)}
                    active={world.hijab_color}
                    onPick={(k) => setCustom.mutate({ hijab_color: k })}
                  />
                )}
              </div>
            )}

            {/* Biome */}
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
                here to dress your character and fill your world.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  )
}
