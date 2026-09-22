import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Users, Plus, X, LogIn, Lock } from 'lucide-react-native'
import { HubContent, Muted, Card, Button, Input } from '~/components/ui'
import { usePublicRooms, useCreateRoom, useRoomByCode } from '@/hooks/useStudyRooms'
import { useAuth } from '@/hooks/useAuth'
import { STUDY_ROOM_COINS_PER_MINUTE } from '@/lib/rewards'

// Ported from src/views/study-rooms/StudyRoomsView.tsx.

export default function RoomsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: rooms, isLoading } = usePublicRooms()
  const createRoom = useCreateRoom()

  const [mode, setMode] = useState<'browse' | 'create' | 'join'>('browse')
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('25')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Only queried once a full six-character code has been typed.
  const trimmedCode = code.trim().toUpperCase()
  const { data: found, isFetching: findingCode } = useRoomByCode(
    trimmedCode.length === 6 ? trimmedCode : '',
  )

  const submitCreate = () => {
    setError(null)
    const trimmed = name.trim()
    const mins = Number(duration.trim())

    if (!trimmed) {
      setError('Give the room a name.')
      return
    }
    if (!Number.isFinite(mins) || mins <= 0) {
      setError('Enter a session length in minutes.')
      return
    }
    if (!user) return

    createRoom.mutate(
      {
        name: trimmed,
        owner_id: user.id,
        timer_duration: Math.round(mins),
        is_public: true,
      },
      {
        onSuccess: (room) => {
          setName('')
          setMode('browse')
          router.push(`/rooms/${room.id}`)
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : 'Could not create the room.'),
      },
    )
  }

  return (
    <HubContent>
      <View className="flex-row items-center justify-between py-4">
        <View className="min-w-0 flex-1">
          <Muted>
            Focus together. {STUDY_ROOM_COINS_PER_MINUTE} coins a minute for the time you attend.
          </Muted>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === 'create' ? 'Cancel' : 'Create a room'}
          onPress={() => setMode(mode === 'create' ? 'browse' : 'create')}
          className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          {mode === 'create' ? <X size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
        </Pressable>
      </View>

      {mode === 'create' ? (
        <Card className="mb-3 gap-3">
          <Input
            label="Room name"
            value={name}
            onChangeText={setName}
            placeholder="Maghrib study circle"
            autoFocus
          />
          <Input
            label="Session length (minutes)"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            error={error}
          />
          <Button onPress={submitCreate} loading={createRoom.isPending}>
            Create room
          </Button>
        </Card>
      ) : null}

      {/* Join by code */}
      <Card className="mb-4 gap-3">
        <View className="flex-row items-center gap-2">
          <LogIn size={16} color="#14b8a6" />
          <Text className="flex-1 text-sm font-medium text-foreground">Join with a code</Text>
        </View>
        <Input
          value={code}
          onChangeText={setCode}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        {trimmedCode.length === 6 ? (
          findingCode ? (
            <ActivityIndicator size="small" />
          ) : found ? (
            <Button onPress={() => router.push(`/rooms/${found.id}`)}>
              Join &ldquo;{found.name}&rdquo;
            </Button>
          ) : (
            <Muted className="text-xs">No room with that code.</Muted>
          )
        ) : null}
      </Card>

      <Muted className="pb-2">Public rooms</Muted>

      {isLoading ? (
        <ActivityIndicator />
      ) : (rooms ?? []).length === 0 ? (
        <View className="items-center py-12">
          <Muted>No public rooms right now. Create the first one.</Muted>
        </View>
      ) : (
        <View className="gap-2">
          {(rooms ?? []).map((room) => {
            const full = room.participant_count >= room.max_participants
            return (
              <Pressable
                key={room.id}
                accessibilityRole="button"
                accessibilityLabel={`${room.name}, ${room.participant_count} of ${room.max_participants} participants`}
                accessibilityState={{ disabled: full }}
                disabled={full}
                onPress={() => router.push(`/rooms/${room.id}`)}
                style={{ opacity: full ? 0.5 : 1 }}
              >
                <Card className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {full ? (
                      <Lock size={16} color="#83938f" />
                    ) : (
                      <Users size={16} color="#14b8a6" />
                    )}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base text-foreground" numberOfLines={1}>
                      {room.name}
                    </Text>
                    <Muted className="text-[11px]">
                      {room.participant_count}/{room.max_participants} · {room.timer_duration} min
                      {' · '}
                      {room.code}
                    </Muted>
                  </View>
                </Card>
              </Pressable>
            )
          })}
        </View>
      )}
    </HubContent>
  )
}
