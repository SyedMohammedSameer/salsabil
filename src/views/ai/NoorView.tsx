import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Sparkles,
  Trash2,
  Square,
  ChevronDown,
  CheckCircle2,
  Plus,
  BookOpen,
  Timer,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { useChatHistory, useStreamMessage, useClearChat } from '@/hooks/useNoor'
import { useProfile } from '@/hooks/useProfile'
import { usePrayersForDate } from '@/hooks/usePrayers'
import { useTodayQuranPages } from '@/hooks/useQuranLogs'
import { useTodayFocusMinutes } from '@/hooks/useFocus'
import { useAllTasks, useCreateTask } from '@/hooks/useTasks'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useChallenges } from '@/hooks/useChallenges'
import type { ChatMessage } from '@/lib/database.types'
import type { AiMessage } from '@/lib/api/chat'
import { cn } from '@/lib/cn'

// ─── Build rich context string ────────────────────────────────────────────────

function useDashboardContext() {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]

  const { data: profile } = useProfile()
  const { data: prayers } = usePrayersForDate(today)
  const { data: quranPages } = useTodayQuranPages(today)
  const { data: focusMins } = useTodayFocusMinutes()
  const { data: tasks } = useAllTasks()
  const { data: workouts } = useWorkouts()
  const { data: challenges } = useChallenges()

  if (!profile) return undefined

  const prayedCount =
    prayers?.filter((p) => ['prayed', 'late', 'qada'].includes(p.status ?? '')).length ?? 0

  const incompleteTasks = tasks?.filter((t) => !t.completed) ?? []
  const urgentTasks = incompleteTasks.filter(
    (t) => t.priority === 'urgent' || t.priority === 'high',
  )
  const completedToday = tasks?.filter((t) => t.completed && t.due_date === today).length ?? 0

  const recentWorkouts = workouts
    ?.filter((w) => w.date >= weekAgo)
    .slice(0, 3)
    .map((w) => `${w.type} (${w.duration_mins}min)`)
    .join(', ')

  const activeChallenges = challenges
    ?.filter((c) => c.status === 'active')
    .map((c) => `"${c.title}" ${c.current_days}/${c.target_days}d`)
    .join(', ')

  const lines = [
    `User: ${profile.username ?? 'User'} | Streak: ${profile.streak} days (best: ${profile.longest_streak}) | Coins: ${profile.coins}`,
    `Today (${today}): Prayers ${prayedCount}/5 | Quran: ${quranPages ?? 0} pages | Focus: ${focusMins ?? 0} min`,
    `Tasks: ${completedToday} completed today | ${incompleteTasks.length} pending | ${urgentTasks.length} urgent/high`,
    urgentTasks.length > 0
      ? `Urgent tasks: ${urgentTasks
          .slice(0, 3)
          .map((t) => `"${t.title}"`)
          .join(', ')}`
      : '',
    incompleteTasks.length > 0 && urgentTasks.length === 0
      ? `Pending: ${incompleteTasks
          .slice(0, 4)
          .map((t) => `"${t.title}" (${t.priority})`)
          .join(', ')}`
      : '',
    recentWorkouts ? `Workouts this week: ${recentWorkouts}` : 'No workouts logged this week',
    activeChallenges ? `Active challenges: ${activeChallenges}` : 'No active challenges',
  ]
    .filter(Boolean)
    .join('\n')

  return lines
}

// ─── Action parsing ───────────────────────────────────────────────────────────

type NoorAction =
  | { type: 'createTask'; title: string; priority?: string; due_date?: string }
  | { type: 'logQuranPages'; pages: number }
  | { type: 'startPomodoro'; duration: number }
  | { type: 'logPrayer'; prayer: string; status: string }

const KNOWN_ACTIONS = new Set(['createTask', 'logPrayer', 'logQuranPages', 'startPomodoro'])

function parseActions(text: string): { cleanText: string; actions: NoorAction[] } {
  const actionRegex = /\[ACTION:(\w+)\\?\|({.*?})\]/g
  const actions: NoorAction[] = []
  let match
  while ((match = actionRegex.exec(text)) !== null) {
    if (!KNOWN_ACTIONS.has(match[1])) continue
    try {
      const payload = JSON.parse(match[2])
      actions.push({ type: match[1] as NoorAction['type'], ...payload })
    } catch {
      // malformed JSON — skip
    }
  }
  const cleanText = text.replace(/\[ACTION:\w+\\?\|{.*?}\]/g, '').trim()
  return { cleanText, actions }
}

