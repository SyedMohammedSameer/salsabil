import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Droplets, Coins } from 'lucide-react-native'
import { HubContent, Muted, Card, Gradient, GradientButton, FadeIn, SectionHeader } from '~/components/ui'
import { GrowHero, HeroAction } from '~/components/GrowHero'
import { SvgTree } from '~/components/garden/SvgTree'
import { useGardenTrees, usePlantTree, useWaterTree } from '@/hooks/useGarden'
import { useProfile } from '@/hooks/useProfile'
import { SPECIES_INFO, XP_THRESHOLDS, computeStage } from '@/lib/api/garden'
import { waterCost, WATER_XP_GAIN } from '@/lib/rewards'
import { cn } from '@/lib/cn'
import type { GardenTree, TreeSpecies, TreeStage } from '@/lib/database.types'

// The Garden section of the Grow hub. Planting and watering use the shared
// useGarden hooks, so watering costs scale by stage exactly as on web.

const STAGE_ORDER: TreeStage[] = ['seed', 'sprout', 'sapling', 'young', 'mature', 'ancient']

function nextThreshold(stage: TreeStage): number | null {
  const i = STAGE_ORDER.indexOf(stage)
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null
  return XP_THRESHOLDS[STAGE_ORDER[i + 1]]
}

function progressOf(tree: GardenTree) {
  const stage = computeStage(tree.xp)
  const target = nextThreshold(stage)
  const floor = XP_THRESHOLDS[stage]
  const pct = target === null ? 1 : Math.min(1, Math.max(0, (tree.xp - floor) / (target - floor)))
  const next = target === null ? null : STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1]
  return { stage, target, pct, next, toGo: target === null ? 0 : target - tree.xp }
}

