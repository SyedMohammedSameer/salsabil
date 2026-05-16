import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getChatHistory, saveChatMessage, clearChatHistory, streamNoor } from '@/lib/api/chat'
import type { AiMessage, AudioCapture } from '@/lib/api/chat'
import type { ChatMessage } from '@/lib/database.types'

export const noorKeys = {
  history: (userId: string) => ['noor', 'history', userId] as const,
}

export function useChatHistory() {
  const { user } = useAuth()
  return useQuery({
    queryKey: noorKeys.history(user?.id ?? ''),
    queryFn: () => getChatHistory(user!.id),
    enabled: !!user,
    staleTime: 0,
  })
}

// ─── Streaming send ───────────────────────────────────────────────────────────

export function useStreamMessage(context?: string, memories?: string) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (message: string, history: AiMessage[], audio?: AudioCapture) => {
      if (!user || isStreaming) return
      setIsStreaming(true)
      setStreamingText('')

      // For voice messages we don't know the transcription yet — show a
      // placeholder, then swap in the heard text once Noor emits it.
      let displayedUserText = message || (audio ? '🎤 …' : '')

      const tempId = `temp-${Date.now()}`
      const tempUserMsg: ChatMessage = {
        id: tempId,
        user_id: user.id,
        role: 'user',
        content: displayedUserText,
        model: null,
        tokens: null,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<ChatMessage[]>(noorKeys.history(user.id), (old) =>
        old ? [...old, tempUserMsg] : [tempUserMsg],
      )

      const updateUserBubble = (text: string) => {
        qc.setQueryData<ChatMessage[]>(noorKeys.history(user.id), (old) =>
          old?.map((m) => (m.id === tempId ? { ...m, content: text } : m)),
        )
      }

      const abortCtrl = new AbortController()
      abortRef.current = abortCtrl
      let reply = ''

      try {
        await streamNoor(
          message,
          history,
          context,
          memories,
          audio,
          {
            onToken: (token) => {
              reply += token
              setStreamingText(reply)
            },
            onHeard: (heardText) => {
              if (heardText) {
                displayedUserText = heardText
                updateUserBubble(heardText)
              }
            },
          },
          abortCtrl.signal,
        )

        // Persist after the stream so we save the right user text for voice
        await saveChatMessage(user.id, 'user', displayedUserText)
        await saveChatMessage(user.id, 'assistant', reply)

        qc.invalidateQueries({ queryKey: noorKeys.history(user.id) })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        qc.setQueryData<ChatMessage[]>(noorKeys.history(user.id), (old) =>
          old?.filter((m) => m.id !== tempId),
        )
        throw err
      } finally {
        setIsStreaming(false)
        setStreamingText('')
        abortRef.current = null
      }
    },
    [user, isStreaming, context, memories, qc],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, streamingText, isStreaming, abort }
}

export function useClearChat() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => clearChatHistory(user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noorKeys.history(user?.id ?? '') })
    },
  })
}
