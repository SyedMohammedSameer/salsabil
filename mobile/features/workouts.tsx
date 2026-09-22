import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Dumbbell, Trash2, Plus, X } from 'lucide-react-native'
import { HubContent, Muted, Card, Button, Input } from '~/components/ui'
import { useWorkouts, useCreateWorkout, useDeleteWorkout } from '@/hooks/useWorkouts'
import { localDateString } from '@/lib/dates'
import { WORKOUT_COINS } from '@/lib/rewards'
import type { WorkoutType } from '@/lib/database.types'

// Ported from src/views/workouts/WorkoutsView.tsx.

const TYPES: WorkoutType[] = ['strength', 'cardio', 'flexibility', 'sports', 'walk', 'other']

const TYPE_LABEL: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  flexibility: 'Flexibility',
  sports: 'Sports',
  walk: 'Walk',
  other: 'Other',
}

export default function WorkoutsScreen() {
  const today = localDateString()
  const { data: workouts, isLoading } = useWorkouts()
  const createWorkout = useCreateWorkout()
  const deleteWorkout = useDeleteWorkout()

  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<WorkoutType>('strength')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)

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
          setType('strength')
          setAdding(false)
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : 'Could not save the workout.'),
      },
    )
  }

  return (
    <HubContent>
      <View className="flex-row items-center justify-between py-4">
        <View>
          <Muted>+{WORKOUT_COINS} coins each. Your body is an amanah.</Muted>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={adding ? 'Cancel' : 'Log a workout'}
          onPress={() => setAdding((v) => !v)}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          {adding ? <X size={18} color="#ffffff" /> : <Plus size={18} color="#ffffff" />}
        </Pressable>
      </View>

      {adding ? (
        <Card className="mb-3 gap-3">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-foreground">Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {TYPES.map((t) => {
                const active = type === t
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setType(t)}
                    className="rounded-lg border px-3 py-2"
                    style={{
                      borderColor: active ? '#14b8a6' : 'transparent',
                      backgroundColor: active
                        ? 'rgba(20,184,166,0.1)'
                        : 'rgba(127,127,127,0.08)',
                    }}
                  >
                    <Text
                      className="text-[11px]"
                      style={{ color: active ? '#14b8a6' : '#83938f' }}
                    >
                      {TYPE_LABEL[t]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <Input
            label="What did you do?"
            value={title}
            onChangeText={setTitle}
            placeholder="Push day, 5k run…"
          />
          <Input
            label="Minutes"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="45"
            error={error}
          />

          <Button onPress={submit} loading={createWorkout.isPending}>
            Log workout
          </Button>
        </Card>
      ) : null}

      {isLoading ? (
        <ActivityIndicator />
      ) : (workouts ?? []).length === 0 ? (
        <View className="items-center py-16">
          <Muted>No workouts logged yet.</Muted>
        </View>
      ) : (
        <View className="gap-2">
          {(workouts ?? []).map((w) => (
            <Card key={w.id} className="flex-row items-center gap-3">
              <Dumbbell size={18} color="#14b8a6" />
              <View className="min-w-0 flex-1">
                <Text className="text-base text-foreground">{w.title}</Text>
                <Muted className="text-[11px]">
                  {TYPE_LABEL[w.type]} · {w.duration_mins} min · {w.date}
                </Muted>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${w.title}`}
                onPress={() => deleteWorkout.mutate(w.id)}
                hitSlop={8}
              >
                <Trash2 size={18} color="#83938f" />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </HubContent>
  )
}
