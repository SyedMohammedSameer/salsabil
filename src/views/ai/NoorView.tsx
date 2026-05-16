import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Brain,
  X,
  Dumbbell,
  Trophy,
  Sprout,
  Droplets,
  Compass,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { useChatHistory, useStreamMessage, useClearChat } from '@/hooks/useNoor'
import { useProfile } from '@/hooks/useProfile'
import { usePrayersForDate, useUpsertPrayer } from '@/hooks/usePrayers'
import { useTodayQuranPages, useCreateQuranLog } from '@/hooks/useQuranLogs'
import { useTodayFocusMinutes, useCreateFocusSession } from '@/hooks/useFocus'
import { useAllTasks, useCreateTask } from '@/hooks/useTasks'
import { useWorkouts, useCreateWorkout } from '@/hooks/useWorkouts'
import { useChallenges, useCreateChallenge, useIncrementChallenge } from '@/hooks/useChallenges'
import { usePlantTree, useWaterTree } from '@/hooks/useGarden'
import { useMemories, useAddMemory, useForgetMemory, useDeleteMemory } from '@/hooks/useMemories'
import type { ChatMessage } from '@/lib/database.types'
import type { AiMessage, AudioCapture } from '@/lib/api/chat'
import type { PrayerName, PrayerStatus, WorkoutType, TreeSpecies } from '@/lib/database.types'
import {
  isAudioRecordingSupported,
  startRecording,
  speak,
  stopSpeaking,
  type RecordingHandle,
} from '@/lib/voice'
import { cn } from '@/lib/cn'

import { localDateString, daysAgo } from '@/lib/dates'
// ─── Dashboard context ───────────────────────────────────────────────────────

function useDashboardContext() {
  const today = localDateString()
  const weekAgo = localDateString(daysAgo(7))

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

// ─── Action parsing ─────────────────────────────────────────────────────────
// The Nemotron model doesn't always follow the [ACTION:type|{json}] format —
// sometimes it emits [type:{json}] or [type|{json}]. Accept all variants.

type NoorAction =
  | { type: 'createTask'; title: string; priority?: string; due_date?: string }
  | { type: 'logQuranPages'; pages: number }
  | { type: 'startPomodoro'; duration: number }
  | { type: 'logPrayer'; prayer: string; status: string }
  | { type: 'logFocusSession'; duration_mins: number; session_type?: string }
  | { type: 'logWorkout'; workout_type: string; title: string; duration_mins: number }
  | { type: 'updateChallengeDay'; title: string }
  | { type: 'createChallenge'; title: string; target_days: number; category?: string }
  | { type: 'waterTree' }
  | { type: 'plantTree'; species: string }
  | { type: 'addMemory'; content: string; kind?: string }
  | { type: 'forgetMemory'; content: string }
  | { type: 'navigateTo'; path: string }

const KNOWN_ACTIONS = new Set([
  'createTask',
  'logPrayer',
  'logQuranPages',
  'startPomodoro',
  'logFocusSession',
  'logWorkout',
  'updateChallengeDay',
  'createChallenge',
  'waterTree',
  'plantTree',
  'addMemory',
  'forgetMemory',
  'navigateTo',
])

function normalizePayload(type: string, raw: Record<string, unknown>): Record<string, unknown> {
  if (type === 'logWorkout' && 'type' in raw && !('workout_type' in raw)) {
    return { ...raw, workout_type: raw.type }
  }
  if (type === 'logFocusSession' && 'type' in raw && !('session_type' in raw)) {
    return { ...raw, session_type: raw.type }
  }
  return raw
}

// Match all of:
//   [ACTION:type|{json}]   (canonical)
//   [ACTION:type:{json}]   (variant)
//   [type|{json}]          (model omitted ACTION:)
//   [type:{json}]          (Nemotron's most common output)
const ACTION_RE = /\[(?:ACTION[:|])?(\w+)[:|]\s*({[\s\S]*?})\s*\]/g

function parseActions(text: string): { cleanText: string; actions: NoorAction[] } {
  const actions: NoorAction[] = []
  const matches: Array<{ start: number; end: number }> = []
  ACTION_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ACTION_RE.exec(text)) !== null) {
    const name = m[1]
    if (!KNOWN_ACTIONS.has(name)) continue
    try {
      const payload = JSON.parse(m[2]) as Record<string, unknown>
      const normalized = normalizePayload(name, payload)
      actions.push({ type: name as NoorAction['type'], ...normalized } as NoorAction)
      matches.push({ start: m.index, end: m.index + m[0].length })
    } catch {
      // skip malformed json
    }
  }
  // Strip the matched action ranges out of the visible text
  let cleanText = ''
  let cursor = 0
  for (const r of matches) {
    cleanText += text.slice(cursor, r.start)
    cursor = r.end
  }
  cleanText += text.slice(cursor)
  return { cleanText: cleanText.trim(), actions }
}

