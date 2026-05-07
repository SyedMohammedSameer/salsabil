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

export async function streamNoor(
  message: string,
  history: AiMessage[],
  context: string | undefined,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/.netlify/functions/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Noor is unavailable right now.')
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  // State for stripping <think>...</think> reasoning blocks
  let inThink = false
  let thinkBuf = ''

  function emitContent(raw: string) {
    let text = inThink ? thinkBuf + raw : raw
    thinkBuf = ''

    let out = ''
    let i = 0
    while (i < text.length) {
      if (!inThink) {
        const open = text.indexOf('<think>', i)
        if (open === -1) {
          out += text.slice(i)
          break
        }
        out += text.slice(i, open)
        inThink = true
        i = open + 7
      } else {
        const close = text.indexOf('</think>', i)
        if (close === -1) {
          // incomplete block — buffer the rest
          thinkBuf = text.slice(i)
          break
        }
        inThink = false
        i = close + 8
      }
    }
    if (out) onToken(out)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
          error?: { message?: string } | string
        }
        if (parsed.error) {
          const msg =
            typeof parsed.error === 'string'
              ? parsed.error
              : (parsed.error.message ?? 'Noor is unavailable right now.')
          throw new Error(msg)
        }
        const content = parsed.choices?.[0]?.delta?.content
        if (content) emitContent(content)
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}
