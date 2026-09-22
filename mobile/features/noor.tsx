import { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { Send, Sparkles, Trash2, X, CircleCheck, CircleAlert, Zap } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import { Muted, Gradient, NOOR_GRADIENT, Card } from '~/components/ui'
import { StackBar, BarButton } from '~/components/StackBar'
import { parseActions, actionSummary, NEEDS_CONFIRMATION } from '~/lib/noor/actions'
import { useNoorContext } from '~/lib/noor/context'
import { useNoorExecutor, type ActionResult } from '~/lib/noor/executor'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { getChatHistory, saveChatMessage, clearChatHistory, streamNoor, type AiMessage } from '@/lib/api/chat'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'

// Noor, opened from the centre of the tab bar. Ported from
// src/views/ai/NoorView.tsx, and on the phone Noor acts as well as talks:
//
//   * every message carries the user's live data (useNoorContext), so Noor
//     can answer "what's left today?" or "how was my week?"
//   * replies end with action tags, which run automatically through the same
//     hooks the screens use (useNoorExecutor); the result of each shows as a
//     chip under the reply. Deleting and discarding wait for a tap.
//
// Voice is still web-only: src/lib/voice.ts records through MediaRecorder.

type Bubble = { id: string; role: 'user' | 'assistant'; content: string }

/** Per reply (keyed by its full text): each action's state, in tag order. */
type Outcome = { state: 'running' } | { state: 'confirm' } | ({ state: 'done' } & ActionResult)

const SUGGESTIONS = [
  "What's left for today?",
  'Start a 45 minute focus session',
  'I just prayed Asr',
  'Remind me to call mum tomorrow at 6pm',
  'How was my week?',
  'Plan my day',
]

function ActionChips({
  content,
  outcomes,
  onConfirm,
  dark,
}: {
  content: string
  outcomes: Outcome[] | undefined
  onConfirm: (index: number) => void
  dark: boolean
}) {
  const { actions } = parseActions(content)
  if (!actions.length) return null
  return (
    <View className="mt-2 gap-1.5">
      {actions.map((a, i) => {
        const o = outcomes?.[i]
        if (o?.state === 'confirm') {
          return (
            <View key={i} className="flex-row items-center gap-2 rounded-xl border border-warn-500/40 bg-warn-500/10 py-1.5 pl-3 pr-1.5">
              <Text className="flex-1 text-xs font-medium text-foreground" numberOfLines={2}>
                {actionSummary(a)}?
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onConfirm(i)}
                className="rounded-lg bg-warn-500 px-3 py-1.5"
              >
                <Text className="text-xs font-bold text-white">Confirm</Text>
              </Pressable>
            </View>
          )
        }
        const ok = o?.state === 'done' ? o.ok : null
        return (
          <View
            key={i}
            className={cn(
              'flex-row items-center gap-2 self-start rounded-xl px-2.5 py-1.5',
              ok === false ? 'bg-danger-500/10' : ok ? 'bg-noor-500/10' : 'bg-muted',
            )}
          >
            {o?.state === 'running' ? (
              <ActivityIndicator size="small" color={dark ? '#2dd4bf' : '#0d9488'} />
            ) : ok === false ? (
              <CircleAlert size={14} color="#ef4444" />
            ) : ok ? (
              <CircleCheck size={14} color={dark ? '#2dd4bf' : '#0d9488'} />
            ) : (
              <Zap size={13} color="#8a9793" />
            )}
            <Text
              className={cn('text-xs font-medium', ok === false ? 'text-danger-500' : ok ? 'text-noor-700 dark:text-noor-300' : 'text-muted-foreground')}
              numberOfLines={2}
            >
              {o?.state === 'done' ? o.label : actionSummary(a)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function Orb({ size = 36 }: { size?: number }) {
  return (
    <Gradient
      colors={NOOR_GRADIENT}
      radius={size / 2}
      style={{
        width: size,
        height: size,
        backgroundColor: '#14b8a6',
        shadowColor: '#14b8a6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-1 items-center justify-center">
        <Sparkles size={size * 0.5} color="#ffffff" />
      </View>
    </Gradient>
  )
}

export default function NoorScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [live, setLive] = useState<Bubble | null>(null)
  const [outcomes, setOutcomes] = useState<Record<string, Outcome[]>>({})
  const abortRef = useRef<AbortController | null>(null)
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { context, memories } = useNoorContext()
  const { run } = useNoorExecutor()

  const setOutcome = (key: string, index: number, o: Outcome) =>
    setOutcomes((prev) => {
      const list = [...(prev[key] ?? [])]
      list[index] = o
      return { ...prev, [key]: list }
    })

  /** Run a reply's actions in order; the destructive ones wait for a tap. */
  const runActions = async (reply: string) => {
    const { actions } = parseActions(reply)
    if (!actions.length) return
    setOutcomes((prev) => ({
      ...prev,
      [reply]: actions.map((a) => (NEEDS_CONFIRMATION.has(a.name) ? { state: 'confirm' as const } : { state: 'running' as const })),
    }))
    for (let i = 0; i < actions.length; i++) {
      if (NEEDS_CONFIRMATION.has(actions[i].name)) continue
      const result = await run(actions[i])
      void Haptics.notificationAsync(result.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error)
      setOutcome(reply, i, { state: 'done', ...result })
    }
  }

  const confirm = async (reply: string, index: number) => {
    const action = parseActions(reply).actions[index]
    if (!action) return
    setOutcome(reply, index, { state: 'running' })
    const result = await run(action)
    setOutcome(reply, index, { state: 'done', ...result })
  }

  const firstName =
    profile?.display_name?.split(' ')[0] ?? profile?.username ?? user?.email?.split('@')[0] ?? null

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

  const send = useCallback(
    async (text?: string) => {
      const message = (text ?? draft).trim()
      if (!message || !user || streaming) return

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
          context,
          memories,
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
          // Saved raw, tags included, as the web does; the chips re-read them.
          await saveChatMessage(user.id, 'assistant', full)
          await runActions(full)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Noor is unavailable right now.')
      } finally {
        setStreaming(false)
        setLive(null)
        abortRef.current = null
        void qc.invalidateQueries({ queryKey: ['chat-history', user.id] })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, user, streaming, history, qc, context, memories, run],
  )

  const clear = async () => {
    if (!user) return
    abortRef.current?.abort()
    await clearChatHistory(user.id)
    void qc.invalidateQueries({ queryKey: ['chat-history', user.id] })
  }

  const empty = (
    <View className="gap-3 py-4">
      <Card variant="glass-noor" className="items-center gap-1.5 px-5 py-5">
        <Text className="text-[22px] text-noor-700 dark:text-noor-300" style={{ fontFamily: 'Amiri', writingDirection: 'rtl' }}>
          السَّلَامُ عَلَيْكُمْ
        </Text>
        <Text className="text-[15px] font-semibold text-foreground">
          How can I help today{firstName ? `, ${firstName}` : ''}?
        </Text>
        <Muted className="text-center text-xs">
          Ask me anything about your day, or tell me what to do: add tasks, log prayers and Quran, run your focus timer, water your garden.
        </Muted>
      </Card>
      <View className="flex-row flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            onPress={() => void send(s)}
            className="rounded-full border border-noor-200/60 bg-noor-50 px-3.5 py-2 dark:border-noor-800/40 dark:bg-noor-950/40"
          >
            <Text className="text-xs font-semibold text-noor-700 dark:text-noor-300">{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <StackBar
          title="Noor"
          sub="Your companion for focus and faith"
          close
          leading={<Orb />}
          trailing={
            <View className="flex-row items-center gap-2">
              {bubbles.length > 0 ? (
                <BarButton icon={<Trash2 size={17} color="#8a9793" />} label="Clear conversation" onPress={() => void clear()} />
              ) : null}
              <BarButton icon={<X size={17} color="#8a9793" />} label="Close Noor" onPress={() => router.back()} />
            </View>
          }
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : bubbles.length === 0 ? (
          <View className="flex-1 justify-end px-4 pb-2">{empty}</View>
        ) : (
          <FlatList
            data={[...bubbles].reverse()}
            keyExtractor={(b) => b.id}
            inverted
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mine = item.role === 'user'
              return mine ? (
                <View className="items-end">
                  <View className="max-w-[82%] rounded-[18px] rounded-br-md bg-primary px-3.5 py-2.5">
                    <Text className="text-[15px] leading-[21px] text-white">{item.content}</Text>
                  </View>
                </View>
              ) : (
                <View className="max-w-[88%] flex-row items-end gap-2">
                  <Orb size={26} />
                  <View className="min-w-0 flex-1">
                    <View className="rounded-[18px] rounded-bl-md bg-muted px-3.5 py-2.5">
                      <Text className={cn('text-[15px] leading-[21px] text-foreground', !item.content && 'text-muted-foreground')}>
                        {parseActions(item.content).clean || (item.content ? 'Done.' : 'Thinking…')}
                      </Text>
                    </View>
                    <ActionChips
                      content={item.content}
                      outcomes={outcomes[item.content]}
                      onConfirm={(i) => void confirm(item.content, i)}
                      dark={dark}
                    />
                  </View>
                </View>
              )
            }}
          />
        )}

        <View className="flex-row items-end gap-2 border-t border-border bg-card px-4 pb-2 pt-2.5">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message Noor"
            placeholderTextColor="#9aa8a4"
            multiline
            accessibilityLabel="Message Noor"
            className="max-h-28 min-h-11 flex-1 rounded-[22px] border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={() => void send()}
            disabled={!draft.trim() || streaming}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            style={{ opacity: draft.trim() && !streaming ? 1 : 0.4 }}
          >
            {streaming ? <ActivityIndicator size="small" color="#ffffff" /> : <Send size={18} color="#ffffff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
