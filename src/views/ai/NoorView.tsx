import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { useChatHistory, useSendMessage, useClearChat } from '@/hooks/useNoor'
import { useProfile } from '@/hooks/useProfile'
import { usePrayersForDate } from '@/hooks/usePrayers'
import { useTodayQuranPages } from '@/hooks/useQuranLogs'
import { useTodayFocusMinutes } from '@/hooks/useFocus'
import { useAllTasks } from '@/hooks/useTasks'
import type { ChatMessage } from '@/lib/database.types'
import type { AiMessage } from '@/lib/api/chat'
import { cn } from '@/lib/cn'

// ─── Build context string for Noor ───────────────────────────────────────────

function useDashboardContext() {
  const today = new Date().toISOString().split('T')[0]
  const { data: profile } = useProfile()
  const { data: prayers } = usePrayersForDate(today)
  const { data: quranPages } = useTodayQuranPages(today)
  const { data: focusMins } = useTodayFocusMinutes()
  const { data: tasks } = useAllTasks()

  if (!profile) return undefined

  const prayedCount =
    prayers?.filter((p) => p.status === 'prayed' || p.status === 'late' || p.status === 'qada')
      .length ?? 0

  const incompleteTasks = tasks?.filter((t) => !t.completed) ?? []
  const completedToday = tasks?.filter((t) => t.completed && t.due_date === today).length ?? 0

  const lines = [
    `User: ${profile.username ?? 'User'} | Streak: ${profile.streak} days | Coins: ${profile.coins}`,
    `Today (${today}): Prayers prayed ${prayedCount}/5 | Quran pages: ${quranPages ?? 0} | Focus: ${focusMins ?? 0} min`,
    `Tasks: ${completedToday} completed today, ${incompleteTasks.length} incomplete`,
    incompleteTasks.length > 0
      ? `Pending tasks: ${incompleteTasks
          .slice(0, 5)
          .map((t) => `"${t.title}" (${t.priority})`)
          .join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return lines
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-noor-500 text-white rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </div>
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
  const [isTyping, setIsTyping] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: messages, isLoading } = useChatHistory()
  const context = useDashboardContext()
  const sendMessage = useSendMessage(context)
  const clearChat = useClearChat()

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom(false)
    }
  }, [messages, scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(distFromBottom > 100)
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
      if (!msg || sendMessage.isPending) return
      setInput('')
      setIsTyping(true)
      try {
        await sendMessage.mutateAsync({ message: msg, history })
        setTimeout(() => scrollToBottom(), 100)
      } finally {
        setIsTyping(false)
      }
    },
    [sendMessage, history, scrollToBottom],
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
            <p className="text-[11px] text-muted-foreground">Your AI companion</p>
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
        ) : isEmpty ? (
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
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        )}
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
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-muted px-3.5 py-2.5',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'outline-none focus:border-noor-500/50 transition-colors',
              'max-h-32 overflow-y-auto',
            )}
            style={{ lineHeight: '1.5' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <Button
            size="sm"
            className="h-10 w-10 shrink-0 rounded-xl p-0"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
