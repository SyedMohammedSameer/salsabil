import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, Pressable, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Users, ChevronLeft } from 'lucide-react-native'
import { Muted, Button } from '~/components/ui'
import {
  useRoom, useParticipants, useMessages, useRoomPresence,
  useUpdateTimer, useSendMessage, computeTimerRemaining,
} from '@/hooks/useStudyRooms'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, profileKeys } from '@/hooks/useProfile'
import { gardenKeys } from '@/hooks/useGarden'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
import { coinsFor } from '@/lib/rewards'
import { toast } from '@/lib/platform/toast'
import type { RoomMessage } from '@/lib/database.types'

// Ported from src/views/study-rooms/StudyRoomDetail.tsx, including the Phase 0
// award fixes: the payout is keyed on the session's start time in the
// server-side ledger, so a reload cannot pay twice, and it is sized by the time
// this participant was actually present for rather than the room's configured
// duration.

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
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
    sendMessage.mutate({ roomId: id, userId: user.id, displayName, content })
    setDraft('')
  }

  const total = room ? room.timer_duration * 60 : 0
  const progress = total > 0 ? 1 - remaining / total : 0

  const ordered = useMemo(() => [...messages].reverse(), [messages])

  if (isLoading || !room) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color="#14b8a6" />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {room.name}
            </Text>
            <Muted className="text-[11px]">Code {room.code}</Muted>
          </View>
          <View className="flex-row items-center gap-1">
            <Users size={14} color="#83938f" />
            <Muted className="text-xs">
              {participants.length}/{room.max_participants}
            </Muted>
          </View>
        </View>

        {/* Shared timer */}
        <View className="items-center gap-3 border-b border-border px-4 py-5">
          <Text className="text-5xl font-semibold tabular-nums text-foreground">
            {formatClock(remaining)}
          </Text>
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </View>

          {isHost ? (
            <View className="w-full flex-row gap-2">
              {room.timer_state === 'running' ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onPress={() =>
                    updateTimer.mutate({ roomId: id, state: 'paused', remaining })
                  }
                >
                  Pause
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onPress={() =>
                    updateTimer.mutate({
                      roomId: id,
                      state: 'running',
                      // Shift the start back by time already served so the
                      // wall-clock math resumes rather than restarts.
                      startedAt: new Date(Date.now() - (total - remaining) * 1000).toISOString(),
                    })
                  }
                >
                  {room.timer_state === 'paused' ? 'Resume' : 'Start'}
                </Button>
              )}
              <Button
                variant="ghost"
                onPress={() =>
                  updateTimer.mutate({ roomId: id, state: 'idle', startedAt: null, remaining: null })
                }
              >
                Reset
              </Button>
            </View>
          ) : (
            <Muted className="text-xs">
              {room.timer_state === 'running'
                ? 'Session in progress'
                : room.timer_state === 'done'
                  ? 'Session finished'
                  : 'Waiting for the host to start'}
            </Muted>
          )}
        </View>

        {/* Chat */}
        <FlatList
          data={ordered}
          keyExtractor={(m: RoomMessage) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          inverted
          renderItem={({ item }) => {
            const mine = item.user_id === user?.id
            return (
              <View className={mine ? 'items-end' : 'items-start'}>
                <View
                  className="max-w-[80%] rounded-2xl px-3 py-2"
                  style={{
                    backgroundColor: mine ? 'rgba(20,184,166,0.15)' : 'rgba(127,127,127,0.1)',
                  }}
                >
                  {!mine ? (
                    <Muted className="text-[10px]">{item.display_name ?? 'Someone'}</Muted>
                  ) : null}
                  <Text className="text-sm text-foreground">{item.content}</Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <Muted className="py-8 text-center text-xs">
              No messages yet. Say salam to the room.
            </Muted>
          }
        />

        <View className="flex-row items-center gap-2 border-t border-border px-4 py-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the room"
            placeholderTextColor="#83938f"
            returnKeyType="send"
            onSubmitEditing={send}
            className="h-11 flex-1 rounded-full border border-input bg-card px-4 text-base text-foreground"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={send}
            disabled={!draft.trim()}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            style={{ opacity: draft.trim() ? 1 : 0.4 }}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
