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

      // The text we persist for a voice-only message
      const displayedUserText = message || (audio ? '🎤 (voice message)' : '')

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

      const abortCtrl = new AbortController()
      abortRef.current = abortCtrl
      let reply = ''

      try {
        const saveUserPromise = saveChatMessage(user.id, 'user', displayedUserText)

        await streamNoor(
          message,
          history,
          context,
          memories,
          audio,
          (token) => {
            reply += token
            setStreamingText(reply)
          },
          abortCtrl.signal,
        )

        await saveUserPromise
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
