import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Play, Pause, RotateCcw, SkipForward, Bell, Coins } from 'lucide-react-native'
import { HubContent, Muted, Card, Gradient, Segmented, FadeIn } from '~/components/ui'
import { PRESETS, formatClock, type Preset } from '~/lib/focusPresets'
import { afterStart, pauseSession, resumeSession, clearSessionEffects } from '~/lib/focusSession'
import { durationLabel } from '~/lib/format'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useCreateFocusSession, useCompleteFocusSession, useFocusSessions, useTodayFocusMinutes } from '@/hooks/useFocus'
import { useGardenTrees } from '@/hooks/useGarden'
import { SPECIES_INFO } from '@/lib/api/garden'
import { coinsFor } from '@/lib/rewards'
import { localDateString, daysAgo } from '@/lib/dates'
import type { SessionType } from '@/lib/database.types'

// The Timer section of the Focus hub.
//
// The timer itself is the shared useFocusTimer hook: it computes remaining
// time from the wall clock, so it stays correct while the app is suspended,
// and it is synced across instances so the pinned mini-timer on other tabs
// shows the same session. Native adds an end-of-session alarm with sound and
// a pinned "in progress" notification on Android.

const RING = 216
const STROKE = 12
const RADIUS = (RING - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

const HERO = ['#023728', '#0b5c4c', '#0f766e'] as const

function Ring({ remaining, total, color }: { remaining: number; total: number; color: string }) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  return (
    <View style={{ width: RING, height: RING }} className="items-center justify-center">
      <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
        <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={CIRC * (1 - fraction)}
          rotation={-90}
          origin={`${RING / 2}, ${RING / 2}`}
        />
      </Svg>
      <Text
        className="text-[54px] font-bold leading-[60px] tracking-tight text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatClock(remaining)}
      </Text>
      <Text className="text-xs text-white/80">remaining</Text>
    </View>
  )
}

