import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, SkipForward, Timer, Coffee, Zap, Sliders } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { useCreateFocusSession, useCompleteFocusSession, useFocusSessions } from '@/hooks/useFocus'
import type { SessionType } from '@/lib/database.types'
import { cn } from '@/lib/cn'

// ─── Session presets ──────────────────────────────────────────────────────────

interface Preset {
  type: SessionType
  label: string
  minutes: number
  icon: typeof Timer
  color: string
  ringColor: string
}

const PRESETS: Preset[] = [
  {
    type: 'pomodoro',
    label: 'Pomodoro',
    minutes: 25,
    icon: Timer,
    color: 'text-noor-500',
    ringColor: 'stroke-noor-500',
  },
  {
    type: 'short_break',
    label: 'Short Break',
    minutes: 5,
    icon: Coffee,
    color: 'text-accent-500',
    ringColor: 'stroke-accent-500',
  },
  {
    type: 'long_break',
    label: 'Long Break',
    minutes: 15,
    icon: Coffee,
    color: 'text-gold-500',
    ringColor: 'stroke-gold-500',
  },
  {
    type: 'flow',
    label: 'Flow State',
    minutes: 50,
    icon: Zap,
    color: 'text-destructive',
    ringColor: 'stroke-destructive',
  },
]

const CUSTOM_PRESET_BASE: Omit<Preset, 'minutes'> = {
  type: 'pomodoro',
  label: 'Custom',
  icon: Sliders,
  color: 'text-noor-500',
  ringColor: 'stroke-noor-500',
}

const MIN_CUSTOM_MINUTES = 1
const MAX_CUSTOM_MINUTES = 240

// ─── Circular progress ring ───────────────────────────────────────────────────

function CircularRing({ progress, ringColor }: { progress: number; ringColor: string }) {
  const r = 88
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - progress)

  return (
    <svg className="absolute inset-0 -rotate-90" width="100%" height="100%" viewBox="0 0 200 200">
      {/* Track */}
      <circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-muted/30"
      />
      {/* Progress */}
      <motion.circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        className={ringColor}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        animate={{ strokeDashoffset: dash }}
        transition={{ duration: 0.5, ease: 'linear' }}
      />
    </svg>
  )
}

// ─── Timer display ────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Session history row ──────────────────────────────────────────────────────