// ─── Action chip ────────────────────────────────────────────────────────────

function actionLabel(a: NoorAction): string {
  switch (a.type) {
    case 'createTask':
      return `Add task: "${a.title}"`
    case 'logQuranPages':
      return `Log ${a.pages} Quran pages`
    case 'startPomodoro':
      return `Start ${a.duration}m pomodoro`
    case 'logPrayer':
      return `Log ${a.prayer} as ${a.status}`
    case 'logFocusSession':
      return `Log ${a.duration_mins}m focus`
    case 'logWorkout':
      return `Log ${a.workout_type}: "${a.title}" (${a.duration_mins}m)`
    case 'updateChallengeDay':
      return `+1 day: "${a.title}"`
    case 'createChallenge':
      return `Start challenge: "${a.title}" (${a.target_days}d)`
    case 'waterTree':
      return 'Water newest tree (−5 coins)'
    case 'plantTree':
      return `Plant a ${a.species.replace('_', ' ')}`
    case 'addMemory':
      return `Remember: "${a.content}"`
    case 'forgetMemory':
      return `Forget: "${a.content}"`
    case 'navigateTo':
      return `Open ${a.path}`
  }
}

function ActionIcon({ type }: { type: NoorAction['type'] }) {
  const cls = 'h-3 w-3'
  switch (type) {
    case 'createTask':
      return <Plus className={cls} />
    case 'logQuranPages':
      return <BookOpen className={cls} />
    case 'startPomodoro':
    case 'logFocusSession':
      return <Timer className={cls} />
    case 'logPrayer':
      return <CheckCircle2 className={cls} />
    case 'logWorkout':
      return <Dumbbell className={cls} />
    case 'updateChallengeDay':
    case 'createChallenge':
      return <Trophy className={cls} />
    case 'waterTree':
      return <Droplets className={cls} />
    case 'plantTree':
      return <Sprout className={cls} />
    case 'addMemory':
    case 'forgetMemory':
      return <Brain className={cls} />
    case 'navigateTo':
      return <Compass className={cls} />
  }
}

function ActionChip({
  action,
  onExecute,
  executed,
}: {
  action: NoorAction
  onExecute: () => void
  executed: boolean
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => !executed && onExecute()}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all',
        executed
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
          : 'border-noor-500/30 bg-noor-500/5 text-noor-600 dark:text-noor-400 hover:bg-noor-500/15',
      )}
    >
      {executed ? <CheckCircle2 className="h-3 w-3" /> : <ActionIcon type={action.type} />}
      {executed ? 'Done' : actionLabel(action)}
    </motion.button>
  )
}

// ─── Action executor ────────────────────────────────────────────────────────

