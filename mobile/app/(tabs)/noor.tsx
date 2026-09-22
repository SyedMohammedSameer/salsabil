import { useCallback, useRef, useState } from 'react'
import {
  View, Text, TextInput, Pressable, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Sparkles, Trash2 } from 'lucide-react-native'
import { Muted } from '~/components/ui'
import { useAuth } from '@/hooks/useAuth'
import {
  getChatHistory, saveChatMessage, clearChatHistory, streamNoor, type AiMessage,
} from '@/lib/api/chat'
import { toast } from '@/lib/platform/toast'

// Ported from src/views/ai/NoorView.tsx.
//
// Two deliberate reductions from the web view, both stated rather than hidden:
//
//   * Voice is not here. src/lib/voice.ts records through MediaRecorder and
//     plays through a shared <audio> element — both browser-only. Doing it
//     properly on native means expo-audio recording plus a playback surface,
//     which is its own piece of work rather than a port.
//   * Noor's tool actions (planting trees, adding memories) are not wired up
//     yet; this is conversation only. Those actions mutate real state, so they
//     need the same care the web view gives them rather than a hasty port.

interface Bubble {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function NoorScreen() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [live, setLive] = useState<Bubble | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { data: history, isLoading } = useQuery({
    queryKey: ['chat-history', user?.id ?? ''],
    queryFn: () => getChatHistory(user!.id),
    enabled: !!user?.id,
  })

  const bubbles: Bubble[] = [
    ...(history ?? []).map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    })),
    ...(live ? [live] : []),
  ]

  const send = useCallback(async () => {
    const message = draft.trim()
    if (!message || !user || streaming) return

    setDraft('')
    setStreaming(true)

    // Show the user's message immediately; the server copy arrives on refetch.
    const optimistic: Bubble = { id: `local-${Date.now()}`, role: 'user', content: message }
    qc.setQueryData(['chat-history', user.id], (old: unknown) => {
      const list = (old ?? []) as { id: string; role: string; content: string }[]
      return [...list, { ...optimistic, created_at: new Date().toISOString() }]
    })

    const assistant: Bubble = { id: `live-${Date.now()}`, role: 'assistant', content: '' }
    setLive(assistant)

    const priorHistory: AiMessage[] = (history ?? []).slice(-20).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

    const controller = new AbortController()
    abortRef.current = controller
    let full = ''

    try {
      await saveChatMessage(user.id, 'user', message)
      await streamNoor(
        message,
        priorHistory,
        undefined,
        undefined,
        undefined,
        {
          onToken: (token) => {
            full += token
            setLive((b) => (b ? { ...b, content: b.content + token } : b))
          },
        },
        controller.signal,
      )

      if (full.trim()) {
        await saveChatMessage(user.id, 'assistant', full)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Noor is unavailable right now.')
    } finally {
      setStreaming(false)
      setLive(null)
      abortRef.current = null
      void qc.invalidateQueries({ queryKey: ['chat-history', user.id] })
    }
  }, [draft, user, streaming, history, qc])

  const clear = async () => {
    if (!user) return
    abortRef.current?.abort()
    await clearChatHistory(user.id)
    void qc.invalidateQueries({ queryKey: ['chat-history', user.id] })
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
          <Sparkles size={18} color="#14b8a6" />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-foreground">Noor</Text>
            <Muted className="text-[11px]">Your companion for focus and faith</Muted>
          </View>
          {bubbles.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear conversation"
              onPress={clear}
              hitSlop={8}
            >
              <Trash2 size={18} color="#83938f" />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={[...bubbles].reverse()}
            keyExtractor={(b) => b.id}
            inverted
            contentContainerStyle={{ padding: 16, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mine = item.role === 'user'
              return (
                <View className={mine ? 'items-end' : 'items-start'}>
                  <View
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                    style={{
                      backgroundColor: mine
                        ? 'rgba(20,184,166,0.15)'
                        : 'rgba(127,127,127,0.1)',
                    }}
                  >
                    <Text className="text-[15px] leading-6 text-foreground">
                      {item.content || '…'}
                    </Text>
                  </View>
                </View>
              )
            }}
            ListEmptyComponent={
              <View className="items-center gap-2 py-24">
                <Sparkles size={28} color="#14b8a6" />
                <Text className="text-base font-medium text-foreground">
                  Assalamu alaikum
                </Text>
                <Muted className="px-8 text-center text-xs">
                  Ask about your day, your goals, or anything on your mind.
                </Muted>
              </View>
            }
          />
        )}

        <View className="flex-row items-end gap-2 border-t border-border px-4 py-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message Noor"
            placeholderTextColor="#83938f"
            multiline
            className="max-h-28 min-h-11 flex-1 rounded-2xl border border-input bg-card px-4 py-2.5 text-base text-foreground"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={send}
            disabled={!draft.trim() || streaming}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            style={{ opacity: draft.trim() && !streaming ? 1 : 0.4 }}
          >
            {streaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
