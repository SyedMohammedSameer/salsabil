import { useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Droplets, Coins, ShoppingBag, X } from 'lucide-react-native'
import { Screen, Muted, Card, Button } from '~/components/ui'
import { SvgTree } from '~/components/garden/SvgTree'
import { useGardenTrees, usePlantTree, useWaterTree } from '@/hooks/useGarden'
import { useProfile } from '@/hooks/useProfile'
import { SPECIES_INFO, XP_THRESHOLDS, computeStage } from '@/lib/api/garden'
import { waterCost, WATER_XP_GAIN } from '@/lib/rewards'
import type { GardenTree, TreeSpecies, TreeStage } from '@/lib/database.types'

// Ported from src/views/garden/GardenView.tsx. Planting and watering use the
// shared useGarden hooks, so watering costs scale by stage exactly as on web.

const STAGE_ORDER: TreeStage[] = ['seed', 'sprout', 'sapling', 'young', 'mature', 'ancient']

function nextThreshold(stage: TreeStage): number | null {
  const i = STAGE_ORDER.indexOf(stage)
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null
  return XP_THRESHOLDS[STAGE_ORDER[i + 1]]
}

function StageBar({ tree }: { tree: GardenTree }) {
  const stage = computeStage(tree.xp)
  const target = nextThreshold(stage)
  const floor = XP_THRESHOLDS[stage]

  if (target === null) {
    return <Muted className="text-[11px]">Ancient — fully grown</Muted>
  }

  const pct = Math.min(1, Math.max(0, (tree.xp - floor) / (target - floor)))

  return (
    <View className="gap-1">
      <View className="h-1.5 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full bg-primary" style={{ width: `${pct * 100}%` }} />
      </View>
      <Muted className="text-[11px]">
        {tree.xp} / {target} XP → {STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1]}
      </Muted>
    </View>
  )
}

export default function GardenScreen() {
  const { data: trees, isLoading } = useGardenTrees()
  const { data: profile } = useProfile()
  const plantTree = usePlantTree()
  const waterTree = useWaterTree()

  const [selected, setSelected] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(false)

  const coins = profile?.coins ?? 0
  const selectedTree = useMemo(
    () => (trees ?? []).find((t) => t.id === selected) ?? null,
    [trees, selected],
  )

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-4">
        <View>
          <Muted>Real effort grows it. Prayers, focus, tasks — all of it.</Muted>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
          <Coins size={14} color="#f59e0b" />
          <Text className="text-sm font-semibold text-foreground">{coins}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : (trees ?? []).length === 0 ? (
        <Card className="items-center gap-3 py-10">
          <SvgTree species="olive" stage="sprout" seed="empty" size={96} />
          <Muted className="text-center">
            Your garden is empty. Plant your first tree to start growing.
          </Muted>
          <Button onPress={() => setShopOpen(true)}>Open the nursery</Button>
        </Card>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {(trees ?? []).map((tree) => {
            const stage = computeStage(tree.xp)
            const active = selected === tree.id
            return (
              <Pressable
                key={tree.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${SPECIES_INFO[tree.species].name}, ${stage}`}
                onPress={() => setSelected(active ? null : tree.id)}
                className="w-[31%] items-center rounded-xl border py-2"
                style={{
                  borderColor: active ? '#14b8a6' : 'transparent',
                  backgroundColor: active ? 'rgba(20,184,166,0.08)' : 'transparent',
                }}
              >
                <SvgTree species={tree.species} stage={stage} seed={tree.id} size={84} />
                <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                  {SPECIES_INFO[tree.species].name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

      {/* Selected tree */}
      {selectedTree ? (
        <Card className="mt-4 gap-3 border-primary/20 bg-primary/5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {SPECIES_INFO[selectedTree.species].name}
              </Text>
              <Muted className="text-xs">{SPECIES_INFO[selectedTree.species].description}</Muted>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setSelected(null)}
              hitSlop={8}
            >
              <X size={16} color="#83938f" />
            </Pressable>
          </View>

          <StageBar tree={selectedTree} />

          {(() => {
            const stage = computeStage(selectedTree.xp)
            const ancient = stage === 'ancient'
            const cost = waterCost(stage)
            const affordable = coins >= cost
            return (
              <>
                <Button
                  variant="outline"
                  disabled={ancient || !affordable || waterTree.isPending}
                  loading={waterTree.isPending}
                  onPress={() => waterTree.mutate(selectedTree)}
                >
                  {ancient
                    ? 'Fully grown'
                    : `Water — ${cost} coins → +${WATER_XP_GAIN} XP`}
                </Button>
                {!ancient && !affordable ? (
                  <Muted className="text-center text-[11px]">
                    Watering a {stage} tree costs {cost} coins. Pray, focus and log tasks to
                    earn more.
                  </Muted>
                ) : null}
              </>
            )
          })()}
        </Card>
      ) : null}

      {/* Nursery */}
      <View className="pt-6">
        <Pressable
          accessibilityRole="button"
          onPress={() => setShopOpen((v) => !v)}
          className="flex-row items-center gap-2 pb-3"
        >
          <ShoppingBag size={16} color="#14b8a6" />
          <Text className="flex-1 text-sm font-medium text-foreground">Nursery</Text>
          <Muted className="text-xs">{shopOpen ? 'Hide' : 'Show'}</Muted>
        </Pressable>

        {shopOpen ? (
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {(Object.keys(SPECIES_INFO) as TreeSpecies[]).map((species) => {
              const info = SPECIES_INFO[species]
              const affordable = coins >= info.cost
              return (
                <Pressable
                  key={species}
                  accessibilityRole="button"
                  accessibilityLabel={`Plant ${info.name} for ${info.cost} coins`}
                  accessibilityState={{ disabled: !affordable }}
                  disabled={!affordable || plantTree.isPending}
                  onPress={() => plantTree.mutate({ species })}
                  className="w-[31%] items-center gap-1 rounded-xl border border-border py-3"
                  style={{ opacity: affordable ? 1 : 0.4 }}
                >
                  <SvgTree species={species} stage="young" seed={species} size={64} />
                  <Text className="text-[10px] text-foreground" numberOfLines={1}>
                    {info.name}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Coins size={10} color="#f59e0b" />
                    <Text className="text-[10px] text-muted-foreground">
                      {info.cost === 0 ? 'Free' : info.cost}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </View>

      <Card className="mt-6 flex-row gap-3">
        <Droplets size={16} color="#60a5fa" />
        <View className="flex-1">
          <Text className="text-xs font-medium text-foreground">How trees grow</Text>
          <Muted className="text-xs">
            Every rewarded action adds XP to your newest tree, so a tree matures without you ever
            paying to water it. Watering just accelerates it — and costs more as the tree matures,
            from {waterCost('seed')} coins for a seed to {waterCost('mature')} for a mature tree.
          </Muted>
        </View>
      </Card>
    </Screen>
  )
}
