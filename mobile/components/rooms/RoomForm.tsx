import { useState } from 'react'
import { View, Text, Pressable, Switch } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Minus, Plus, Globe, Lock } from 'lucide-react-native'
import { Input, Muted, Button } from '~/components/ui'
import { cn } from '@/lib/cn'

// The fields of a study room, shared by Create and Room settings, so both
// read the same and validate the same way.

export interface RoomFormValues {
  name: string
  description: string
  timer_duration: number
  max_participants: number
  is_public: boolean
}

export const ROOM_DEFAULTS: RoomFormValues = {
  name: '',
  description: '',
  timer_duration: 25,
  max_participants: 10,
  is_public: true,
}

const LENGTHS = [15, 25, 45, 50, 60, 90]
const MIN_PEOPLE = 2
const MAX_PEOPLE = 50

export function RoomForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
  lengthLocked,
}: {
  initial: RoomFormValues
  submitLabel: string
  onSubmit: (values: RoomFormValues) => void
  busy?: boolean
  /** The session length cannot change while a session is running. */
  lengthLocked?: boolean
}) {
  const [values, setValues] = useState<RoomFormValues>(initial)
  const [customLength, setCustomLength] = useState(LENGTHS.includes(initial.timer_duration) ? '' : String(initial.timer_duration))
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<RoomFormValues>) => setValues((v) => ({ ...v, ...patch }))

  const submit = () => {
    setError(null)
    const name = values.name.trim()
    if (!name) {
      setError('Give the room a name.')
      return
    }
    if (name.length > 60) {
      setError('Keep the name under 60 characters.')
      return
    }
    const length = customLength.trim() ? Number(customLength.trim()) : values.timer_duration
    if (!Number.isFinite(length) || length < 1 || length > 180) {
      setError('Sessions run 1 to 180 minutes.')
      return
    }
    onSubmit({ ...values, name, description: values.description.trim(), timer_duration: Math.round(length) })
  }

  const step = (delta: number) => {
    void Haptics.selectionAsync()
    set({ max_participants: Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, values.max_participants + delta)) })
  }

  return (
    <View className="gap-4">
      <Input label="Room name" value={values.name} onChangeText={(name) => set({ name })} placeholder="Maghrib study circle" maxLength={60} />
      <Input
        label="Description (optional)"
        value={values.description}
        onChangeText={(description) => set({ description })}
        placeholder="What are you working on together?"
        maxLength={140}
      />

      <View className="gap-2" style={lengthLocked ? { opacity: 0.5 } : undefined} pointerEvents={lengthLocked ? 'none' : 'auto'}>
        <Text className="text-sm font-medium text-foreground">Session length</Text>
        <View className="flex-row flex-wrap gap-2">
          {LENGTHS.map((m) => {
            const active = !customLength && values.timer_duration === m
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  void Haptics.selectionAsync()
                  setCustomLength('')
                  set({ timer_duration: m })
                }}
                className={cn('rounded-full border px-3.5 py-2', active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted')}
              >
                <Text className={cn('text-xs font-semibold', active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                  {m} min
                </Text>
              </Pressable>
            )
          })}
          <Input
            value={customLength}
            onChangeText={(v) => setCustomLength(v.replace(/[^0-9]/g, ''))}
            placeholder="Other"
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="Custom session length in minutes"
            className="h-[34px] w-20 rounded-full px-3 text-center text-xs"
          />
        </View>
        {lengthLocked ? <Muted className="text-xs">Stop or reset the running session to change its length.</Muted> : null}
      </View>

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-medium text-foreground">People</Text>
          <Muted className="text-xs">Including you</Muted>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fewer people"
            onPress={() => step(-1)}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <Minus size={16} color="#8a9793" />
          </Pressable>
          <Text className="w-8 text-center text-lg font-bold text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
            {values.max_participants}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More people"
            onPress={() => step(1)}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <Plus size={16} color="#8a9793" />
          </Pressable>
        </View>
      </View>

      <View className="flex-row items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-3">
        {values.is_public ? <Globe size={18} color="#0d9488" /> : <Lock size={18} color="#8a9793" />}
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-medium text-foreground">{values.is_public ? 'Public' : 'Private'}</Text>
          <Muted className="text-xs">
            {values.is_public ? 'Listed for everyone in Study rooms' : 'Hidden from the list. People join with the code'}
          </Muted>
        </View>
        <Switch
          value={values.is_public}
          onValueChange={(is_public) => {
            void Haptics.selectionAsync()
            set({ is_public })
          }}
          trackColor={{ true: '#14b8a6', false: '#c4cfcc' }}
        />
      </View>

      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
      <Button onPress={submit} loading={busy}>
        {submitLabel}
      </Button>
    </View>
  )
}
