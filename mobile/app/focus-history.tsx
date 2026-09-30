import { useMemo } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useColorScheme } from 'nativewind'
import { Timer, Coffee, Zap, CircleSlash } from 'lucide-react-native'
import { Screen, Muted, Card, FadeIn } from '~/components/ui'
import { durationLabel, relativeDay } from '~/lib/format'
import { useFocusSessions } from '@/hooks/useFocus'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { FocusSession, SessionType } from '@/lib/database.types'

// Every focus session, newest first, grouped by day with each day's total.
// Unfinished ones (reset or still running) are shown too, marked as such.

const TYPE: Record<SessionType, { label: string; Icon: typeof Timer }> = {
  pomodoro: { label: 'Focus', Icon: Timer },
  flow: { label: 'Flow', Icon: Zap },
  short_break: { label: 'Short break', Icon: Coffee },
  long_break: { label: 'Long break', Icon: Coffee },
}

function wallMinutes(s: FocusSession): number {
  if (!s.ended_at) return 0
  return Math.max(0, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000))
}

/**
 * Minutes actually focused. duration_mins is the planned length, which a
 * session finished early never reached; the wall clock between start and end
 * is the truth, capped at the plan (pauses stretch the wall clock).
 */
function served(s: FocusSession): number {
  if (!s.completed) return wallMinutes(s)
  const wall = wallMinutes(s)
  return wall > 0 ? Math.min(s.duration_mins, wall) : s.duration_mins
}

export default function FocusHistoryScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()
  const { data: sessions, isLoading } = useFocusSessions()

  const days = useMemo(() => {
    const map = new Map<string, FocusSession[]>()
    for (const s of sessions ?? []) {
      const d = localDateString(new Date(s.started_at))
      map.set(d, [...(map.get(d) ?? []), s])
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [sessions])

  const done = (sessions ?? []).filter((s) => s.completed)
  const totalMins = done.reduce((sum, s) => sum + served(s), 0)
  const totalCoins = done.reduce((sum, s) => sum + (s.coins_earned ?? 0), 0)

  return (
    <Screen>
      <View className="gap-4 pb-10 pt-2">
        <FadeIn index={0}>
          <Card className="flex-row p-0">
            {[
              { v: String(done.length), k: 'sessions' },
              { v: durationLabel(totalMins), k: 'focused' },
              { v: `+${totalCoins}`, k: 'coins' },
            ].map((c, i) => (
              <View key={c.k} className={cn('flex-1 items-center gap-0.5 py-3', i > 0 && 'border-l border-border')}>
                <Text className="text-[20px] font-bold tracking-tight text-foreground">{c.v}</Text>
                <Muted className="text-[11px]">{c.k}</Muted>
              </View>
            ))}
          </Card>
        </FadeIn>
        <Muted className="px-1 text-xs">Your latest 50 sessions.</Muted>

        {isLoading ? (
          <ActivityIndicator />
        ) : days.length === 0 ? (
          <Card variant="outline-dashed" className="items-center py-8">
            <Muted>No focus sessions yet.</Muted>
          </Card>
        ) : (
          days.map(([day, list], gi) => {
            const dayMins = list.filter((s) => s.completed).reduce((sum, s) => sum + served(s), 0)
            return (
              <FadeIn key={day} index={Math.min(1 + gi, 6)}>
                <View className="gap-2">
                  <View className="flex-row items-baseline justify-between px-1">
                    <Text className="text-[13px] font-semibold text-foreground">{relativeDay(day, today)}</Text>
                    <Muted className="text-xs">{durationLabel(dayMins)}</Muted>
                  </View>
                  <Card className="p-0">
                    {list.map((s, i) => {
                      const t = TYPE[s.type] ?? TYPE.pomodoro
                      const started = new Date(s.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      const mins = served(s)
                      return (
                        <View key={s.id} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border')}>
                          <View className={cn('h-9 w-9 items-center justify-center rounded-xl', s.completed ? 'bg-noor-500/10' : 'bg-muted')}>
                            {s.completed ? (
                              <t.Icon size={17} color={dark ? '#2dd4bf' : '#0d9488'} />
                            ) : (
                              <CircleSlash size={16} color="#8a9793" />
                            )}
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-[14px] font-medium text-foreground">
                              {s.completed ? `${durationLabel(mins)} ${t.label.toLowerCase()}` : `${t.label} · not finished`}
                            </Text>
                            <Muted className="text-xs">
                              {started}
                              {!s.completed ? ` · planned ${s.duration_mins} min` : ''}
                            </Muted>
                          </View>
                          {s.completed && s.coins_earned ? (
                            <Text className="text-[13px] font-semibold text-accentGreen-600 dark:text-accentGreen-400">+{s.coins_earned}</Text>
                          ) : null}
                        </View>
                      )
                    })}
                  </Card>
                </View>
              </FadeIn>
            )
          })
        )}
      </View>
    </Screen>
  )
}
