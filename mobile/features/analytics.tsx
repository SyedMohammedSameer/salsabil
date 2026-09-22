import { useMemo } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useColorScheme } from 'nativewind'
import { Flame, Coins, TrendingUp, TrendingDown } from 'lucide-react-native'
import { HubContent, Muted, Card, FadeIn } from '~/components/ui'
import { GrowHero } from '~/components/GrowHero'
import { BarChart, LineChart } from '~/components/charts'
import { durationLabel } from '~/lib/format'
import { useAllTasks } from '@/hooks/useTasks'
import { useFocusSessions } from '@/hooks/useFocus'
import { useQuranLogs } from '@/hooks/useQuranLogs'
import { useProfile } from '@/hooks/useProfile'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'

// The Analytics section of the Grow hub: the same metrics and windows as
// src/views/analytics/AnalyticsView.tsx, under the hub's shared hero.

function lastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return { date: localDateString(d), label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1) }
  })
}

function ChartCard({
  title,
  headline,
  sub,
  trend,
  children,
}: {
  title: string
  headline: string | number
  sub?: string
  /** Percentage change against the previous window, when known. */
  trend?: number | null
  children: React.ReactNode
}) {
  const up = (trend ?? 0) >= 0
  return (
    <Card className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View>
          <Text className="text-sm font-medium text-foreground">{title}</Text>
          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-2xl font-bold tracking-tight text-foreground">{headline}</Text>
            {sub ? <Muted className="text-[11px]">{sub}</Muted> : null}
          </View>
        </View>
        {trend != null && Number.isFinite(trend) ? (
          <View className={cn('flex-row items-center gap-1 rounded-full px-2.5 py-1', up ? 'bg-accentGreen-500/10' : 'bg-danger-500/10')}>
            {up ? <TrendingUp size={12} color="#059669" /> : <TrendingDown size={12} color="#dc2626" />}
            <Text className={cn('text-[11px] font-semibold', up ? 'text-accentGreen-600 dark:text-accentGreen-400' : 'text-danger-600 dark:text-danger-400')}>
              {up ? '+' : ''}
              {Math.round(trend)}%
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </Card>
  )
}

export default function AnalyticsScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { data: profile, isLoading: loadingProfile } = useProfile()
  const { data: tasks, isLoading: loadingTasks } = useAllTasks()
  const { data: sessions, isLoading: loadingSessions } = useFocusSessions()
  const { data: quranLogs, isLoading: loadingQuran } = useQuranLogs()
  const isLoading = loadingProfile || loadingTasks || loadingSessions || loadingQuran

  const days14 = useMemo(() => lastNDays(14), [])
  const days7 = days14.slice(7)
  const prev7 = days14.slice(0, 7)
  const days30 = useMemo(() => lastNDays(30).map((d) => d.date), [])

  const focusOn = (date: string) =>
    (sessions ?? [])
      .filter((s) => s.completed && localDateString(new Date(s.started_at)) === date)
      .reduce((sum, s) => sum + s.duration_mins, 0)
  const tasksOn = (date: string) => (tasks ?? []).filter((t) => t.completed && t.due_date === date).length

  const focusData = useMemo(() => days7.map(({ date, label }) => ({ label, value: focusOn(date) })), [days7, sessions]) // eslint-disable-line react-hooks/exhaustive-deps
  const tasksData = useMemo(() => days7.map(({ date, label }) => ({ label, value: tasksOn(date) })), [days7, tasks]) // eslint-disable-line react-hooks/exhaustive-deps
  const quranData = useMemo(() => {
    let cumulative = 0
    return days30.map((date) => {
      cumulative += (quranLogs ?? []).filter((l) => l.date === date).reduce((sum, l) => sum + l.pages_read, 0)
      return { value: cumulative }
    })
  }, [days30, quranLogs])

  const focusWeek = focusData.reduce((s, d) => s + d.value, 0)
  const focusPrev = prev7.reduce((s, d) => s + focusOn(d.date), 0)
  const tasksWeek = tasksData.reduce((s, d) => s + d.value, 0)
  const tasksPrev = prev7.reduce((s, d) => s + tasksOn(d.date), 0)
  const trend = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)

  const totalFocusMins = (sessions ?? []).filter((s) => s.completed).reduce((sum, s) => sum + s.duration_mins, 0)
  const totalTasks = (tasks ?? []).filter((t) => t.completed).length
  const totalQuranPages = (quranLogs ?? []).reduce((sum, l) => sum + l.pages_read, 0)
  const quranMonth = quranData.length ? quranData[quranData.length - 1].value : 0

  if (isLoading) {
    return (
      <HubContent>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </HubContent>
    )
  }

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        <FadeIn index={0}>
          <GrowHero
            eyebrow="All time"
            title={`${durationLabel(totalFocusMins)} focused`}
            sub="Everything you have put in since you started"
            footer={
              <View className="flex-row">
                {[
                  { v: durationLabel(totalFocusMins), k: 'focused' },
                  { v: String(totalTasks), k: totalTasks === 1 ? 'task done' : 'tasks done' },
                  { v: String(totalQuranPages), k: totalQuranPages === 1 ? 'Quran page' : 'Quran pages' },
                ].map((c, i) => (
                  <View key={c.k} className={cn('flex-1', i > 0 && 'border-l border-white/20 pl-3')}>
                    <Text className="text-[18px] font-bold leading-6 text-white">{c.v}</Text>
                    <Text className="text-[11px] text-white/80">{c.k}</Text>
                  </View>
                ))}
              </View>
            }
          />
        </FadeIn>

        <FadeIn index={1}>
          <View className="flex-row gap-3">
            <Card className="flex-1 gap-0.5 px-3.5 py-3">
              <View className="flex-row items-center gap-1.5">
                <Flame size={15} color={dark ? '#fbbf24' : '#f59e0b'} />
                <Text className="text-[20px] font-bold tracking-tight text-foreground">{profile?.streak ?? 0}</Text>
              </View>
              <Muted className="text-[11px]">day streak · best {Math.max(profile?.longest_streak ?? 0, profile?.streak ?? 0)}</Muted>
            </Card>
            <Card className="flex-1 gap-0.5 px-3.5 py-3">
              <View className="flex-row items-center gap-1.5">
                <Coins size={15} color={dark ? '#fbbf24' : '#d97706'} />
                <Text className="text-[20px] font-bold tracking-tight text-foreground">{(profile?.coins ?? 0).toLocaleString()}</Text>
              </View>
              <Muted className="text-[11px]">coins in hand</Muted>
            </Card>
          </View>
        </FadeIn>

        <FadeIn index={2}>
          <ChartCard title="Focus minutes" headline={focusWeek} sub="last 7 days" trend={trend(focusWeek, focusPrev)}>
            <BarChart data={focusData} />
          </ChartCard>
        </FadeIn>
        <FadeIn index={3}>
          <ChartCard title="Tasks completed" headline={tasksWeek} sub="last 7 days" trend={trend(tasksWeek, tasksPrev)}>
            <BarChart data={tasksData} />
          </ChartCard>
        </FadeIn>
        <FadeIn index={4}>
          <ChartCard title="Quran pages" headline={quranMonth} sub="cumulative, last 30 days">
            <LineChart data={quranData} />
          </ChartCard>
        </FadeIn>
      </View>
    </HubContent>
  )
}
