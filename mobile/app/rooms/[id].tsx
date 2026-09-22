import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Send, Users, Pause, Play, RotateCcw } from 'lucide-react-native'
import { Muted, Gradient } from '~/components/ui'
import { StackBar } from '~/components/StackBar'
import { formatClock } from '~/lib/focusPresets'
import {
  useRoom,
  useParticipants,
  useMessages,
  useRoomPresence,
  useUpdateTimer,
  useSendMessage,
  computeTimerRemaining,
} from '@/hooks/useStudyRooms'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, profileKeys } from '@/hooks/useProfile'
import { gardenKeys } from '@/hooks/useGarden'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
import { coinsFor, STUDY_ROOM_COINS_PER_MINUTE } from '@/lib/rewards'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'
import type { RoomMessage } from '@/lib/database.types'

// A study room: the shared timer in a green hero with the participants, the
// host's controls, and the room chat. Ported from
// src/views/study-rooms/StudyRoomDetail.tsx including the award fixes: the
// payout is keyed on the session's start time in the server-side ledger, so
// a reload cannot pay twice, and it is sized by the time this participant
// was actually present for rather than the room's configured duration.

const RING = 132
const STROKE = 9
const RADIUS = (RING - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS
const HERO = ['#0d9488', '#0f766e', '#023728'] as const

function initialsOf(name: string | null | undefined) {
  return (name?.trim().charAt(0) || '?').toUpperCase()
}

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { data: profile } = useProfile()

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? null

  const { data: room, isLoading } = useRoom(id)
  const { data: participants = [] } = useParticipants(id)
  const { data: messages = [] } = useMessages(id)
  const updateTimer = useUpdateTimer()
  const sendMessage = useSendMessage()

  useRoomPresence(id, user?.id, displayName)

  const [remaining, setRemaining] = useState(0)
  const [draft, setDraft] = useState('')

  const isHost = !!room && !!user && room.owner_id === user.id
  const myJoinedAt = participants.find((p) => p.user_id === user?.id)?.joined_at ?? null

  // Tick the countdown locally; the authoritative state lives on the row.
  useEffect(() => {
    if (!room) return
    setRemaining(computeTimerRemaining(room))
    if (room.timer_state !== 'running') return
    const tick = setInterval(() => {
      const r = computeTimerRemaining(room)
      setRemaining(r)
      if (r <= 0) clearInterval(tick)
    }, 1000)
    return () => clearInterval(tick)
  }, [room])

  // Only the host writes the 'done' transition, so every client agrees on when
  // the session ended.
  useEffect(() => {
    if (!room || !isHost) return
    if (room.timer_state === 'running' && remaining <= 0) {
      updateTimer.mutate({ roomId: id, state: 'done' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, room?.timer_state, isHost])

  // Do not retroactively reward a session that was already finished when this
  // participant arrived.
  const rewardedRef = useRef<string | null>(null)
  const initialCheckedRef = useRef(false)
  useEffect(() => {
    if (initialCheckedRef.current || !room) return
    initialCheckedRef.current = true
    if (room.timer_state === 'done' && room.timer_started_at) {
      rewardedRef.current = room.timer_started_at
    }
  }, [room])

  useEffect(() => {
    if (!room || !user) return
    if (room.timer_state !== 'done') return
    const sessionKey = room.timer_started_at
    if (!sessionKey) return
    if (rewardedRef.current === sessionKey) return
    rewardedRef.current = sessionKey

    const startedAt = new Date(sessionKey).getTime()
    const endedAt = startedAt + room.timer_duration * 60_000
    const joinedAt = myJoinedAt ? new Date(myJoinedAt).getTime() : startedAt
    const attendedMins = Math.max(0, Math.floor((endedAt - Math.max(startedAt, joinedAt)) / 60_000))

    const reward = coinsFor({ kind: 'study_room', minutes: attendedMins })
    if (reward.coins <= 0) return

    awardCoinsOnce(
      user.id,
      'focus_complete',
      reward,
      awardKeys.studyRoom(room.id, sessionKey),
      `Study room: ${room.name} (${attendedMins}m)`,
    )
      .then((balance) => {
        if (balance === null) return
        qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
        qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })
        toast.success(`Session complete! +${reward.coins} coins, +${reward.xp} tree XP`)
      })
      .catch(() => {
        /* a failed payout must not break the room UI */
      })
  }, [room, user, qc, myJoinedAt])

  const send = () => {
    const content = draft.trim()
    if (!content || !user || !id) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    sendMessage.mutate({ roomId: id, userId: user.id, displayName, content })
    setDraft('')
  }

  const total = room ? room.timer_duration * 60 : 0
  const fraction = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const ordered = useMemo(() => [...messages].reverse(), [messages])

  const names = participants
    .map((p) => (p.user_id === user?.id ? 'You' : (p.display_name ?? 'Someone')))
    .slice(0, 4)
    .join(', ')

  if (isLoading || !room) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  const stateLabel =
    room.timer_state === 'running'
      ? 'In session'
      : room.timer_state === 'paused'
        ? 'Paused'
        : room.timer_state === 'done'
          ? 'Session finished'
          : isHost
            ? 'Ready when you are'
            : 'Waiting for the host'

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <StackBar
          title={room.name}
          sub={`Code ${room.code} · ${isHost ? 'you are the host' : 'hosted room'}`}
          trailing={
            <View className="flex-row items-center gap-1">
              <Users size={14} color="#8a9793" />
              <Muted className="text-xs">
                {participants.length} / {room.max_participants}
              </Muted>
            </View>
          }
        />

        {/* Shared timer */}
        <View className="px-4">
          <Gradient
            colors={HERO}
            radius={24}
            orbs
            style={{
              backgroundColor: '#0f766e',
              shadowColor: '#0f766e',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.28,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            <View className="gap-3.5 px-5 pb-4 pt-[18px]">
              <View className="flex-row items-center justify-between gap-4">
                <View style={{ width: RING, height: RING }} className="items-center justify-center">
                  <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
                    <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke="#ffffff" strokeOpacity={0.2} strokeWidth={STROKE} fill="none" />
                    <Circle
                      cx={RING / 2}
                      cy={RING / 2}
                      r={RADIUS}
                      stroke="#5eead4"
                      strokeWidth={STROKE}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${CIRC} ${CIRC}`}
                      strokeDashoffset={CIRC * (1 - fraction)}
                      rotation={-90}
                      origin={`${RING / 2}, ${RING / 2}`}
                    />
                  </Svg>
                  <Text className="text-[32px] font-bold leading-9 tracking-tight text-white" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatClock(remaining)}
                  </Text>
                  <Text className="text-xs text-white/80">of {room.timer_duration} min</Text>
                </View>
                <View className="min-w-0 flex-1 items-end gap-2">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/80">{stateLabel}</Text>
                  <View className="flex-row">
                    {participants.slice(0, 5).map((p, i) => (
                      <View
                        key={p.user_id}
                        className="h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white/70 bg-white/25"
                        style={i > 0 ? { marginLeft: -7 } : undefined}
                      >
                        <Text className="text-[10px] font-bold text-white">{initialsOf(p.display_name)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="text-right text-xs text-white/85" numberOfLines={2}>
                    {names || 'Nobody here yet'}
                    {'\n'}earning {STUDY_ROOM_COINS_PER_MINUTE} coins / min
                  </Text>
                </View>
              </View>

              {isHost ? (
                <View className="flex-row gap-2">
                  {room.timer_state === 'running' ? (
                    <HostButton primary icon={<Pause size={15} color="#115e59" fill="#115e59" />} label="Pause" onPress={() => updateTimer.mutate({ roomId: id, state: 'paused', remaining })} />
                  ) : (
                    <HostButton
                      primary
                      icon={<Play size={15} color="#115e59" fill="#115e59" />}
                      label={room.timer_state === 'paused' ? 'Resume' : 'Start'}
                      onPress={() =>
                        updateTimer.mutate({
                          roomId: id,
                          state: 'running',
                          // Shift the start back by time already served so the
                          // wall-clock math resumes rather than restarts.
                          startedAt: new Date(Date.now() - (total - remaining) * 1000).toISOString(),
                        })
                      }
                    />
                  )}
                  <HostButton
                    icon={<RotateCcw size={15} color="#ffffff" />}
                    label="Reset"
                    onPress={() => updateTimer.mutate({ roomId: id, state: 'idle', startedAt: null, remaining: null })}
                  />
                </View>
              ) : null}
            </View>
          </Gradient>
        </View>

        {/* Chat */}
        <FlatList
          data={ordered}
          keyExtractor={(m: RoomMessage) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          inverted
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const mine = item.user_id === user?.id
            return (
              <View className={mine ? 'items-end' : 'items-start'}>
                <View
                  className={cn(
                    'max-w-[82%] px-3.5 py-2.5',
                    mine ? 'rounded-[18px] rounded-br-md bg-primary' : 'rounded-[18px] rounded-bl-md bg-muted',
                  )}
                >
                  {!mine ? (
                    <Text className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.display_name ?? 'Someone'}
                    </Text>
                  ) : null}
                  <Text className={cn('text-[15px] leading-[21px]', mine ? 'text-white' : 'text-foreground')}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={<Muted className="py-8 text-center text-xs">No messages yet. Say salam to the room.</Muted>}
        />

        <View className="flex-row items-center gap-2 border-t border-border bg-card px-4 pb-2 pt-2.5">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the room"
            placeholderTextColor="#9aa8a4"
            returnKeyType="send"
            onSubmitEditing={send}
            accessibilityLabel="Message"
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-[15px] text-foreground"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={send}
            disabled={!draft.trim()}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            style={{ opacity: draft.trim() ? 1 : 0.4 }}
          >
            <Send size={18} color="#ffffff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function HostButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
  primary?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onPress()
      }}
      className={cn(
        'h-10 flex-row items-center justify-center gap-1.5 rounded-xl px-4',
        primary ? 'flex-1 bg-white' : 'border border-white/20 bg-white/15',
      )}
    >
      {icon}
      <Text className={cn('text-[13px] font-semibold', primary ? 'text-noor-800' : 'text-white')}>{label}</Text>
    </Pressable>
  )
}