function ActionChip({
  action,
  onExecute,
  executed,
}: {
  action: NoorAction
  onExecute: (a: NoorAction) => void
  executed: boolean
}) {
  const label = () => {
    switch (action.type) {
      case 'createTask':
        return `Add task: "${action.title}"`
      case 'logQuranPages':
        return `Log ${action.pages} Quran pages`
      case 'startPomodoro':
        return `Start ${action.duration}m pomodoro`
      case 'logPrayer':
        return `Log ${action.prayer} as ${action.status}`
      default:
        return 'Run action'
    }
  }

  const Icon = () => {
    switch (action.type) {
      case 'createTask':
        return <Plus className="h-3 w-3" />
      case 'logQuranPages':
        return <BookOpen className="h-3 w-3" />
      case 'startPomodoro':
        return <Timer className="h-3 w-3" />
      default:
        return <CheckCircle2 className="h-3 w-3" />
    }
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => !executed && onExecute(action)}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all',
        executed
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
          : 'border-noor-500/30 bg-noor-500/5 text-noor-600 dark:text-noor-400 hover:bg-noor-500/15',
      )}
    >
      {executed ? <CheckCircle2 className="h-3 w-3" /> : <Icon />}
      {executed ? 'Done' : label()}
    </motion.button>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const createTask = useCreateTask()
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set())

  const { cleanText, actions } = parseActions(msg.content)

  const handleAction = useCallback(
    async (action: NoorAction, idx: number) => {
      setExecutedActions((prev) => new Set([...prev, idx]))
      try {
        if (action.type === 'createTask') {
          await createTask.mutateAsync({
            title: action.title,
            priority: (action.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
            due_date: action.due_date,
          })
        }
        // logPrayer, logQuranPages, startPomodoro can be added when hooks are available
      } catch {
        setExecutedActions((prev) => {
          const next = new Set(prev)
          next.delete(idx)
          return next
        })
      }
    },
    [createTask],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
    >
      <div className={cn('flex', isUser ? 'justify-end' : 'justify-start', 'w-full')}>
        {!isUser && (
          <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        <div
          className={cn(
            'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-noor-500 text-white rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
          )}
        >
          {cleanText}
        </div>
      </div>
      {!isUser && actions.length > 0 && (
        <div className="ml-9 mt-1.5 flex flex-wrap gap-1.5">
          {actions.map((a, i) => (
            <ActionChip
              key={i}
              action={a}
              onExecute={(act) => handleAction(act, i)}
              executed={executedActions.has(i)}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Streaming bubble ─────────────────────────────────────────────────────────

function StreamingBubble({ text }: { text: string }) {
  const { cleanText } = parseActions(text)
  const showCursor = true

  return (
    <div className="flex justify-start">
      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {cleanText || (
          <div className="flex gap-1 py-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
        )}
        {cleanText && showCursor && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block w-[2px] h-[14px] bg-noor-500 ml-0.5 align-text-bottom"
          />
        )}
      </div>
    </div>
  )
}

// ─── Starter prompts ──────────────────────────────────────────────────────────

const STARTERS = [
  'How did I do this week?',
  'What should I focus on today?',
  'Give me a morning check-in',
  'Any patterns you notice?',
]

// ─── Main view ────────────────────────────────────────────────────────────────

export default function NoorView() {
  const [input, setInput] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: messages, isLoading } = useChatHistory()
  const context = useDashboardContext()
  const { send, streamingText, isStreaming, abort } = useStreamMessage(context)
  const clearChat = useClearChat()

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (messages && messages.length > 0) scrollToBottom(false)
  }, [messages, scrollToBottom])

  // Auto-scroll while streaming
  useEffect(() => {
    if (isStreaming) scrollToBottom()
  }, [streamingText, isStreaming, scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100)
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const history: AiMessage[] = (messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const handleSend = useCallback(
    async (text: string) => {
      const msg = text.trim()
      if (!msg || isStreaming) return
      setInput('')
      setSendError(null)
      try {
        await send(msg, history)
        setTimeout(() => scrollToBottom(), 50)
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    },
    [send, history, isStreaming, scrollToBottom],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleClear = () => {
    if (window.confirm('Clear your chat history with Noor? This cannot be undone.')) {
      clearChat.mutate()
    }
  }

  const isEmpty = !messages || messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] lg:h-dvh">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600 shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Noor</h1>
            <p className="text-[11px] text-muted-foreground">
              {isStreaming ? 'Thinking…' : 'Your AI companion'}
            </p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={handleClear}
            className="rounded-lg p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn('h-12 rounded-2xl', i % 2 === 0 ? 'w-3/4' : 'w-1/2 ml-auto')}
              />
            ))}
          </div>
        ) : isEmpty && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Assalamu Alaikum</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                I&apos;m Noor — I can see all your data and help you reflect, plan, and grow.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs rounded-xl border border-border px-3 py-2.5 text-muted-foreground hover:border-noor-500/50 hover:text-foreground hover:bg-noor-500/5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {(messages ?? []).map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isStreaming && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <StreamingBubble text={streamingText} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Error banner */}
        <AnimatePresence>
          {sendError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {sendError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-4 lg:bottom-20 rounded-full bg-background border border-border p-2 shadow-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Noor…"
            rows={1}
            disabled={isStreaming}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-muted px-3.5 py-2.5',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'outline-none focus:border-noor-500/50 transition-colors',
              'max-h-32 overflow-y-auto disabled:opacity-60',
            )}
            style={{ lineHeight: '1.5' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          {isStreaming ? (
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-10 shrink-0 rounded-xl p-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={abort}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-10 w-10 shrink-0 rounded-xl p-0"
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
