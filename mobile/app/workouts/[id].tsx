import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Trash2 } from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input } from '~/components/ui'
import { DayChips, FieldLabel } from '~/components/entries/DayChips'
import { WORKOUT_TYPES, WORKOUT_LABEL } from '~/features/workouts'
import { useWorkouts, useUpdateWorkout, useDeleteWorkout } from '@/hooks/useWorkouts'
import { WORKOUT_COINS } from '@/lib/rewards'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'
import type { WorkoutType } from '@/lib/database.types'

// Edit or delete one workout. Deleting takes back its coins, so a workout
// cannot be deleted and logged again for a second payout.

export default function WorkoutEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: workouts, isLoading } = useWorkouts()
  const workout = useMemo(() => (workouts ?? []).find((w) => w.id === id) ?? null, [workouts, id])
  const update = useUpdateWorkout()
  const remove = useDeleteWorkout()

  const [type, setType] = useState<WorkoutType>('strength')
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (seeded || !workout) return
    setType(workout.type)
    setTitle(workout.title)
    setMinutes(String(workout.duration_mins))
    setDate(workout.date)
    setNotes(workout.notes ?? '')
    setSeeded(true)
  }, [workout, seeded])

  if (isLoading) {
    return (
      <Screen>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }
  if (!workout) {
    return (
      <Screen>
        <Card variant="outline-dashed" className="mt-4 items-center py-8">
          <Muted>This workout no longer exists.</Muted>
        </Card>
      </Screen>
    )
  }

  const save = () => {
    setError(null)
    const mins = Number(minutes)
    if (!title.trim()) return setError('Give the workout a name.')
    if (!Number.isFinite(mins) || mins <= 0 || mins > 600) return setError('Enter 1 to 600 minutes.')
    update.mutate(
      { id: workout.id, updates: { type, title: title.trim(), duration_mins: Math.round(mins), date, notes: notes.trim() || null } },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.back()
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not save.'),
      },
    )
  }

  const confirmDelete = () =>
    Alert.alert('Delete workout?', `${workout.title}. The ${WORKOUT_COINS} coins it earned are taken back.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(workout, {
            onSuccess: () => {
              toast.success('Workout deleted')
              router.back()
            },
          }),
      },
    ])

  return (
    <Screen>
      <View className="gap-4 pb-10 pt-2">
        <Card className="gap-4">
          <View className="gap-2">
            <FieldLabel>Type</FieldLabel>
            <View className="flex-row flex-wrap gap-1.5">
              {WORKOUT_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  className={cn('rounded-full border px-3 py-1.5', type === t ? 'border-rose-500 bg-rose-500/10' : 'border-transparent bg-muted')}
                >
                  <Text className={cn('text-xs font-semibold', type === t ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                    {WORKOUT_LABEL[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Input label="Name" value={title} onChangeText={setTitle} maxLength={80} />
          <Input label="Minutes" value={minutes} onChangeText={(v) => setMinutes(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={3} />
          <View className="gap-2">
            <FieldLabel>Day</FieldLabel>
            <DayChips value={date} onChange={setDate} days={14} />
          </View>
          <View className="gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Sets, distance, how it felt"
              placeholderTextColor="#83938f"
              multiline
              maxLength={500}
              className="min-h-[80px] rounded-xl border border-input bg-card px-3 py-2.5 text-base text-foreground"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
          {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
          <Button onPress={save} loading={update.isPending}>
            Save changes
          </Button>
        </Card>
        <Pressable onPress={confirmDelete} className="flex-row items-center justify-center gap-2 rounded-2xl border border-danger-500/30 py-3">
          <Trash2 size={16} color="#ef4444" />
          <Text className="text-sm font-semibold text-danger-500">Delete workout</Text>
        </Pressable>
      </View>
    </Screen>
  )
}