function useActionExecutor() {
  const navigate = useNavigate()
  const createTask = useCreateTask()
  const upsertPrayer = useUpsertPrayer()
  const createQuranLog = useCreateQuranLog()
  const createFocus = useCreateFocusSession()
  const createWorkout = useCreateWorkout()
  const incChallenge = useIncrementChallenge()
  const createChallenge = useCreateChallenge()
  const plantTree = usePlantTree()
  const waterTree = useWaterTree()
  const addMemory = useAddMemory()
  const forgetMemory = useForgetMemory()
  const { data: challenges } = useChallenges()

  return useCallback(
    async (action: NoorAction): Promise<void> => {
      const today = localDateString()
      switch (action.type) {
        case 'createTask':
          await createTask.mutateAsync({
            title: action.title,
            priority: (action.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
            due_date: action.due_date,
          })
          return
        case 'logPrayer':
          await upsertPrayer.mutateAsync({
            date: today,
            prayer: action.prayer as PrayerName,
            status: action.status as PrayerStatus,
          })
          return
        case 'logQuranPages':
          await createQuranLog.mutateAsync({
            date: today,
            surah_from: 1,
            ayah_from: 1,
            surah_to: 1,
            ayah_to: 1,
            pages_read: action.pages,
          })
          return
        case 'startPomodoro':
          await createFocus.mutateAsync({ type: 'pomodoro', duration_mins: action.duration })
          navigate('/focus')
          return
        case 'logFocusSession': {
          const t = (action.session_type ?? 'pomodoro') as
            | 'pomodoro'
            | 'flow'
            | 'short_break'
            | 'long_break'
          await createFocus.mutateAsync({ type: t, duration_mins: action.duration_mins })
          return
        }
        case 'logWorkout':
          await createWorkout.mutateAsync({
            type: action.workout_type as WorkoutType,
            title: action.title,
            duration_mins: action.duration_mins,
            date: today,
          })
          return
        case 'updateChallengeDay': {
          const target = (challenges ?? []).find((c) =>
            c.title.toLowerCase().includes(action.title.toLowerCase()),
          )
          if (!target) throw new Error(`No challenge matching "${action.title}"`)
          await incChallenge.mutateAsync({
            id: target.id,
            currentDays: target.current_days,
            targetDays: target.target_days,
          })
          return
        }
        case 'createChallenge':
          await createChallenge.mutateAsync({
            title: action.title,
            target_days: action.target_days,
            category: action.category,
            start_date: today,
          })
          return
        case 'plantTree':
          await plantTree.mutateAsync({ species: action.species as TreeSpecies })
          return
        case 'waterTree': {
          const { data } = await import('@/lib/supabase').then(async (m) => {
            const u = (await m.supabase.auth.getUser()).data.user
            if (!u) return { data: null }
            return await m.supabase
              .from('garden_trees')
              .select('id')
              .eq('user_id', u.id)
              .neq('stage', 'ancient')
              .order('planted_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          })
          if (!data?.id) throw new Error('No trees to water — plant one first.')
          await waterTree.mutateAsync(data.id)
          return
        }
        case 'addMemory':
          await addMemory.mutateAsync({
            content: action.content,
            kind: (action.kind as 'fact' | 'preference' | 'goal' | 'context') ?? 'fact',
          })
          return
        case 'forgetMemory':
          await forgetMemory.mutateAsync(action.content)
          return
        case 'navigateTo':
          navigate(action.path)
          return
      }
    },
    [
      navigate,
      createTask,
      upsertPrayer,
      createQuranLog,
      createFocus,
      createWorkout,
      incChallenge,
      createChallenge,
      plantTree,
      waterTree,
      addMemory,
      forgetMemory,
      challenges,
    ],
  )
}

// ─── Bubbles ────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const execute = useActionExecutor()
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  const { cleanText, actions } = parseActions(msg.content)

  const handleAction = useCallback(
    async (action: NoorAction, idx: number) => {
      setExecutedActions((prev) => new Set([...prev, idx]))
      setActionError(null)
      try {
        await execute(action)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Could not run action')
        setExecutedActions((prev) => {
          const next = new Set(prev)
          next.delete(idx)
          return next
        })
      }
    },
    [execute],
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
              onExecute={() => handleAction(a, i)}
              executed={executedActions.has(i)}
            />
          ))}
        </div>
      )}
      {actionError && <p className="ml-9 mt-1 text-[10px] text-destructive">{actionError}</p>}
    </motion.div>
  )
}

