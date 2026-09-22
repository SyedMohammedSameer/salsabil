import { useMemo } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { Flame, Trophy, Coins } from 'lucide-react-native'
import { HubContent, Muted, Card } from '~/components/ui'
import { BarChart, LineChart } from '~/components/charts'
import { useAllTasks } from '@/hooks/useTasks'
import { useFocusSessions } from '@/hooks/useFocus'
import { useQuranLogs } from '@/hooks/useQuranLogs'
import { useProfile } from '@/hooks/useProfile'
import { localDateString } from '@/lib/dates'

// Ported from src/views/analytics/AnalyticsView.tsx, same metrics and windows.

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      date: localDateString(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
    }
  })
}

function last30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return localDateString(d)
  })
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode
  value: string | number
  label: string
}) {
  return (
    <Card className="flex-1 gap-1">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-2xl font-semibold text-foreground">{value}</Text>
      </View>
      <Muted className="text-[11px]">{label}</Muted>
    </Card>
  )
}

/**
 * One chart per card. The title names the single series, so no legend is
 * needed, and the headline value carries the number rather than labelling
 * every mark.
 */
function ChartCard({
  title,
  headline,
  sub,
  children,
}: {
  title: string
  headline: string | number
  sub?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-3">
      <View>
        <Text className="text-sm font-medium text-foreground">{title}</Text>
        <View className="flex-row items-baseline gap-1.5">
          <Text className="text-2xl font-semibold text-foreground">{headline}</Text>
          {sub ? <Muted className="text-[11px]">{sub}</Muted> : null}
        </View>
      </View>
      {children}
    </Card>
  )
}

export default function AnalyticsScreen() {
  const { data: profile, isLoading: loadingProfile } = useProfile()
  const { data: tasks, isLoading: loadingTasks } = useAllTasks()
  const { data: sessions, isLoading: loadingSessions } = useFocusSessions()
  const { data: quranLogs, isLoading: loadingQuran } = useQuranLogs()

  const isLoading = loadingProfile || loadingTasks || loadingSessions || loadingQuran

  const days7 = useMemo(last7Days, [])
  const days30 = useMemo(last30Days, [])

  const focusData = useMemo(
    () =>
      days7.map(({ date, label }) => ({
        label,
        value: (sessions ?? [])
          .filter((s) => s.completed && localDateString(new Date(s.started_at)) === date)
          .reduce((sum, s) => sum + s.duration_mins, 0),
      })),
    [days7, sessions],
  )

  const tasksData = useMemo(
    () =>
      days7.map(({ date, label }) => ({
        label,
        value: (tasks ?? []).filter((t) => t.completed && t.due_date === date).length,
      })),
    [days7, tasks],
  )

  const quranData = useMemo(() => {
    let cumulative = 0
    return days30.map((date) => {
      cumulative += (quranLogs ?? [])
        .filter((l) => l.date === date)
        .reduce((sum, l) => sum + l.pages_read, 0)
      return { value: cumulative }
    })
  }, [days30, quranLogs])

  const totalFocusMins = (sessions ?? [])
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.duration_mins, 0)
  const totalTasks = (tasks ?? []).filter((t) => t.completed).length
  const totalQuranPages = (quranLogs ?? []).reduce((sum, l) => sum + l.pages_read, 0)

  const focusWeek = focusData.reduce((s, d) => s + d.value, 0)
  const tasksWeek = tasksData.reduce((s, d) => s + d.value, 0)
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
      <View className="gap-1 py-4">
        <Muted>Your growth at a glance.</Muted>
      </View>

      <View className="flex-row gap-3">
        <StatTile value={Math.round((totalFocusMins / 60) * 10) / 10} label="Focus hours" />
        <StatTile value={totalTasks} label="Tasks done" />
        <StatTile value={totalQuranPages} label="Quran pages" />
      </View>

      <View className="flex-row gap-3 pt-3">
        <StatTile
          icon={<Flame size={16} color="#f87171" />}
          value={profile?.streak ?? 0}
          label="Current streak"
        />
        <StatTile
          icon={<Trophy size={16} color="#f59e0b" />}
          value={profile?.longest_streak ?? 0}
          label="Longest streak"
        />
        <StatTile
          icon={<Coins size={16} color="#f59e0b" />}
          value={profile?.coins ?? 0}
          label="Coins"
        />
      </View>

      <View className="gap-3 pt-5">
        <ChartCard title="Focus minutes" headline={focusWeek} sub="in the last 7 days">
          <BarChart data={focusData} />
        </ChartCard>

        <ChartCard title="Tasks completed" headline={tasksWeek} sub="in the last 7 days">
          <BarChart data={tasksData} />
        </ChartCard>

        <ChartCard title="Quran pages" headline={quranMonth} sub="cumulative, last 30 days">
          <LineChart data={quranData} />
        </ChartCard>
      </View>
    </HubContent>
  )
}
