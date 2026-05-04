import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/lib/database.types'

export async function getChatHistory(userId: string, limit = 60): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  tokens?: number,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, role, content, tokens: tokens ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clearChatHistory(userId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId)
  if (error) throw error
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callNoor(
  message: string,
  history: AiMessage[],
  context?: string,
): Promise<{ reply: string; tokens?: number }> {
  const res = await fetch('/.netlify/functions/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Noor is unavailable right now.')
  }
  const data = (await res.json()) as { reply: string; usage?: { completionTokens?: number } }
  return { reply: data.reply, tokens: data.usage?.completionTokens }
}
