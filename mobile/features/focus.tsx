import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Play, Pause, RotateCcw, SkipForward, Bell, Coins, Minus, Plus, Sprout } from 'lucide-react-native'
import { HubContent, Muted, Card, Gradient, Segmented, FadeIn } from '~/components/ui'
import { SvgTree } from '~/components/garden/SvgTree'
import {
  PRESETS,
  CUSTOM_MIN,
  CUSTOM_MAX,
  CUSTOM_QUICK,
  customPreset,
  describePreset,
  presetKey,
  formatClock,
  type PresetKey,
} from '~/lib/focusPresets'
import { useFocusControl, treeName } from '~/lib/focusControl'
import { durationLabel } from '~/lib/format'
import { hubHref } from '~/lib/nav'
import { useFocusSessions, useTodayFocusMinutes } from '@/hooks/useFocus'
import { coinsFor } from '@/lib/rewards'
import { localDateString, daysAgo } from '@/lib/dates'
import { storage } from '@/lib/platform/storage'
import { cn } from '@/lib/cn'
import type { GardenTree } from '@/lib/database.types'

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

// ─── Custom length ───────────────────────────────────────────────────────────

const CUSTOM_KEY = 'salsabil-focus-custom-mins'

function DurationPicker({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const step = (delta: number) => {
    void Haptics.selectionAsync()
    onChange(Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, minutes + delta)))
  }
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-foreground">Session length</Text>
        <Muted className="text-xs">
          {CUSTOM_MIN} to {CUSTOM_MAX} min
        </Muted>
      </View>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Five minutes shorter"
          onPress={() => step(-5)}
          disabled={minutes <= CUSTOM_MIN}
          className="h-11 w-11 items-center justify-center rounded-full bg-muted"
          style={minutes <= CUSTOM_MIN ? { opacity: 0.4 } : undefined}
        >
          <Minus size={18} color="#8a9793" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[34px] font-bold leading-[40px] tracking-tight text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
            {minutes}
          </Text>
          <Muted className="text-xs">minutes</Muted>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Five minutes longer"
          onPress={() => step(5)}
          disabled={minutes >= CUSTOM_MAX}
          className="h-11 w-11 items-center justify-center rounded-full bg-muted"
          style={minutes >= CUSTOM_MAX ? { opacity: 0.4 } : undefined}
        >
          <Plus size={18} color="#8a9793" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap justify-center gap-2">
        {CUSTOM_QUICK.map((m) => {
          const active = m === minutes
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                void Haptics.selectionAsync()
                onChange(m)
              }}
              className={cn(
                'rounded-full border px-3 py-1.5',
                active ? 'border-violet-500 bg-violet-500/10' : 'border-transparent bg-muted',
              )}
            >
              <Text className={cn('text-xs font-semibold', active ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground')}>
                {m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </Card>
  )
}

// ─── Which tree grows ────────────────────────────────────────────────────────

function TreePicker({
  trees,
  selectedId,
  onSelect,
  xp,
}: {
  trees: GardenTree[]
  selectedId: string | null
  onSelect: (id: string) => void
  xp: number
}) {
  const router = useRouter()
  return (
    <Card className="gap-3 px-0">
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-[13px] font-semibold text-foreground">This session grows</Text>
        <Muted className="text-xs">+{xp} XP when it ends</Muted>
      </View>
      {trees.length === 0 ? (
        <Pressable onPress={() => router.push(hubHref('grow', 'garden'))} className="mx-4 flex-row items-center gap-3 rounded-2xl bg-muted/60 px-3.5 py-3">
          <Sprout size={18} color="#8a9793" />
          <Muted className="flex-1 text-xs">No growing trees. Plant one in your garden and every session will grow it.</Muted>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {trees.map((t) => {
            const active = t.id === selectedId
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Grow ${treeName(t)}`}
                onPress={() => {
                  void Haptics.selectionAsync()
                  onSelect(t.id)
                }}
                className={cn(
                  'w-[104px] items-center rounded-2xl border px-2 pb-2.5 pt-1.5',
                  active ? 'border-noor-500 bg-noor-500/10' : 'border-border bg-card',
                )}
              >
                <SvgTree species={t.species} stage={t.stage} seed={t.id} size={56} />
                <Text className="text-center text-[12px] font-semibold leading-4 text-foreground" numberOfLines={2}>
                  {treeName(t)}
                </Text>
                <Muted className="text-[10px] capitalize">{t.stage}</Muted>
              </Pressable>
            )
          })}
        </ScrollView>
      )}
    </Card>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const control = useFocusControl()
  const { timer, target } = control
  const { data: todayMinutes } = useTodayFocusMinutes()
  const { data: sessions } = useFocusSessions()
  const [error, setError] = useState<string | null>(null)

  const { preset, remaining, state, hydrated } = timer
  const total = preset.minutes * 60
  const current = describePreset(preset)
  const key = presetKey(preset)

  // The last custom length is remembered between sessions.
  const [customMins, setCustomMins] = useState(40)
  useEffect(() => {
    void storage.getItem(CUSTOM_KEY).then((v) => {
      const n = Number(v)
      if (n >= CUSTOM_MIN && n <= CUSTOM_MAX) setCustomMins(n)
    })
  }, [])
  const chooseCustom = (m: number) => {
    setCustomMins(m)
    void storage.setItem(CUSTOM_KEY, String(m))
    timer.setPreset(customPreset(m))
  }

  const handleStart = useCallback(async () => {
    setError(null)
    try {
      await control.start()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start session.')
    }
  }, [control])

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

  const options: { value: PresetKey; label: string }[] = [
    ...PRESETS.map((p) => ({ value: p.type as PresetKey, label: p.short })),
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Preset picker — locked while a session is in flight, as on web. */}
        <FadeIn index={0}>
          <View pointerEvents={locked ? 'none' : 'auto'} style={locked ? { opacity: 0.55 } : undefined}>
            <Segmented
              options={options}
              value={key}
              onChange={(k) => {
                if (k === 'custom') {
                  timer.setPreset(customPreset(customMins))
                  return
                }
                const next = PRESETS.find((p) => p.type === k)
                if (next) timer.setPreset(next)
              }}
            />
          </View>
        </FadeIn>

        {key === 'custom' && !locked ? (
          <FadeIn index={1}>
            <DurationPicker minutes={preset.minutes} onChange={chooseCustom} />
          </FadeIn>
        ) : null}

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
                  onPress={control.discard}
                  disabled={state === 'idle'}
                />
                {running ? (
                  <Control icon={<Pause size={18} color="#115e59" fill="#115e59" />} label="Pause" onPress={control.pause} primary />
                ) : (
                  <Control
                    icon={<Play size={18} color="#115e59" fill="#115e59" />}
                    label={state === 'paused' ? 'Resume' : 'Start'}
                    onPress={() => void handleStart()}
                    disabled={!hydrated || control.starting}
                    primary
                  />
                )}
                <Control
                  icon={<SkipForward size={18} color="#ffffff" />}
                  label="Finish now"
                  onPress={control.stop}
                  disabled={state === 'idle'}
                />
              </View>
              <View className="mt-4 flex-row items-center gap-1.5">
                <Coins size={13} color="#fde68a" />
                <Text className="text-xs text-white/85">
                  Earns {projected.coins} coins
                  {target.tree ? ` · grows your ${treeName(target.tree)}` : ''}
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

        <FadeIn index={2}>
          <TreePicker
            trees={target.trees}
            selectedId={target.tree?.id ?? null}
            onSelect={target.setTreeId}
            xp={projected.xp}
          />
        </FadeIn>

        {/* Stats strip */}
        <FadeIn index={3}>
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

        <FadeIn index={4}>
          <Card className="flex-row items-center gap-3 px-4 py-3">
            <Bell size={16} color="#8a9793" />
            <Muted className="flex-1 text-xs">
              Runs in the background, anchored to the clock. You will hear a chime when it ends,
              and the session stays pinned above the tab bar while you use the rest of the app.
              Finish now keeps the minutes you have done.
            </Muted>
          </Card>
        </FadeIn>
      </View>
    </HubContent>
  )
}