function SessionRow({
  type,
  duration,
  completedAt,
}: {
  type: SessionType
  duration: number
  completedAt: string
}) {
  const preset = PRESETS.find((p) => p.type === type) ?? PRESETS[0]
  const Icon = preset.icon
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Icon className={cn('h-4 w-4 shrink-0', preset.color)} />
        <div>
          <p className="text-sm font-medium text-foreground">{preset.label}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(completedAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{duration} min</span>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

type TimerState = 'idle' | 'running' | 'paused' | 'done'

export default function FocusView() {
  const [preset, setPreset] = useState<Preset>(PRESETS[0])
  const [isCustom, setIsCustom] = useState(false)
  const [customMinutes, setCustomMinutes] = useState(30)
  const [remaining, setRemaining] = useState(preset.minutes * 60)
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const createSession = useCreateFocusSession()
  const completeSession = useCompleteFocusSession()
  const { data: sessions, isLoading: loadingSessions } = useFocusSessions()

  const totalSecs = preset.minutes * 60
  const progress = 1 - remaining / totalSecs

  // Tick
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setTimerState('done')
            return 0
          }
          return r - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState])

  // Auto-complete when timer hits zero
  useEffect(() => {
    if (timerState === 'done' && sessionId) {
      completeSession.mutate({
        id: sessionId,
        coinsEarned: Math.floor(preset.minutes / 5),
        durationMins: preset.minutes,
      })
      setSessionId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState])

  const handleStart = useCallback(async () => {
    if (timerState === 'paused') {
      setTimerState('running')
      return
    }
    const session = await createSession.mutateAsync({
      type: preset.type,
      duration_mins: preset.minutes,
    })
    setSessionId(session.id)
    setTimerState('running')
  }, [timerState, createSession, preset])

  const handlePause = useCallback(() => setTimerState('paused'), [])

  const handleReset = useCallback(() => {
    setTimerState('idle')
    setRemaining(preset.minutes * 60)
    setSessionId(null)
  }, [preset])

  const handleSkip = useCallback(() => {
    if (sessionId) {
      completeSession.mutate({ id: sessionId, coinsEarned: 0, durationMins: preset.minutes })
      setSessionId(null)
    }
    setTimerState('done')
  }, [sessionId, completeSession, preset.minutes])

  const handlePresetChange = useCallback((p: Preset) => {
    setIsCustom(false)
    setPreset(p)
    setRemaining(p.minutes * 60)
    setTimerState('idle')
    setSessionId(null)
  }, [])

  const handleCustomSelect = useCallback(() => {
    const mins = Math.min(
      MAX_CUSTOM_MINUTES,
      Math.max(MIN_CUSTOM_MINUTES, Math.round(customMinutes || 1)),
    )
    setIsCustom(true)
    setPreset({ ...CUSTOM_PRESET_BASE, minutes: mins })
    setRemaining(mins * 60)
    setTimerState('idle')
    setSessionId(null)
  }, [customMinutes])

  const handleCustomMinutesChange = useCallback(
    (value: number) => {
      const clamped = Math.min(MAX_CUSTOM_MINUTES, Math.max(MIN_CUSTOM_MINUTES, value))
      setCustomMinutes(clamped)
      if (isCustom && timerState === 'idle') {
        setPreset({ ...CUSTOM_PRESET_BASE, minutes: clamped })
        setRemaining(clamped * 60)
      }
    },
    [isCustom, timerState],
  )

  const todaySessions =
    sessions?.filter((s) => {
      const d = new Date(s.started_at).toISOString().split('T')[0]
      return d === new Date().toISOString().split('T')[0] && s.completed
    }) ?? []

  const todayMins = todaySessions.reduce((sum, s) => sum + s.duration_mins, 0)

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Focus</h1>
          <p className="text-sm text-muted-foreground">
            {todayMins > 0 ? `${todayMins} min focused today` : 'Start a session to begin focusing'}
          </p>
        </div>

        {/* Desktop 2-col: timer left, history right */}
        <div className="lg:grid lg:grid-cols-[440px_1fr] lg:gap-6 space-y-5 lg:space-y-0">
          {/* Left: preset selector + timer */}
          <div className="space-y-4">
            {/* Preset selector */}
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((p) => {
                const Icon = p.icon
                const selected = !isCustom && preset.type === p.type
                return (
                  <button
                    key={p.type}
                    onClick={() => handlePresetChange(p)}
                    disabled={timerState === 'running'}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 border text-xs font-medium transition-all',
                      selected
                        ? 'border-noor-500 bg-noor-500/10 text-noor-600 dark:text-noor-400'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                      timerState === 'running' && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:block">{p.label}</span>
                    <span className="text-[10px]">{p.minutes}m</span>
                  </button>
                )
              })}
              <button
                onClick={handleCustomSelect}
                disabled={timerState === 'running'}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 border text-xs font-medium transition-all',
                  isCustom
                    ? 'border-noor-500 bg-noor-500/10 text-noor-600 dark:text-noor-400'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                  timerState === 'running' && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Sliders className="h-4 w-4" />
                <span className="hidden sm:block">Custom</span>
                <span className="text-[10px]">{isCustom ? `${preset.minutes}m` : '—'}</span>
              </button>
            </div>

            {/* Custom duration controls */}
            <AnimatePresence>
              {isCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                    <label
                      htmlFor="custom-minutes"
                      className="text-xs font-medium text-muted-foreground shrink-0"
                    >
                      Minutes
                    </label>
                    <input
                      id="custom-minutes"
                      type="number"
                      inputMode="numeric"
                      min={MIN_CUSTOM_MINUTES}
                      max={MAX_CUSTOM_MINUTES}
                      value={customMinutes}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (Number.isNaN(v)) {
                          setCustomMinutes(MIN_CUSTOM_MINUTES)
                          return
                        }
                        handleCustomMinutesChange(v)
                      }}
                      disabled={timerState === 'running'}
                      className={cn(
                        'w-20 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-sm text-foreground',
                        'outline-none focus:border-noor-500/50 tabular-nums',
                        timerState === 'running' && 'opacity-50 cursor-not-allowed',
                      )}
                    />
                    <input
                      type="range"
                      min={MIN_CUSTOM_MINUTES}
                      max={MAX_CUSTOM_MINUTES}
                      value={customMinutes}
                      onChange={(e) => handleCustomMinutesChange(parseInt(e.target.value, 10))}
                      disabled={timerState === 'running'}
                      className="flex-1 accent-noor-500"
                    />
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-12 text-right">
                      {customMinutes}m
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer ring */}
            <Card>
              <CardContent className="flex flex-col items-center py-8 gap-6">
                {/* Ring */}
                <div className="relative w-52 h-52 flex items-center justify-center">
                  <CircularRing progress={progress} ringColor={preset.ringColor} />
                  <div className="text-center">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={remaining}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          'text-5xl font-bold tabular-nums tracking-tight',
                          preset.color,
                        )}
                      >
                        {formatTime(remaining)}
                      </motion.p>
                    </AnimatePresence>
                    <p className="text-xs text-muted-foreground mt-1">{preset.label}</p>
                  </div>
                </div>

                {/* Done state message */}
                <AnimatePresence>
                  {timerState === 'done' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        MashaAllah! Session complete.
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Take a breath. You earned it.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="rounded-full p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>

                  {timerState === 'running' ? (
                    <Button size="lg" className="rounded-full h-14 w-14 p-0" onClick={handlePause}>
                      <Pause className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="rounded-full h-14 w-14 p-0"
                      onClick={handleStart}
                      disabled={timerState === 'done' || createSession.isPending}
                    >
                      <Play className="h-6 w-6 ml-0.5" />
                    </Button>
                  )}

                  <button
                    onClick={handleSkip}
                    disabled={timerState === 'idle' || timerState === 'done'}
                    className={cn(
                      'rounded-full p-2.5 transition-colors',
                      timerState === 'idle' || timerState === 'done'
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: today's sessions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today&apos;s Sessions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingSessions ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : todaySessions.length === 0 ? (
                <div className="py-10 text-center">
                  <Timer
                    className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-muted-foreground">No sessions yet today</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Complete a session to see it here.
                  </p>
                </div>
              ) : (
                <div>
                  {todaySessions.slice(0, 20).map((s) => (
                    <SessionRow
                      key={s.id}
                      type={s.type}
                      duration={s.duration_mins}
                      completedAt={s.ended_at ?? s.started_at}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </PageShell>
  )
}