export default function GardenScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { data: trees, isLoading } = useGardenTrees()
  const { data: profile } = useProfile()
  const plantTree = usePlantTree()
  const waterTree = useWaterTree()
  const [selected, setSelected] = useState<string | null>(null)

  const coins = profile?.coins ?? 0
  const list = trees ?? []
  const newestActive = useMemo(
    () => [...list].filter((t) => t.stage !== 'ancient').sort((a, b) => (a.planted_at < b.planted_at ? 1 : -1))[0] ?? null,
    [list],
  )
  const focus = list.find((t) => t.id === selected) ?? newestActive
  const info = focus ? progressOf(focus) : null
  const cost = focus ? waterCost(info!.stage) : 0
  const ancient = info?.stage === 'ancient'
  const canWater = !!focus && !ancient && coins >= cost && !waterTree.isPending

  const readyCount = list.filter((t) => {
    const p = progressOf(t)
    return p.next && p.toGo <= WATER_XP_GAIN
  }).length

  const plant = (species: TreeSpecies) => {
    const s = SPECIES_INFO[species]
    Alert.alert(
      `Plant ${s.name}?`,
      s.cost === 0 ? 'This one is free.' : `${s.cost} coins from your ${coins}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Plant', onPress: () => plantTree.mutate({ species }) },
      ],
    )
  }

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        <FadeIn index={0}>
          <GrowHero
            eyebrow="My garden"
            title={isLoading ? 'Loading…' : `${list.length} ${list.length === 1 ? 'tree' : 'trees'}`}
            sub={
              focus && info
                ? info.next
                  ? `${SPECIES_INFO[focus.species].name} is ${info.toGo} XP from ${info.next}${readyCount ? ` · ${readyCount} ready to grow a stage` : ''}`
                  : `${SPECIES_INFO[focus.species].name} is fully grown`
                : 'Plant your first tree from the nursery below'
            }
            right={
              focus ? (
                <HeroAction
                  icon={<Droplets size={14} strokeWidth={2.5} color="#115e59" />}
                  disabled={!canWater}
                  onPress={() => waterTree.mutate(focus)}
                >
                  {ancient ? 'Grown' : `Water · ${cost}`}
                </HeroAction>
              ) : undefined
            }
          />
        </FadeIn>

        {/* The scene */}
        <FadeIn index={1}>
          <Card className="p-0">
            <Gradient
              colors={dark ? ['#0a3b38', '#0f4f47', '#123d2c'] : ['#9fdcd0', '#dff5ef', '#cfe8d2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              radius={20}
              style={{ height: 230 }}
            >
              <View
                pointerEvents="none"
                style={{ position: 'absolute', right: 28, top: 22, width: 54, height: 54, borderRadius: 27, backgroundColor: dark ? 'rgba(94,234,212,0.25)' : 'rgba(253,230,138,0.7)' }}
              />
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: '-10%', right: '-10%', bottom: -90, height: 150, borderRadius: 999, backgroundColor: dark ? '#164a36' : '#b9dfbe' }}
              />
              {isLoading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator />
                </View>
              ) : list.length === 0 ? (
                <View className="flex-1 items-center justify-end pb-8">
                  <SvgTree species="olive" stage="sprout" seed="empty" size={90} />
                  <Muted className="text-xs">An empty plot, waiting.</Muted>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 22, minWidth: '100%', justifyContent: 'space-evenly' }}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
                >
                  {list.map((tree) => {
                    const active = focus?.id === tree.id
                    return (
                      <Pressable
                        key={tree.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${SPECIES_INFO[tree.species].name}, ${computeStage(tree.xp)}`}
                        onPress={() => {
                          void Haptics.selectionAsync()
                          setSelected(tree.id)
                        }}
                        className="items-center"
                      >
                        {active ? (
                          <View
                            pointerEvents="none"
                            style={{ position: 'absolute', bottom: -6, width: 86, height: 12, borderRadius: 999, backgroundColor: 'rgba(20,184,166,0.35)' }}
                          />
                        ) : null}
                        <SvgTree species={tree.species} stage={computeStage(tree.xp)} seed={tree.id} size={active ? 112 : 92} />
                      </Pressable>
                    )
                  })}
                </ScrollView>
              )}
            </Gradient>
          </Card>
        </FadeIn>

        {/* Selected tree */}
        {focus && info ? (
          <FadeIn index={2}>
            <Card className="flex-row items-center gap-3 border-noor-300 dark:border-noor-800">
              <SvgTree species={focus.species} stage={info.stage} seed={focus.id} size={56} />
              <View className="min-w-0 flex-1 gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px] font-semibold text-foreground">{SPECIES_INFO[focus.species].name}</Text>
                  <View className="rounded-full bg-noor-500/10 px-2.5 py-0.5">
                    <Text className="text-[11px] font-semibold capitalize text-noor-600 dark:text-noor-400">{info.stage}</Text>
                  </View>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <View className="h-full rounded-full bg-primary" style={{ width: `${info.pct * 100}%` }} />
                </View>
                <View className="flex-row justify-between">
                  <Muted className="text-xs">
                    {info.target === null ? 'Ancient · fully grown' : `${focus.xp} / ${info.target} XP → ${info.next}`}
                  </Muted>
                  <Muted className="text-xs">+{WATER_XP_GAIN} XP per water</Muted>
                </View>
              </View>
            </Card>
          </FadeIn>
        ) : null}

        {focus && !ancient ? (
          <FadeIn index={3}>
            <GradientButton
              icon={<Droplets size={18} color="#ffffff" />}
              disabled={!canWater}
              loading={waterTree.isPending}
              onPress={() => waterTree.mutate(focus)}
            >
              {coins < cost
                ? `Water ${SPECIES_INFO[focus.species].name} · need ${cost - coins} more coins`
                : `Water ${SPECIES_INFO[focus.species].name} · ${cost} coins`}
            </GradientButton>
          </FadeIn>
        ) : null}

        {/* Nursery */}
        <FadeIn index={4}>
          <View className="gap-3">
            <SectionHeader title="Nursery" description="Tap a species to plant it" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 8 }}
              style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
            >
              {(Object.keys(SPECIES_INFO) as TreeSpecies[]).map((species) => {
                const s = SPECIES_INFO[species]
                const affordable = coins >= s.cost
                return (
                  <Pressable
                    key={species}
                    accessibilityRole="button"
                    accessibilityLabel={`Plant ${s.name} for ${s.cost === 0 ? 'free' : `${s.cost} coins`}`}
                    accessibilityState={{ disabled: !affordable }}
                    disabled={!affordable || plantTree.isPending}
                    onPress={() => plant(species)}
                    className={cn('w-[96px] items-center gap-1 rounded-2xl border border-border bg-card px-2 pb-2.5 pt-2', !affordable && 'opacity-40')}
                  >
                    <SvgTree species={species} stage="young" seed={species} size={56} />
                    <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Coins size={10} color={dark ? '#fbbf24' : '#d97706'} />
                      <Text className="text-[10px] font-semibold text-muted-foreground">{s.cost === 0 ? 'Free' : s.cost}</Text>
                    </View>
                  </Pressable>
                )
              })}
              <View style={{ width: 8 }} />
            </ScrollView>
            <Muted className="text-xs">
              Every rewarded action adds XP to your newest tree, so it matures without you paying.
              Watering accelerates it, and costs more as the tree grows: {waterCost('seed')} coins for a
              seed, {waterCost('mature')} for a mature tree.
            </Muted>
          </View>
        </FadeIn>
      </View>
    </HubContent>
  )
}