function StreamingBubble({ text }: { text: string }) {
  const { cleanText } = parseActions(text)

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
        {cleanText && (
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

// ─── Memory panel ────────────────────────────────────────────────────────────

function MemoryPanel({ onClose }: { onClose: () => void }) {
  const { data: memories } = useMemories()
  const deleteMem = useDeleteMemory()
  const list = memories ?? []

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-0 top-0 h-full w-72 bg-card border-l border-border shadow-xl flex flex-col z-20"
    >
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-noor-500" />
          <h3 className="text-sm font-semibold">What Noor remembers</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Noor hasn&apos;t stored any memories yet. Share something about yourself in chat and ask
            Noor to remember it.
          </p>
        ) : (
          list.map((m) => (
            <div
              key={m.id}
              className="group rounded-xl border border-border bg-muted/40 p-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-foreground flex-1">{m.content}</p>
                <button
                  onClick={() => deleteMem.mutate(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                  aria-label="Forget"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1 capitalize">{m.kind}</p>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

// ─── Starters ────────────────────────────────────────────────────────────────

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
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [showMemory, setShowMemory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<RecordingHandle | null>(null)
  const lastSpokenIdRef = useRef<string | null>(null)

  const { data: messages, isLoading } = useChatHistory()
  const { data: memories } = useMemories()
  const context = useDashboardContext()
  const memoryString = useMemo(() => {
    if (!memories || memories.length === 0) return undefined
    return memories
      .slice(0, 30)
      .map((m) => `- ${m.content}${m.kind !== 'fact' ? ` (${m.kind})` : ''}`)
      .join('\n')
  }, [memories])
  const { send, streamingText, isStreaming, abort } = useStreamMessage(context, memoryString)
  const clearChat = useClearChat()

  const voiceInSupported = isAudioRecordingSupported()

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (messages && messages.length > 0) scrollToBottom(false)
  }, [messages, scrollToBottom])

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
    async (text: string, audio?: AudioCapture) => {
      const msg = text.trim()
      if (!msg && !audio) return
      if (isStreaming) return
      setInput('')
      setSendError(null)
      stopSpeaking()
      try {
        await send(msg, history, audio)
        setTimeout(() => scrollToBottom(), 50)
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    },
    [send, history, isStreaming, scrollToBottom],
  )

  // Auto-speak the latest assistant message when ttsEnabled
  useEffect(() => {
    if (!ttsEnabled || !messages || messages.length === 0 || isStreaming) return
    const last = messages[messages.length - 1]
    if (last.role !== 'assistant' || last.id === lastSpokenIdRef.current) return
    lastSpokenIdRef.current = last.id
    const { cleanText } = parseActions(last.content)
    if (cleanText) {
      speak(cleanText).catch((e) => {
        console.warn('[noor] tts failed', e)
      })
    }
  }, [messages, ttsEnabled, isStreaming])

  useEffect(() => () => stopSpeaking(), [])

  const handleStartRecording = useCallback(async () => {
    if (!voiceInSupported || recording || isStreaming || transcribing) return
    setVoiceError(null)
    stopSpeaking()
    try {
      const rec = await startRecording()
      recorderRef.current = rec
      setRecording(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start recording.'
      setVoiceError(/Permission|denied/i.test(msg) ? 'Microphone access denied.' : msg)
    }
  }, [voiceInSupported, recording, isStreaming, transcribing])

  const handleStopRecording = useCallback(async () => {
    if (!recorderRef.current) return
    const rec = recorderRef.current
    recorderRef.current = null
    setRecording(false)
    setTranscribing(true)
    try {
      const audio = await rec.stop()
      if (!audio) {
        setTranscribing(false)
        return
      }
      // The Omni model handles transcription. We send empty text so the model
      // takes the audio as the user message and responds to it.
      await handleSend('', audio)
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Recording failed.')
    } finally {
      setTranscribing(false)
    }
  }, [handleSend])

  const handleCancelRecording = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
    setRecording(false)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleNewChat = () => {
    if (!messages || messages.length === 0) return
    if (window.confirm('Start a new chat? Your previous conversation will be cleared.')) {
      stopSpeaking()
      clearChat.mutate()
      lastSpokenIdRef.current = null
    }
  }

  const toggleTts = () => {
    setTtsEnabled((on) => {
      if (on) stopSpeaking()
      return !on
    })
  }

  const isEmpty = !messages || messages.length === 0

  return (
    // h-full + min-h-0 so we fill the parent <main> exactly without overflowing
    // it. flex column locks the header to top, input to bottom, and only the
    // messages list scrolls — the global app header (theme/bell) stays put.
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-noor-400 to-noor-600 shadow-md shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground">Noor</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {recording
                ? 'Listening…'
                : transcribing
                  ? 'Transcribing…'
                  : isStreaming
                    ? 'Thinking…'
                    : 'Your AI companion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isEmpty && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
          <button
            onClick={toggleTts}
            className={cn(
              'rounded-lg p-2 transition-colors',
              ttsEnabled
                ? 'text-noor-500 bg-noor-500/10 hover:bg-noor-500/20'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted',
            )}
            aria-label={ttsEnabled ? 'Mute Noor' : 'Read aloud'}
            title={ttsEnabled ? 'Voice reply: on' : 'Voice reply: off'}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowMemory((v) => !v)}
            className={cn(
              'rounded-lg p-2 transition-colors',
              showMemory
                ? 'text-noor-500 bg-noor-500/10'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted',
            )}
            aria-label="What Noor remembers"
            title={`Memories${memories ? ` (${memories.length})` : ''}`}
          >
            <Brain className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMemory && <MemoryPanel onClose={() => setShowMemory(false)} />}
      </AnimatePresence>

      {/* Scrolling message area — the ONLY scroll in this view */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
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
                I&apos;m Noor — I can see all your data, remember what matters, and act on your
                behalf. Type or tap the mic to talk.
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
          {voiceError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {voiceError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-4 rounded-full bg-background border border-border p-2 shadow-lg text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer (sticky bottom) */}
      <div className="shrink-0 border-t border-border px-4 py-3 bg-background">
        {recording && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-noor-500/10 border border-noor-500/30 px-3 py-2 text-xs text-noor-700 dark:text-noor-300">
            <div className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-noor-500 animate-pulse" />
              <span>Recording… tap stop when done</span>
            </div>
            <button
              onClick={handleCancelRecording}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel recording"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {transcribing && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Sending voice to Noor…</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          {voiceInSupported && (
            <Button
              size="sm"
              variant={recording ? 'default' : 'outline'}
              className={cn(
                'h-10 w-10 shrink-0 rounded-xl p-0',
                recording && 'animate-pulse bg-destructive hover:bg-destructive/90',
              )}
              onClick={recording ? handleStopRecording : handleStartRecording}
              disabled={isStreaming || transcribing}
              aria-label={recording ? 'Stop and send' : 'Start voice input'}
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={recording ? 'Listening…' : 'Message Noor…'}
            rows={1}
            disabled={isStreaming || recording || transcribing}
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
              disabled={!input.trim() || recording || transcribing}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
          {voiceInSupported
            ? 'Enter to send · Shift+Enter for new line · 🎤 to speak'
            : 'Enter to send · Shift+Enter for new line'}
        </p>
      </div>
    </div>
  )
}
