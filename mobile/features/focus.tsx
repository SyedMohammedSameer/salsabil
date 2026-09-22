import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Play, Pause, RotateCcw, SkipForward, Timer, Coffee, Zap } from 'lucide-react-native'
import { HubContent, Muted, Card, Button } from '~/components/ui'
import { scheduleFocusSessionEnd, cancelFocusSessionEnd } from '~/lib/notifications'
import { useFocusTimer, type FocusPresetInfo } from '@/hooks/useFocusTimer'
import { useCreateFocusSession, useCompleteFocusSession } from '@/hooks/useFocus'
import { coinsFor } from '@/lib/rewards'
import type { SessionType } from '@/lib/database.types'

// Ported from src/views/focus/FocusView.tsx with the same presets and session
// semantics. The timer itself is the shared useFocusTimer hook: it computes
// remaining time from the wall clock, so it stays correct while the app is
// suspended. What native adds is a scheduled local notification, so the user is
// actually told the session ended even if the app was never reopened.

interface Preset extends FocusPresetInfo {
  Icon: typeof Timer
}

const PRESETS: Preset[] = [
  { type: 'pomodoro', label: 'Pomodoro', minutes: 25, Icon: Timer, color: '#14b8a6', ringColor: '#14b8a6' },
  { type: 'short_break', label: 'Short Break', minutes: 5, Icon: Coffee, color: '#10b981', ringColor: '#10b981' },
  { type: 'long_break', label: 'Long Break', minutes: 15, Icon: Coffee, color: '#f59e0b', ringColor: '#f59e0b' },
  { type: 'flow', label: 'Flow State', minutes: 50, Icon: Zap, color: '#ef4444', ringColor: '#ef4444' },
]

const RING_SIZE = 260
const STROKE = 14
const RADIUS = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

function iconFor(type: SessionType): typeof Timer {
  return PRESETS.find((p) => p.type === type)?.Icon ?? Timer
}

function CountdownRing({
  remaining,
  total,
  color,
}: {
  remaining: number
  total: number
  color: string
}) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE }} className="items-center justify-center">
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="rgba(127,127,127,0.18)"
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          // Start the sweep at 12 o'clock rather than 3.
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text className="text-5xl font-semibold tabular-nums text-foreground">
        {formatClock(remaining)}
      </Text>
    </View>
  )
}

export default function FocusScreen() {
  const timer = useFocusTimer(PRESETS[0])
  const createSession = useCreateFocusSession()
  const completeSession = useCompleteFocusSession()
  const [error, setError] = useState<string | null>(null)

  const { preset, remaining, state, sessionId, hydrated } = timer
  const total = preset.minutes * 60
  const color = preset.ringColor

  // Complete on the server when the countdown reaches zero. Guarded by a ref so
  // a re-render during the mutation cannot fire it twice.
  const completingRef = useRef<string | null>(null)
  useEffect(() => {
    if (state !== 'done') return
    if (!sessionId) {
      timer.reset(preset)
      return
    }
    if (completingRef.current === sessionId) return
    completingRef.current = sessionId

    void cancelFocusSessionEnd()
    completeSession.mutate(
      { id: sessionId, elapsedMins: preset.minutes },
      {
        onSuccess: () => {
          setError(null)
          timer.reset(preset)
        },
        onError: (e) => {
          // Leave the 'done' state visible so the session is not silently lost.
          completingRef.current = null
          setError(e instanceof Error ? e.message : 'Could not save session.')
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sessionId])

  const handleStart = useCallback(async () => {
    // Storage is async on native: before hydration the state reads 'idle' even
    // when a session is already running, and starting here would orphan it.
    if (!hydrated) return

    if (state === 'paused') {
      timer.resume()
      const endsAt = new Date(Date.now() + remaining * 1000)
      void scheduleFocusSessionEnd(endsAt, preset.minutes)
      return
    }

    setError(null)
    try {
      const session = await createSession.mutateAsync({
        type: preset.type,
        duration_mins: preset.minutes,
      })
      timer.start(session.id, preset)
      void scheduleFocusSessionEnd(new Date(Date.now() + total * 1000), preset.minutes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start session.')
    }
  }, [hydrated, state, remaining, preset, total, timer, createSession])

  const handlePause = useCallback(() => {
    timer.pause()
    // The session no longer ends when it would have, so drop the reminder.
    void cancelFocusSessionEnd()
  }, [timer])

  const handleReset = useCallback(() => {
    timer.reset(preset)
    void cancelFocusSessionEnd()
  }, [timer, preset])

  const handleSkip = useCallback(() => {
    void cancelFocusSessionEnd()
    if (sessionId) {
      // Credit only the time actually served, never the preset length.
      const elapsedMins = Math.max(0, preset.minutes - remaining / 60)
      completingRef.current = sessionId
      completeSession.mutate({ id: sessionId, elapsedMins })
    }
    timer.reset(preset)
  }, [sessionId, preset, remaining, completeSession, timer])

  const running = state === 'running'
  const projected = coinsFor({ kind: 'focus', minutes: preset.minutes })

  return (
    <HubContent>
      <Muted className="pb-3 pt-1">
        {preset.label} · {preset.minutes} min · earns {projected.coins} coins
      </Muted>

      {/* Preset picker — locked while a session is in flight, as on web. */}
      <View className="flex-row flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = preset.type === p.type && preset.minutes === p.minutes
          const locked = running || state === 'paused'
          return (
            <Pressable
              key={p.type}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: locked }}
              disabled={locked}
              onPress={() => timer.setPreset(p)}
              className="flex-row items-center gap-1.5 rounded-lg border px-3 py-2"
              style={{
                borderColor: active ? p.color : 'transparent',
                backgroundColor: active ? `${p.color}1a` : 'rgba(127,127,127,0.08)',
                opacity: locked && !active ? 0.4 : 1,
              }}
            >
              <p.Icon size={14} color={active ? p.color : '#83938f'} />
              <Text className="text-xs" style={{ color: active ? p.color : '#83938f' }}>
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View className="items-center py-8">
        <CountdownRing remaining={remaining} total={total} color={color} />
      </View>

      {error ? (
        <Card className="mb-3 border-destructive/40 bg-destructive/5">
          <Text className="text-sm text-destructive">{error}</Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {running ? (
          <Button variant="outline" onPress={handlePause}>
            Pause
          </Button>
        ) : (
          <Button onPress={handleStart} disabled={!hydrated} loading={createSession.isPending}>
            {state === 'paused' ? 'Resume' : 'Start session'}
          </Button>
        )}

        <View className="flex-row gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onPress={handleReset}
            disabled={state === 'idle'}
          >
            Reset
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onPress={handleSkip}
            disabled={state === 'idle'}
          >
            Skip
          </Button>
        </View>
      </View>

      <Card className="mt-6 gap-1">
        <Text className="text-xs font-medium text-foreground">Runs in the background</Text>
        <Muted className="text-xs">
          The countdown is anchored to the clock, not to this screen, so it stays accurate if you
          leave the app. You will get a notification when the session ends.
        </Muted>
      </Card>
    </HubContent>
  )
}
