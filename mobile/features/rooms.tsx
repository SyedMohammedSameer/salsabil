import { useEffect, useState } from 'react'
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Users, Plus, X, Lock } from 'lucide-react-native'
import { HubContent, Muted, Card, Button, Input, Gradient, FadeIn, PressableScale } from '~/components/ui'
import { usePublicRooms, useCreateRoom, useRoomByCode } from '@/hooks/useStudyRooms'
import { useAuth } from '@/hooks/useAuth'
import { STUDY_ROOM_COINS_PER_MINUTE } from '@/lib/rewards'
import { cn } from '@/lib/cn'
import type { StudyRoom } from '@/lib/database.types'

// The Rooms section of the Focus hub. A hero with the live count, room
// creation and join-by-code, then each public room with a ring showing how
// much of its shared timer is left.

const HERO = ['#0d9488', '#115e59'] as const

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Seconds left on a room's timer, from its persisted timer state. */
function remainingSeconds(room: StudyRoom, now: number): number {
  const total = room.timer_duration * 60
  if (room.timer_state === 'running' && room.timer_started_at) {
    const elapsed = (now - new Date(room.timer_started_at).getTime()) / 1000
    return Math.max(0, total - elapsed)
  }
  if (room.timer_state === 'paused' && room.timer_remaining != null) return room.timer_remaining
  if (room.timer_state === 'done') return 0
  return total
}

function TimerRing({ remaining, total, live, dark }: { remaining: number; total: number; live: boolean; dark: boolean }) {
  const size = 48
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, remaining / total) : 0
  const mins = Math.ceil(remaining / 60)
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={dark ? '#192320' : '#eff3f2'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={live ? '#14b8a6' : '#8a9793'}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text className="text-[11px] font-bold text-foreground">{mins}m</Text>
    </View>
  )
}

export default function RoomsScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { user } = useAuth()
  const { data: rooms, isLoading } = usePublicRooms()
  const createRoom = useCreateRoom()
  const now = useNow()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('25')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Only queried once a full six-character code has been typed.
  const trimmedCode = code.trim().toUpperCase()
  const { data: found, isFetching: findingCode } = useRoomByCode(trimmedCode.length === 6 ? trimmedCode : '')

  const live = (rooms ?? []).filter((r) => r.timer_state === 'running').length

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
      { name: trimmed, owner_id: user.id, timer_duration: Math.round(mins), is_public: true },
      {
        onSuccess: (room) => {
          setName('')
          setCreating(false)
          router.push(`/rooms/${room.id}`)
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not create the room.'),
      },
    )
  }

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Hero */}
        <FadeIn index={0}>
          <Gradient
            colors={HERO}
            radius={24}
            orbs
            style={{
              backgroundColor: '#0d9488',
              shadowColor: '#0d9488',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <View className="gap-3.5 px-5 pb-4 pt-[18px]">
              <View className="flex-row items-center justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/80">Study rooms</Text>
                  <Text className="mt-1 text-[22px] font-bold leading-7 tracking-tight text-white">
                    {isLoading ? 'Loading rooms…' : live === 1 ? '1 room live now' : `${live} rooms live now`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={creating ? 'Cancel' : 'Create a room'}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setCreating((v) => !v)
                  }}
                  className="h-10 flex-row items-center gap-1.5 rounded-xl bg-white px-3.5"
                >
                  {creating ? <X size={16} strokeWidth={2.5} color="#115e59" /> : <Plus size={16} strokeWidth={2.5} color="#115e59" />}
                  <Text className="text-[13px] font-bold text-noor-800">{creating ? 'Cancel' : 'Create'}</Text>
                </Pressable>
              </View>

              <View className="h-12 flex-row items-center rounded-[14px] border border-white/20 bg-white/15 pl-3.5 pr-1.5">
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="ROOM CODE"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  accessibilityLabel="Room code"
                  className="min-w-0 flex-1 text-base font-bold text-white"
                  style={{ letterSpacing: 4 }}
                />
                {trimmedCode.length === 6 && findingCode ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 12 }} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={found ? `Join ${found.name}` : 'Join'}
                    disabled={!found}
                    onPress={() => router.push(`/rooms/${found!.id}`)}
                    className="h-9 items-center justify-center rounded-[10px] bg-white px-4"
                    style={!found ? { opacity: 0.55 } : undefined}
                  >
                    <Text className="text-[13px] font-bold text-noor-800">Join</Text>
                  </Pressable>
                )}
              </View>
              <Text className="text-xs text-white/80">
                {trimmedCode.length === 6 && !findingCode && !found
                  ? 'No room with that code.'
                  : found
                    ? `Found “${found.name}”. Tap Join.`
                    : `${STUDY_ROOM_COINS_PER_MINUTE} coins a minute for the time you attend`}
              </Text>
            </View>
          </Gradient>
        </FadeIn>

        {creating ? (
          <Card className="gap-3">
            <Input label="Room name" value={name} onChangeText={setName} placeholder="Maghrib study circle" autoFocus />
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

        {isLoading ? (
          <ActivityIndicator />
        ) : (rooms ?? []).length === 0 ? (
          <Card variant="outline-dashed" className="items-center gap-1 py-10">
            <Users size={28} strokeWidth={1.25} color={dark ? '#3f4f4a' : '#c4cfcc'} />
            <Muted className="text-center">No public rooms right now. Create the first one.</Muted>
          </Card>
        ) : (
          <View className="gap-3">
            {(rooms ?? []).map((room, i) => {
              const full = room.participant_count >= room.max_participants
              const total = room.timer_duration * 60
              const remaining = remainingSeconds(room, now)
              const running = room.timer_state === 'running'
              return (
                <FadeIn key={room.id} index={Math.min(1 + i, 6)}>
                  <PressableScale
                    disabled={full}
                    accessibilityLabel={`${room.name}, ${room.participant_count} of ${room.max_participants} participants`}
                    onPress={() => router.push(`/rooms/${room.id}`)}
                  >
                    <Card className={cn('flex-row items-center gap-3', full && 'opacity-55')}>
                      {full ? (
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Lock size={18} color="#8a9793" />
                        </View>
                      ) : (
                        <TimerRing remaining={remaining} total={total} live={running} dark={dark} />
                      )}
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center gap-1.5">
                          {running ? <View className="h-1.5 w-1.5 rounded-full bg-accentGreen-500" /> : null}
                          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
                            {room.name}
                          </Text>
                        </View>
                        <Muted className="text-xs" numberOfLines={1}>
                          {room.timer_duration} min
                          {running ? ` · ${Math.ceil(remaining / 60)} min left` : room.timer_state === 'paused' ? ' · paused' : ''}
                          {full ? ' · full' : ` · ${room.code}`}
                        </Muted>
                      </View>
                      <View className="items-end gap-0.5">
                        <Users size={16} color={dark ? '#2dd4bf' : '#0d9488'} />
                        <Muted className="text-[11px]">
                          {room.participant_count} / {room.max_participants}
                        </Muted>
                      </View>
                    </Card>
                  </PressableScale>
                </FadeIn>
              )
            })}
          </View>
        )}
      </View>
    </HubContent>
  )
}
