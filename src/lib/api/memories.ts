import { supabase } from '@/lib/supabase'

export type MemoryKind = 'fact' | 'preference' | 'goal' | 'context'

export interface UserMemory {
  id: string
  user_id: string
  content: string
  kind: MemoryKind
  created_at: string
  updated_at: string
}

export async function listMemories(userId: string): Promise<UserMemory[]> {
  const { data, error } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as UserMemory[]) ?? []
}

export async function addMemory(
  userId: string,
  content: string,
  kind: MemoryKind = 'fact',
): Promise<UserMemory> {
  const trimmed = content.trim().slice(0, 500)
  const { data, error } = await supabase
    .from('user_memories')
    .insert({ user_id: userId, content: trimmed, kind })
    .select()
    .single()
  if (error) throw error
  return data as UserMemory
}

// Fuzzy-delete by content substring — Noor may pass an approximate phrase.
export async function forgetMemory(userId: string, contentLike: string): Promise<number> {
  const trimmed = contentLike.trim()
  if (!trimmed) return 0
  // Match any memory containing the phrase (case-insensitive)
  const { data, error } = await supabase
    .from('user_memories')
    .delete()
    .eq('user_id', userId)
    .ilike('content', `%${trimmed}%`)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

export async function deleteMemoryById(id: string): Promise<void> {
  const { error } = await supabase.from('user_memories').delete().eq('id', id)
  if (error) throw error
}
