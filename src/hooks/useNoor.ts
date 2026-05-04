import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getChatHistory, saveChatMessage, clearChatHistory, callNoor } from '@/lib/api/chat'
import type { AiMessage } from '@/lib/api/chat'

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

export function useSendMessage(context?: string) {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ message, history }: { message: string; history: AiMessage[] }) => {
      if (!user) throw new Error('Not authenticated')

      // Save user message
      await saveChatMessage(user.id, 'user', message)

      // Call Noor
      const { reply, tokens } = await callNoor(message, history, context)

      // Save assistant reply
      await saveChatMessage(user.id, 'assistant', reply, tokens)

      return reply
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noorKeys.history(user?.id ?? '') })
    },
  })
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
