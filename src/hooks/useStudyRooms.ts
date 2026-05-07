import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StudyRoom, RoomMessage, TimerState } from '@/lib/database.types'
import {
  fetchPublicRooms,
  fetchRoom,
  fetchRoomByCode,
  fetchParticipants,
  fetchMessages,
  createRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  sendMessage,
  updateTimerState,
  type RoomWithCount,
} from '@/lib/api/studyRooms'

// ─── Query key factory ────────────────────────────────────────────────────────

export const roomKeys = {
  all: ['rooms'] as const,
  list: () => [...roomKeys.all, 'list'] as const,
  room: (id: string) => [...roomKeys.all, id] as const,
  participants: (id: string) => [...roomKeys.all, id, 'participants'] as const,
  messages: (id: string) => [...roomKeys.all, id, 'messages'] as const,
}

// ─── Lobby queries ────────────────────────────────────────────────────────────

export function usePublicRooms() {
  return useQuery({
    queryKey: roomKeys.list(),
    queryFn: fetchPublicRooms,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useRoomByCode(code: string) {
  return useQuery({
    queryKey: [...roomKeys.all, 'code', code.toUpperCase()],
    queryFn: () => fetchRoomByCode(code),
    enabled: code.trim().length === 6,
    retry: false,
  })
}

// ─── Room detail queries with Realtime ───────────────────────────────────────

export function useRoom(roomId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: roomKeys.room(roomId ?? ''),
    queryFn: () => fetchRoom(roomId!),
    enabled: !!roomId,
  })

  useEffect(() => {
    if (!roomId) return
    const ch = supabase
      .channel(`room-state-${roomId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'study_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          qc.setQueryData(roomKeys.room(roomId), payload.new as StudyRoom)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [roomId, qc])

  return query
}

export function useParticipants(roomId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: roomKeys.participants(roomId ?? ''),
    queryFn: () => fetchParticipants(roomId!),
    enabled: !!roomId,
  })

  useEffect(() => {
    if (!roomId) return
    const ch = supabase
      .channel(`room-participants-${roomId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: roomKeys.participants(roomId) })
          // also refresh lobby list so participant counts update
          qc.invalidateQueries({ queryKey: roomKeys.list() })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [roomId, qc])

  return query
}

export function useMessages(roomId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: roomKeys.messages(roomId ?? ''),
    queryFn: () => fetchMessages(roomId!),
    enabled: !!roomId,
  })

  useEffect(() => {
    if (!roomId) return
    const ch = supabase
      .channel(`room-messages-${roomId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          qc.setQueryData(roomKeys.messages(roomId), (old: RoomMessage[] | undefined) => [
            ...(old ?? []),
            payload.new as RoomMessage,
          ])
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [roomId, qc])

  return query
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: Parameters<typeof createRoom>[0]) => createRoom(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.list() }),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.list() }),
  })
}

export function useJoinRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { roomId: string; userId: string; displayName: string | null }) =>
      joinRoom(vars.roomId, vars.userId, vars.displayName),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: roomKeys.participants(vars.roomId) })
    },
  })
}

export function useLeaveRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { roomId: string; userId: string }) => leaveRoom(vars.roomId, vars.userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: roomKeys.participants(vars.roomId) })
    },
  })
}

export function useSendMessage() {
  return useMutation({
    mutationFn: (vars: {
      roomId: string
      userId: string
      displayName: string | null
      content: string
    }) =>
      sendMessage({
        room_id: vars.roomId,
        user_id: vars.userId,
        display_name: vars.displayName,
        content: vars.content,
      }),
  })
}

export function useUpdateTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      roomId: string
      state: TimerState
      startedAt?: string | null
      remaining?: number | null
    }) =>
      updateTimerState(vars.roomId, vars.state, {
        startedAt: vars.startedAt,
        remaining: vars.remaining,
      }),
    onSuccess: (data, vars) => {
      qc.setQueryData(roomKeys.room(vars.roomId), data)
    },
  })
}

// ─── Auto-join/leave lifecycle ────────────────────────────────────────────────
// Call this in StudyRoomDetail to handle presence automatically.

export function useRoomPresence(
  roomId: string | undefined,
  userId: string | undefined,
  displayName: string | null,
) {
  const joinMut = useJoinRoom()
  const joinedRef = useRef(false)

  useEffect(() => {
    if (!roomId || !userId) return
    joinedRef.current = true
    joinMut.mutate({ roomId, userId, displayName })

    return () => {
      if (joinedRef.current) {
        leaveRoom(roomId, userId).catch(() => null)
        joinedRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId])
}

// ─── Timer computation helper ─────────────────────────────────────────────────

export function computeTimerRemaining(room: StudyRoom): number {
  if (room.timer_state === 'idle') return room.timer_duration * 60
  if (room.timer_state === 'done') return 0
  if (room.timer_state === 'paused') return room.timer_remaining ?? room.timer_duration * 60
  // running — compute elapsed
  if (!room.timer_started_at) return room.timer_duration * 60
  const elapsed = Math.floor((Date.now() - new Date(room.timer_started_at).getTime()) / 1000)
  return Math.max(0, room.timer_duration * 60 - elapsed)
}

export { fetchPublicRooms, fetchRoomByCode, type RoomWithCount }
