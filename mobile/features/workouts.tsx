import { useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Dumbbell, HeartPulse, Footprints, Trophy, StretchHorizontal, Activity, ChevronRight } from 'lucide-react-native'
import { HubContent, Muted, Card, Input, GradientButton, FadeIn, SectionHeader } from '~/components/ui'
import { GrowHero, HeroStat } from '~/components/GrowHero'
import { DayChips } from '~/components/entries/DayChips'
import { relativeDay, addDays } from '~/lib/format'
import { useWorkouts, useCreateWorkout, useDeleteWorkout } from '@/hooks/useWorkouts'
import { localDateString, daysAgo } from '@/lib/dates'
import { WORKOUT_COINS } from '@/lib/rewards'
import { cn } from '@/lib/cn'
import type { Workout, WorkoutType } from '@/lib/database.types'

// The Workouts section of the Grow hub.

export const WORKOUT_TYPES: WorkoutType[] = ['strength', 'cardio', 'flexibility', 'sports', 'walk', 'other']

export const WORKOUT_LABEL: Record<WorkoutType, string> = {
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
  const router = useRouter()
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
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [more, setMore] = useState(false)
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
      { type, title: trimmed, duration_mins: Math.round(mins), date, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setTitle('')
          setDuration('')
          setNotes('')
          setDate(today)
          setMore(false)
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not save the workout.'),
      },
    )
  }

  const confirmDelete = (w: Workout) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Delete workout?', `${w.title}. The ${WORKOUT_COINS} coins it earned are taken back.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout.mutate(w) },
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
              {WORKOUT_TYPES.map((t) => {
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
                      {WORKOUT_LABEL[t]}
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
            {more ? (
              <View className="gap-3">
                <DayChips value={date} onChange={setDate} />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes: sets, distance, how it felt"
                  placeholderTextColor="#83938f"
                  multiline
                  maxLength={500}
                  className="min-h-[64px] rounded-xl border border-input bg-card px-3 py-2.5 text-[15px] text-foreground"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            ) : (
              <Pressable onPress={() => setMore(true)} hitSlop={6} className="self-start">
                <Text className="text-xs font-semibold text-noor-600 dark:text-noor-400">
                  {date === today ? 'Earlier day or notes' : `Logging for ${relativeDay(date, today)}`}
                </Text>
              </Pressable>
            )}
            {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
            <GradientButton onPress={submit} loading={createWorkout.isPending}>
              Log workout · +{WORKOUT_COINS} coins
            </GradientButton>
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <View className="gap-3">
            <SectionHeader title="Recent" description="Tap to edit, long-press to delete" />
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
                      accessibilityHint="Opens the workout. Long press to delete"
                      onPress={() => router.push(`/workouts/${w.id}` as Href)}
                      onLongPress={() => confirmDelete(w)}
                      className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border')}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                        <Icon size={18} strokeWidth={1.75} color={rose} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{w.title}</Text>
                        <Muted className="text-xs" numberOfLines={1}>
                          {WORKOUT_LABEL[w.type]} · {w.duration_mins} min · {relativeDay(w.date, today)}
                          {w.notes ? ` · ${w.notes}` : ''}
                        </Muted>
                      </View>
                      <ChevronRight size={16} color="#8a9793" />
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
