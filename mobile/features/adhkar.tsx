import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Check, Coins, Sunrise, Sunset, Hand, RotateCcw } from 'lucide-react-native'
import { HubContent, Muted, Card, GradientButton, FadeIn } from '~/components/ui'
import { useAdhkarLogs, useLogAdhkarComplete } from '@/hooks/useAdhkar'
import { localDateString } from '@/lib/dates'
import { ADHKAR_SETS, ADHKAR_SET_LABELS, type AdhkarSet, type AdhkarItem } from '@/data/adhkar'
import { ADHKAR_COINS } from '@/lib/rewards'
import { cn } from '@/lib/cn'

// The Adhkar section of the Deen hub. Each dhikr is a tap-to-count card with
// a progress ring; completing a set logs it through the shared hook, which
// awards the coins once per day via the idempotent ledger. The text itself
// comes from the shared src/data/adhkar.ts, so both platforms recite the same
// set.

const SET_ICON: Record<AdhkarSet, typeof Sunrise> = {
  morning: Sunrise,
  evening: Sunset,
  after_prayer: Hand,
}

// ─── Ring ────────────────────────────────────────────────────────────────────

function CountRing({ progress, total, dark }: { progress: number; total: number; dark: boolean }) {
  const size = 60
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const done = progress >= total
  const pct = total > 0 ? Math.min(1, progress / total) : 0
  const color = done ? '#10b981' : '#14b8a6'
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={dark ? '#192320' : '#eff3f2'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {done ? (
        <Check size={20} strokeWidth={2.5} color={color} />
      ) : (
        <View className="items-center">
          <Text className="text-[15px] font-bold leading-[18px] text-foreground">{progress}</Text>
          <Text className="text-[9px] font-medium text-muted-foreground">of {total}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Dhikr card ──────────────────────────────────────────────────────────────

function DhikrCard({
  item,
  progress,
  onTap,
  onReset,
  dark,
}: {
  item: AdhkarItem
  progress: number
  onTap: () => void
  onReset: () => void
  dark: boolean
}) {
  const done = progress >= item.count
  const started = progress > 0 && !done
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.translation}. ${progress} of ${item.count} recited. Tap to count.`}
      accessibilityHint="Long press to reset the count"
      disabled={done}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onTap()
      }}
      onLongPress={() => {
        if (progress === 0) return
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        onReset()
      }}
      style={({ pressed }) => (pressed && !done ? { transform: [{ scale: 0.985 }] } : undefined)}
    >
      <Card
        className={cn('flex-row items-center gap-3.5', started && 'border-noor-300 dark:border-noor-700')}
      >
        <View className="min-w-0 flex-1 gap-2">
          <Text
            className="text-right text-[22px] leading-10 text-foreground"
            style={{ writingDirection: 'rtl', fontFamily: 'Amiri' }}
          >
            {item.arabic}
          </Text>
          {item.transliteration ? (
            <Text className="text-[13px] italic text-muted-foreground">{item.transliteration}</Text>
          ) : null}
          <Text className="text-[13px] leading-5 text-foreground/85">{item.translation}</Text>
          <View className="flex-row items-center justify-between">
            {item.source ? <Muted className="text-[11px]">{item.source}</Muted> : <View />}
            {item.count > 1 ? <Muted className="text-[11px]">{item.count} times</Muted> : null}
          </View>
        </View>
        <View className="items-center gap-1">
          <CountRing progress={progress} total={item.count} dark={dark} />
          {progress > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset count"
              hitSlop={8}
              onPress={onReset}
              className="flex-row items-center gap-1"
            >
              <RotateCcw size={11} color="#8a9793" />
              <Text className="text-[10px] text-muted-foreground">reset</Text>
            </Pressable>
          ) : (
            <Text className="text-[10px] text-muted-foreground">tap</Text>
          )}
        </View>
      </Card>
    </Pressable>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AdhkarScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()
  const [set, setSet] = useState<AdhkarSet>(() => (new Date().getHours() < 14 ? 'morning' : 'evening'))
  // Counts are per-session UI state: the database records only that a set was
  // completed, which is what the coin award is keyed on.
  const [counts, setCounts] = useState<Record<string, number>>({})

  const { data: logs } = useAdhkarLogs(today)
  const logComplete = useLogAdhkarComplete()

  const items = ADHKAR_SETS[set]
  const loggedSets = useMemo(
    () => new Set((logs ?? []).filter((l) => l.completed).map((l) => l.time)),
    [logs],
  )
  const alreadyLogged = loggedSets.has(set)
  const recited = items.filter((i) => (counts[i.id] ?? 0) >= i.count).length
  const allRecited = recited === items.length

  const bump = (item: AdhkarItem) =>
    setCounts((c) => ({ ...c, [item.id]: Math.min(item.count, (c[item.id] ?? 0) + 1) }))
  const reset = (item: AdhkarItem) => setCounts((c) => ({ ...c, [item.id]: 0 }))

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Set selector */}
        <FadeIn index={0}>
          <View className="flex-row gap-1 rounded-full bg-muted p-1">
            {(Object.keys(ADHKAR_SETS) as AdhkarSet[]).map((s) => {
              const active = set === s
              const Icon = SET_ICON[s]
              const logged = loggedSets.has(s)
              return (
                <Pressable
                  key={s}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    if (active) return
                    void Haptics.selectionAsync()
                    setSet(s)
                  }}
                  className={cn(
                    'flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2',
                    active && 'bg-card',
                  )}
                  style={active ? { elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } } : undefined}
                >
                  {logged ? (
                    <Check size={13} strokeWidth={2.5} color="#10b981" />
                  ) : (
                    <Icon size={13} color={active ? (dark ? '#f5f5f5' : '#0a0a0a') : '#8a9793'} />
                  )}
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {ADHKAR_SET_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </FadeIn>

        {/* Progress line */}
        <FadeIn index={1}>
          {alreadyLogged ? (
            <Card className="flex-row items-center gap-2 border-accentGreen-500/30 bg-accentGreen-500/5 py-3">
              <Check size={16} strokeWidth={2.5} color="#10b981" />
              <Text className="flex-1 text-sm text-foreground">
                {ADHKAR_SET_LABELS[set]} adhkar completed today. +{ADHKAR_COINS} coins earned.
              </Text>
            </Card>
          ) : (
            <View className="flex-row items-center justify-between">
              <Muted className="text-xs">
                {recited} of {items.length} recited · tap a card to count
              </Muted>
              <View className="flex-row items-center gap-1 rounded-full bg-warn-500/10 px-2.5 py-1">
                <Coins size={12} color={dark ? '#fbbf24' : '#d97706'} />
                <Text className="text-[11px] font-semibold" style={{ color: dark ? '#fbbf24' : '#b45309' }}>
                  +{ADHKAR_COINS} on completion
                </Text>
              </View>
            </View>
          )}
        </FadeIn>

        {/* Dhikr cards */}
        <View className="gap-3">
          {items.map((item, i) => (
            <FadeIn key={item.id} index={Math.min(2 + i, 8)}>
              <DhikrCard
                item={item}
                progress={counts[item.id] ?? 0}
                onTap={() => bump(item)}
                onReset={() => reset(item)}
                dark={dark}
              />
            </FadeIn>
          ))}
        </View>

        <GradientButton
          onPress={() => logComplete.mutate({ date: today, time: set })}
          loading={logComplete.isPending}
          disabled={alreadyLogged || !allRecited}
          icon={<Check size={18} strokeWidth={2.5} color="#ffffff" />}
        >
          {alreadyLogged
            ? 'Already logged today'
            : allRecited
              ? `Complete · +${ADHKAR_COINS} coins`
              : 'Recite all to complete'}
        </GradientButton>
      </View>
    </HubContent>
  )
}
