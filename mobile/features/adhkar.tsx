import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Check, RotateCcw, Sunrise, Sunset, Hand } from 'lucide-react-native'
import { HubContent, Muted, Card, Button } from '~/components/ui'
import { useAdhkarLogs, useLogAdhkarComplete } from '@/hooks/useAdhkar'
import { localDateString } from '@/lib/dates'
import { ADHKAR_SETS, ADHKAR_SET_LABELS, type AdhkarSet, type AdhkarItem } from '@/data/adhkar'
import { ADHKAR_COINS } from '@/lib/rewards'

// Ported from src/views/adhkar/AdhkarView.tsx. The adhkar text itself comes
// from the shared src/data/adhkar.ts, so both platforms recite the same set.

const SET_ICON: Record<AdhkarSet, typeof Sunrise> = {
  morning: Sunrise,
  evening: Sunset,
  after_prayer: Hand,
}

function DhikrCard({
  item,
  progress,
  onTap,
  onReset,
}: {
  item: AdhkarItem
  progress: number
  onTap: () => void
  onReset: () => void
}) {
  const done = progress >= item.count

  return (
    <Card className="gap-3" >
      {/* Arabic is right-to-left regardless of the app's own direction. */}
      <Text
        className="text-right text-xl leading-9 text-foreground"
        style={{ writingDirection: 'rtl' }}
      >
        {item.arabic}
      </Text>

      {item.transliteration ? (
        <Text className="text-sm italic text-muted-foreground">{item.transliteration}</Text>
      ) : null}

      <Text className="text-sm text-foreground/80">{item.translation}</Text>

      {item.source ? <Muted className="text-[11px]">{item.source}</Muted> : null}

      <View className="flex-row items-center gap-3 pt-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Recite. ${progress} of ${item.count} done.`}
          onPress={onTap}
          disabled={done}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg"
          style={{ backgroundColor: done ? 'rgba(16,185,129,0.15)' : 'rgba(20,184,166,0.15)' }}
        >
          {done ? (
            <Check size={16} color="#10b981" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">
              {progress} / {item.count}
            </Text>
          )}
          {done ? <Text className="text-sm font-semibold text-[#10b981]">Complete</Text> : null}
        </Pressable>

        {progress > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset count"
            onPress={onReset}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(127,127,127,0.1)' }}
          >
            <RotateCcw size={16} color="#83938f" />
          </Pressable>
        ) : null}
      </View>
    </Card>
  )
}

export default function AdhkarScreen() {
  const today = localDateString()
  const [set, setSet] = useState<AdhkarSet>(() =>
    new Date().getHours() < 14 ? 'morning' : 'evening',
  )
  // Counts are per-session UI state: the database records only that a set was
  // completed, which is what the coin award is keyed on.
  const [counts, setCounts] = useState<Record<string, number>>({})

  const { data: logs } = useAdhkarLogs(today)
  const logComplete = useLogAdhkarComplete()

  const items = ADHKAR_SETS[set]

  const alreadyLogged = useMemo(
    () => (logs ?? []).some((l) => l.time === set && l.completed),
    [logs, set],
  )

  const allRecited = items.every((i) => (counts[i.id] ?? 0) >= i.count)

  const bump = (item: AdhkarItem) =>
    setCounts((c) => ({ ...c, [item.id]: Math.min(item.count, (c[item.id] ?? 0) + 1) }))

  const reset = (item: AdhkarItem) => setCounts((c) => ({ ...c, [item.id]: 0 }))

  return (
    <HubContent>
      <View className="gap-1 py-4">
        <Muted>Remembrance of Allah, morning and evening.</Muted>
      </View>

      <View className="flex-row gap-2 pb-4">
        {(Object.keys(ADHKAR_SETS) as AdhkarSet[]).map((s) => {
          const active = set === s
          const Icon = SET_ICON[s]
          const logged = (logs ?? []).some((l) => l.time === s && l.completed)
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSet(s)}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border py-2.5"
              style={{
                borderColor: active ? '#14b8a6' : 'transparent',
                backgroundColor: active ? 'rgba(20,184,166,0.1)' : 'rgba(127,127,127,0.08)',
              }}
            >
              <Icon size={14} color={active ? '#14b8a6' : '#83938f'} />
              <Text
                className="text-[11px]"
                style={{ color: active ? '#14b8a6' : '#83938f' }}
              >
                {ADHKAR_SET_LABELS[s]}
              </Text>
              {logged ? <Check size={12} color="#10b981" /> : null}
            </Pressable>
          )
        })}
      </View>

      {alreadyLogged ? (
        <Card className="mb-3 border-[#10b981]/30 bg-[#10b981]/5 flex-row items-center gap-2">
          <Check size={16} color="#10b981" />
          <Text className="flex-1 text-sm text-foreground">
            {ADHKAR_SET_LABELS[set]} adhkar completed today.
          </Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {items.map((item) => (
          <DhikrCard
            key={item.id}
            item={item}
            progress={counts[item.id] ?? 0}
            onTap={() => bump(item)}
            onReset={() => reset(item)}
          />
        ))}
      </View>

      <View className="pt-4">
        <Button
          onPress={() => logComplete.mutate({ date: today, time: set })}
          loading={logComplete.isPending}
          disabled={alreadyLogged || !allRecited}
        >
          {alreadyLogged
            ? 'Already logged today'
            : allRecited
              ? `Complete — +${ADHKAR_COINS} coins`
              : 'Recite all to complete'}
        </Button>
      </View>
    </HubContent>
  )
}
