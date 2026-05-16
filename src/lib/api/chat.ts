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

export interface AudioCapture {
  data: string
  format: 'webm' | 'wav' | 'mp3' | 'ogg'
}

export interface StreamHandlers {
  /** Called as the assistant's reply (with <think> and <heard> stripped) streams in. */
  onToken: (token: string) => void
  /** Called once with the transcribed user audio when the model finishes the <heard> block. */
  onHeard?: (text: string) => void
}

export async function streamNoor(
  message: string,
  history: AiMessage[],
  context: string | undefined,
  memories: string | undefined,
  audio: AudioCapture | undefined,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/.netlify/functions/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context, memories, audio }),
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

  // State for the two tag-stripping passes: <think>...</think> (reasoning,
  // dropped silently) and <heard>...</heard> (transcription of user audio,
  // surfaced via onHeard instead of in the assistant bubble).
  let inThink = false
  let inHeard = false
  let heardSoFar = ''
  let heardFired = false
  // Pending buffer that may contain a partial opening tag (e.g. just "<he")
  let pending = ''

  // Tags we recognise — order matters for prefix matching
  const OPEN_TAGS = ['<think>', '<heard>'] as const
  const CLOSE_TAGS: Record<string, string> = {
    '<think>': '</think>',
    '<heard>': '</heard>',
  }

  // Returns the longest prefix of `s` that could be the start of any tag in `tags`.
  // We hold this back so we don't emit "<" before knowing if it's "<think>".
  function maxTagPrefix(s: string, tags: readonly string[]): number {
    let max = 0
    for (let len = 1; len <= s.length; len++) {
      const tail = s.slice(s.length - len)
      for (const t of tags) {
        if (t.startsWith(tail)) {
          if (len > max) max = len
          break
        }
      }
    }
    return max
  }

  function processChunk(raw: string) {
    let text = pending + raw
    pending = ''
    let out = ''
    let i = 0

    while (i < text.length) {
      if (inThink) {
        const close = text.indexOf('</think>', i)
        if (close === -1) {
          // Hold the tail in case it contains a partial closing tag
          pending = text.slice(i)
          i = text.length
          break
        }
        inThink = false
        i = close + '</think>'.length
        continue
      }
      if (inHeard) {
        const close = text.indexOf('</heard>', i)
        if (close === -1) {
          heardSoFar += text.slice(i)
          pending = '' // we're not holding tag fragments inside <heard>
          i = text.length
          break
        }
        heardSoFar += text.slice(i, close)
        inHeard = false
        i = close + '</heard>'.length
        if (!heardFired) {
          handlers.onHeard?.(heardSoFar.trim())
          heardFired = true
        }
        continue
      }
      // Outside any tag — look for the next opener
      const openIdx = OPEN_TAGS.map((t) => {
        const idx = text.indexOf(t, i)
        return idx === -1 ? Infinity : idx
      })
      const minIdx = Math.min(...openIdx)
      if (minIdx === Infinity) {
        // No more openers in this buffer — emit, but hold back any trailing
        // partial-tag prefix so we don't leak "<th" or "<he" into the bubble.
        const remaining = text.slice(i)
        const hold = maxTagPrefix(remaining, OPEN_TAGS)
        out += remaining.slice(0, remaining.length - hold)
        pending = remaining.slice(remaining.length - hold)
        break
      }
      const whichTag = OPEN_TAGS[openIdx.indexOf(minIdx)]
      out += text.slice(i, minIdx)
      i = minIdx + whichTag.length
      if (whichTag === '<think>') inThink = true
      else if (whichTag === '<heard>') inHeard = true
      void CLOSE_TAGS
    }

    if (out) handlers.onToken(out)
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
        if (content) processChunk(content)
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}
