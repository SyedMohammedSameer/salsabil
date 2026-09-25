import { supabase } from '@/lib/supabase'
import type { StudyRoom, RoomParticipant, RoomMessage, TimerState } from '@/lib/database.types'

type RoomInsert = {
  name: string
  description?: string | null
  owner_id: string
  is_public?: boolean
  max_participants?: number
  timer_duration?: number
}

type MessageInsert = {
  room_id: string
  user_id: string
  display_name?: string | null
  content: string
}

export type RoomWithCount = StudyRoom & { participant_count: number }

export async function fetchPublicRooms(): Promise<RoomWithCount[]> {
  const { data, error } = await supabase
    .from('study_rooms')
    .select('*, room_participants(id)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...(r as StudyRoom),
    participant_count: Array.isArray(r.room_participants) ? r.room_participants.length : 0,
  }))
}

export async function fetchRoom(id: string): Promise<StudyRoom> {
  const { data, error } = await supabase.from('study_rooms').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/** A signed-in user's own rooms, public and private, newest first. */
export async function fetchMyRooms(userId: string): Promise<RoomWithCount[]> {
  const { data, error } = await supabase
    .from('study_rooms')
    .select('*, room_participants(id)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...(r as StudyRoom),
    participant_count: Array.isArray(r.room_participants) ? r.room_participants.length : 0,
  }))
}

export async function fetchRoomByCode(code: string): Promise<StudyRoom> {
  const normalized = code.toUpperCase().trim()
  // Private rooms are hidden from other users by row-level security, so the
  // lookup goes through find_room_by_code (migration 0008), which returns the
  // one room a code names. Before that migration is applied the RPC does not
  // exist, and the plain query below still finds public rooms.
  const rpc = await supabase.rpc('find_room_by_code', { p_code: normalized })
  if (!rpc.error) {
    const row = (Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) as StudyRoom | null | undefined
    if (row) return row
    throw new Error('No room with that code')
  }
  const { data, error } = await supabase
    .from('study_rooms')
    .select('*')
    .eq('code', normalized)
    .single()
  if (error) throw error
  return data
}

export async function createRoom(room: RoomInsert): Promise<StudyRoom> {
  const { data, error } = await supabase.from('study_rooms').insert(room).select().single()
  if (error) throw error
  return data
}

export type RoomUpdate = Partial<
  Pick<StudyRoom, 'name' | 'description' | 'is_public' | 'max_participants' | 'timer_duration'>
>

/** Owner-only (enforced by row-level security). */
export async function updateRoom(id: string, updates: RoomUpdate): Promise<StudyRoom> {
  const { data, error } = await supabase
    .from('study_rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('study_rooms').delete().eq('id', id)
  if (error) throw error
}

export async function fetchParticipants(roomId: string): Promise<RoomParticipant[]> {
  const { data, error } = await supabase
    .from('room_participants')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function joinRoom(
  roomId: string,
  userId: string,
  displayName: string | null,
): Promise<RoomParticipant> {
  const { data, error } = await supabase
    .from('room_participants')
    .upsert(
      {
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,user_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('room_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function fetchMessages(roomId: string): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from('room_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function sendMessage(msg: MessageInsert): Promise<RoomMessage> {
  const { data, error } = await supabase.from('room_messages').insert(msg).select().single()
  if (error) throw error
  return data
}

export async function updateTimerState(
  roomId: string,
  state: TimerState,
  opts?: { startedAt?: string | null; remaining?: number | null },
): Promise<StudyRoom> {
  const { data, error } = await supabase
    .from('study_rooms')
    .update({
      timer_state: state,
      timer_started_at: opts?.startedAt ?? null,
      timer_remaining: opts?.remaining ?? null,
    })
    .eq('id', roomId)
    .select()
    .single()
  if (error) throw error
  return data
}