function Control({
  icon,
  label,
  onPress,
  disabled,
  primary,
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(primary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      className={
        primary
          ? 'h-[46px] flex-row items-center justify-center gap-2 rounded-[14px] bg-white px-6'
          : 'h-[46px] w-[46px] items-center justify-center rounded-[14px] border border-white/20 bg-white/15'
      }
      style={disabled ? { opacity: 0.4 } : undefined}
    >
      {icon}
      {primary ? <Text className="text-[15px] font-semibold text-noor-800">{label}</Text> : null}
    </Pressable>
  )
}

export default function FocusScreen() {
  const timer = useFocusTimer(PRESETS[0])
  const createSession = useCreateFocusSession()
  const completeSession = useCompleteFocusSession()
  const { data: todayMinutes } = useTodayFocusMinutes()
  const { data: sessions } = useFocusSessions()
  const { data: trees } = useGardenTrees()
  const [error, setError] = useState<string | null>(null)

  const { preset, remaining, state, sessionId, hydrated } = timer
  const total = preset.minutes * 60
  const current: Preset = PRESETS.find((p) => p.type === preset.type) ?? PRESETS[0]

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

    clearSessionEffects()
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
      resumeSession(timer)
      return
    }
    setError(null)
    try {
      const session = await createSession.mutateAsync({ type: preset.type, duration_mins: preset.minutes })
      timer.start(session.id, preset)
      afterStart({ preset, remaining: total })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start session.')
    }
  }, [hydrated, state, preset, total, timer, createSession])

  const handlePause = useCallback(() => pauseSession(timer), [timer])

  const handleReset = useCallback(() => {
    timer.reset(preset)
    clearSessionEffects()
  }, [timer, preset])

  const handleSkip = useCallback(() => {
    clearSessionEffects()
    if (sessionId) {
      // Credit only the time actually served, never the preset length.
      const elapsedMins = Math.max(0, preset.minutes - remaining / 60)
      completingRef.current = sessionId
      completeSession.mutate({ id: sessionId, elapsedMins })
    }
    timer.reset(preset)
  }, [sessionId, preset, remaining, completeSession, timer])

  const running = state === 'running'
  const locked = running || state === 'paused'
  const projected = coinsFor({ kind: 'focus', minutes: preset.minutes })

  // Stats strip.
  const today = localDateString()
  const weekStart = useMemo(() => localDateString(daysAgo(6)), [])
  const stats = useMemo(() => {
    const done = (sessions ?? []).filter((s) => s.completed)
    const byDay = (s: { started_at: string }) => localDateString(new Date(s.started_at))
    const todayCount = done.filter((s) => byDay(s) === today).length
    const weekMins = done
      .filter((s) => byDay(s) >= weekStart)
      .reduce((sum, s) => sum + s.duration_mins, 0)
    return { todayCount, weekMins }
  }, [sessions, today, weekStart])

  const newestTree = useMemo(
    () =>
      [...(trees ?? [])]
        .filter((t) => t.stage !== 'ancient')
        .sort((a, b) => (a.planted_at < b.planted_at ? 1 : -1))[0] ?? null,
    [trees],
  )

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Preset picker — locked while a session is in flight, as on web. */}
        <FadeIn index={0}>
          <View pointerEvents={locked ? 'none' : 'auto'} style={locked ? { opacity: 0.55 } : undefined}>
            <Segmented
              options={PRESETS.map((p) => ({ value: p.type, label: p.short }))}
              value={preset.type as SessionType}
              onChange={(type) => {
                const next = PRESETS.find((p) => p.type === type)
                if (next) timer.setPreset(next)
              }}
            />
          </View>
        </FadeIn>

        {/* The timer */}
        <FadeIn index={1}>
          <Gradient
            colors={HERO}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            radius={24}
            orbs
            style={{
              backgroundColor: '#0b5c4c',
              shadowColor: '#023728',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.35,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <View className="items-center px-5 pb-5 pt-5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/80">
                {current.label} · {preset.minutes} min
              </Text>
              <View className="py-3">
                <Ring remaining={remaining} total={total} color={current.ringColor} />
              </View>
              <View className="flex-row items-center justify-center gap-2.5">
                <Control
                  icon={<RotateCcw size={18} color="#ffffff" />}
                  label="Reset"
                  onPress={handleReset}
                  disabled={state === 'idle'}
                />
                {running ? (
                  <Control icon={<Pause size={18} color="#115e59" fill="#115e59" />} label="Pause" onPress={handlePause} primary />
                ) : (
                  <Control
                    icon={<Play size={18} color="#115e59" fill="#115e59" />}
                    label={state === 'paused' ? 'Resume' : 'Start'}
                    onPress={() => void handleStart()}
                    disabled={!hydrated || createSession.isPending}
                    primary
                  />
                )}
                <Control
                  icon={<SkipForward size={18} color="#ffffff" />}
                  label="Skip"
                  onPress={handleSkip}
                  disabled={state === 'idle'}
                />
              </View>
              <View className="mt-4 flex-row items-center gap-1.5">
                <Coins size={13} color="#fde68a" />
                <Text className="text-xs text-white/85">
                  Earns {projected.coins} coins
                  {newestTree ? ` · waters your ${SPECIES_INFO[newestTree.species].name}` : ''}
                </Text>
              </View>
            </View>
          </Gradient>
        </FadeIn>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <Text className="text-sm text-destructive">{error}</Text>
          </Card>
        ) : null}

        {/* Stats strip */}
        <FadeIn index={2}>
          <Card className="flex-row p-0">
            {[
              { v: durationLabel(todayMinutes ?? 0), k: 'today' },
              { v: String(stats.todayCount), k: stats.todayCount === 1 ? 'session' : 'sessions' },
              { v: durationLabel(stats.weekMins), k: 'this week' },
            ].map((cell, i) => (
              <View key={cell.k} className={['flex-1 items-center gap-0.5 py-3', i > 0 ? 'border-l border-border' : ''].join(' ')}>
                <Text className="text-[20px] font-bold tracking-tight text-foreground">{cell.v}</Text>
                <Muted className="text-[11px] font-medium">{cell.k}</Muted>
              </View>
            ))}
          </Card>
        </FadeIn>

        <FadeIn index={3}>
          <Card className="flex-row items-center gap-3 px-4 py-3">
            <Bell size={16} color="#8a9793" />
            <Muted className="flex-1 text-xs">
              Runs in the background, anchored to the clock. You will hear a chime when it ends,
              and the session stays pinned above the tab bar while you use the rest of the app.
            </Muted>
          </Card>
        </FadeIn>
      </View>
    </HubContent>
  )
}
