import { useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Dumbbell, HeartPulse, Footprints, Trophy, StretchHorizontal, Activity } from 'lucide-react-native'
import { HubContent, Muted, Card, Input, GradientButton, FadeIn, SectionHeader } from '~/components/ui'
import { GrowHero, HeroStat } from '~/components/GrowHero'
import { relativeDay, addDays } from '~/lib/format'
import { useWorkouts, useCreateWorkout, useDeleteWorkout } from '@/hooks/useWorkouts'
import { localDateString, daysAgo } from '@/lib/dates'
import { WORKOUT_COINS } from '@/lib/rewards'
import { cn } from '@/lib/cn'
import type { WorkoutType } from '@/lib/database.types'

// The Workouts section of the Grow hub.

const TYPES: WorkoutType[] = ['strength', 'cardio', 'flexibility', 'sports', 'walk', 'other']

const TYPE_LABEL: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  flexibility: 'Flexibility',
  sports: 'Sports',
  walk: 'Walk',
  other: 'Other',
}

const TYPE_ICON: Record<WorkoutType, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: HeartPulse,
  flexibility: StretchHorizontal,
  sports: Trophy,
  walk: Footprints,
  other: Activity,
}

export default function WorkoutsScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()
  const weekStart = useMemo(() => localDateString(daysAgo(6)), [])
  const { data: workouts, isLoading } = useWorkouts()
  const createWorkout = useCreateWorkout()
  const deleteWorkout = useDeleteWorkout()

  const [type, setType] = useState<WorkoutType>('strength')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)

  const week = useMemo(() => (workouts ?? []).filter((w) => w.date >= weekStart), [workouts, weekStart])
  const weekMins = week.reduce((s, w) => s + w.duration_mins, 0)
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const trained = new Set(week.map((w) => w.date))

  const submit = () => {
    setError(null)
    const trimmed = title.trim()
    const mins = Number(duration.trim())
    if (!trimmed) {
      setError('Give the workout a name.')
      return
    }
    if (!Number.isFinite(mins) || mins <= 0) {
      setError('Enter how many minutes it took.')
      return
    }
    createWorkout.mutate(
      { type, title: trimmed, duration_mins: Math.round(mins), date: today },
      {
        onSuccess: () => {
          setTitle('')
          setDuration('')
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not save the workout.'),
      },
    )
  }

  const confirmDelete = (id: string, name: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Delete workout?', name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout.mutate(id) },
    ])
  }

  const rose = dark ? '#fb7185' : '#e11d48'

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        <FadeIn index={0}>
          <GrowHero
            eyebrow="This week"
            title={`${week.length} ${week.length === 1 ? 'workout' : 'workouts'} · ${weekMins} min`}
            sub={`+${WORKOUT_COINS} coins each. Your body is an amanah.`}
            right={<HeroStat value={`+${week.length * WORKOUT_COINS}`} label="earned" />}
            footer={
              <View className="gap-1.5">
                <View className="flex-row gap-1.5">
                  {weekDays.map((d) => (
                    <View key={d} className={cn('h-1.5 flex-1 rounded-full', trained.has(d) ? 'bg-white' : 'bg-white/25')} />
                  ))}
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-[10px] text-white/70">{relativeDay(weekStart, today)}</Text>
                  <Text className="text-[10px] text-white/70">Today</Text>
                </View>
              </View>
            }
          />
        </FadeIn>

        <FadeIn index={1}>
          <Card className="gap-3">
            <View className="flex-row flex-wrap gap-1.5">
              {TYPES.map((t) => {
                const active = type === t
                const Icon = TYPE_ICON[t]
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      void Haptics.selectionAsync()
                      setType(t)
                    }}
                    className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', active ? 'border-rose-500 bg-rose-500/10' : 'border-transparent bg-muted')}
                  >
                    <Icon size={13} color={active ? rose : '#8a9793'} />
                    <Text className="text-xs font-semibold" style={{ color: active ? rose : '#8a9793' }}>
                      {TYPE_LABEL[t]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <View className="flex-row gap-3">
              <View className="flex-[2]">
                <Input value={title} onChangeText={setTitle} placeholder="Push day, 5k run…" accessibilityLabel="Workout" />
              </View>
              <View className="flex-1">
                <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="min" accessibilityLabel="Minutes" />
              </View>
            </View>
            {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
            <GradientButton onPress={submit} loading={createWorkout.isPending}>
              Log workout · +{WORKOUT_COINS} coins
            </GradientButton>
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <View className="gap-3">
            <SectionHeader title="Recent" description="Long-press to delete" />
            {isLoading ? (
              <ActivityIndicator />
            ) : (workouts ?? []).length === 0 ? (
              <Card variant="outline-dashed" className="items-center py-8">
                <Muted className="text-xs">No workouts logged yet.</Muted>
              </Card>
            ) : (
              <Card className="p-0">
                {(workouts ?? []).slice(0, 20).map((w, i) => {
                  const Icon = TYPE_ICON[w.type]
                  return (
                    <Pressable
                      key={w.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${w.title}, ${w.duration_mins} minutes`}
                      accessibilityHint="Long press to delete"
                      onLongPress={() => confirmDelete(w.id, w.title)}
                      className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border')}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                        <Icon size={18} strokeWidth={1.75} color={rose} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{w.title}</Text>
                        <Muted className="text-xs">
                          {TYPE_LABEL[w.type]} · {w.duration_mins} min · {relativeDay(w.date, today)}
                        </Muted>
                      </View>
                      <Muted className="text-xs">+{WORKOUT_COINS}</Muted>
                    </Pressable>
                  )
                })}
              </Card>
            )}
          </View>
        </FadeIn>
      </View>
    </HubContent>
  )
}
