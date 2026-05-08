import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import {
  useRoom,
  useParticipants,
  useMessages,
  useRoomPresence,
  useUpdateTimer,
  useSendMessage,
  computeTimerRemaining,
} from '@/hooks/useStudyRooms'
import type { RoomMessage, RoomParticipant } from '@/lib/database.types'

// ─── Timer ring ───────────────────────────────────────────────────────────────

function TimerRing({ fraction, state }: { fraction: number; state: string }) {
  const r = 80
  const circ = 2 * Math.PI * r

  const color =
    state === 'running'
      ? 'var(--color-noor-500)'
      : state === 'paused'
        ? '#f59e0b'
        : state === 'done'
          ? '#10b981'
          : 'var(--color-muted-foreground)'

  return (
    <svg width={200} height={200} className="rotate-[-90deg]">
      <circle
        cx={100}
        cy={100}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        className="text-muted/40"
      />
      <motion.circle
        cx={100}
        cy={100}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: circ * (1 - fraction) }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Timer display ────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function TimerSection({ roomId, isHost }: { roomId: string; isHost: boolean }) {
  const { data: room } = useRoom(roomId)
  const updateTimer = useUpdateTimer()
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!room) return
    setRemaining(computeTimerRemaining(room))
    if (room.timer_state !== 'running') return

    const tick = setInterval(() => {
      const r = computeTimerRemaining(room)
      setRemaining(r)
      if (r <= 0) clearInterval(tick)
    }, 1000)

    return () => clearInterval(tick)
  }, [room])

  // Auto-done: when running timer hits 0, host marks it done
  useEffect(() => {
    if (!room || !isHost) return
    if (room.timer_state === 'running' && remaining <= 0) {
      updateTimer.mutate({ roomId, state: 'done' })
      toast.success('Session complete! MashaAllah 🎉')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, room?.timer_state, isHost])

  if (!room) return null

  const total = room.timer_duration * 60
  const fraction = total > 0 ? remaining / total : 0

  const handleStart = () => {
    updateTimer.mutate({
      roomId,
      state: 'running',
      startedAt: new Date().toISOString(),
      remaining: null,
    })
  }

  const handlePause = () => {
    updateTimer.mutate({ roomId, state: 'paused', remaining, startedAt: null })
  }

  const handleReset = () => {
    updateTimer.mutate({ roomId, state: 'idle', startedAt: null, remaining: null })
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="relative">
        <TimerRing fraction={fraction} state={room.timer_state} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-mono tabular-nums text-foreground">
            {formatTime(remaining)}
          </span>
          <span className="text-xs text-muted-foreground mt-1 capitalize">{room.timer_state}</span>
        </div>
      </div>

      {isHost && (
        <div className="flex items-center gap-2">
          {room.timer_state === 'idle' || room.timer_state === 'done' ? (
            <Button
              size="sm"
              className="gap-1.5 h-9"
              onClick={handleStart}
              disabled={updateTimer.isPending}
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          ) : room.timer_state === 'running' ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              onClick={handlePause}
              disabled={updateTimer.isPending}
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 h-9"
              onClick={handleStart}
              disabled={updateTimer.isPending}
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0"
            onClick={handleReset}
            disabled={updateTimer.isPending}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!isHost && <p className="text-xs text-muted-foreground">Timer controlled by the host</p>}
    </div>
  )
}

// ─── Participants panel ───────────────────────────────────────────────────────

function ParticipantsList({ participants }: { participants: RoomParticipant[] }) {
  function initials(name: string | null) {
    if (!name) return '?'
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-2 p-3">
      {participants.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No participants yet</p>
      )}
      <AnimatePresence mode="popLayout">
        {participants.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex items-center gap-2.5"
          >
            <div className="h-8 w-8 rounded-full bg-noor-500/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-noor-500">{initials(p.display_name)}</span>
            </div>
            <span className="text-sm text-foreground truncate">
              {p.display_name ?? 'Anonymous'}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  messages,
  userId,
  onSend,
  sending,
}: {
  messages: RoomMessage[]
  userId: string
  onSend: (text: string) => void
  sending: boolean
}) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-4">
            No messages yet &mdash; say salaam!
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.user_id === userId
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex flex-col gap-0.5', isMe ? 'items-end' : 'items-start')}
              >
                {!isMe && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    {msg.display_name ?? 'Anonymous'}
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words',
                    isMe
                      ? 'bg-noor-500 text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                  )}
                >
                  {msg.content}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Type a message..."
          maxLength={300}
          className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-noor-500/50"
        />
        <Button size="sm" className="h-9 px-3" onClick={submit} disabled={!text.trim() || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'participants'

export default function StudyRoomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const [tab, setTab] = useState<Tab>('chat')
  const [codeCopied, setCodeCopied] = useState(false)

  const { data: room, isLoading: roomLoading, error: roomError } = useRoom(id)
  const { data: participants = [] } = useParticipants(id)
  const { data: messages = [] } = useMessages(id)
  const sendMessage = useSendMessage()

  useRoomPresence(id, user?.id, profile?.display_name ?? null)

  const isHost = !!user && !!room && room.owner_id === user.id

  const handleSend = useCallback(
    (content: string) => {
      if (!user || !id) return
      sendMessage.mutate({
        roomId: id,
        userId: user.id,
        displayName: profile?.display_name ?? null,
        content,
      })
    },
    [user, id, profile, sendMessage],
  )

  const copyCode = () => {
    if (!room) return
    navigator.clipboard.writeText(room.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (roomLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-noor-500" />
      </div>
    )
  }

  if (roomError || !room) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">Room not found or you do not have access.</p>
        <Button variant="outline" onClick={() => navigate('/rooms')}>
          Back to rooms
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg shrink-0"
          onClick={() => navigate('/rooms')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{room.name}</h1>
          <p className="text-xs text-muted-foreground">
            {participants.length}/{room.max_participants} participants
          </p>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1.5 text-xs font-mono font-semibold text-foreground hover:bg-muted/70 transition-colors"
        >
          {codeCopied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {room.code}
        </button>
      </div>

      {/* Timer */}
      {id && <TimerSection roomId={id} isHost={isHost} />}

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0 px-4">
        {(['chat', 'participants'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors capitalize',
              tab === t
                ? 'border-noor-500 text-noor-500'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'chat' ? (
              <MessageSquare className="h-3.5 w-3.5" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            {t}
            {t === 'participants' && (
              <span className="rounded-full bg-muted px-1.5 text-[10px]">
                {participants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="h-full flex flex-col"
            >
              {user && (
                <ChatPanel
                  messages={messages}
                  userId={user.id}
                  onSend={handleSend}
                  sending={sendMessage.isPending}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="participants"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full overflow-y-auto"
            >
              <ParticipantsList participants={participants} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
