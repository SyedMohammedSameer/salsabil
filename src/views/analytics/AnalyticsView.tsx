import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { useAllTasks } from '@/hooks/useTasks'
import { useFocusSessions } from '@/hooks/useFocus'
import { useQuranLogs } from '@/hooks/useQuranLogs'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/cn'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
    }
  })
}

// ─── Bar chart (SVG) ──────────────────────────────────────────────────────────

function BarChart({
  data,
  color = 'fill-noor-500',
  unit = '',
}: {
  data: { label: string; value: number }[]
  color?: string
  unit?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const barWidth = 100 / data.length - 2

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 100 40`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 80 }}
      >
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 38, d.value > 0 ? 2 : 0)
          const x = i * (100 / data.length) + 1
          const y = 40 - h
          return (
            <motion.rect
              key={d.label}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={1}
              className={cn(color, 'opacity-80')}
              initial={{ y: 40, height: 0 }}
              animate={{ y, height: h }}
              transition={{ duration: 0.4, delay: i * 0.02, ease: 'easeOut' }}
            />
          )
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-muted-foreground px-1">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      {unit && <p className="text-xs text-muted-foreground text-right">{unit}</p>}
    </div>
  )
}

// ─── Line chart (SVG) ─────────────────────────────────────────────────────────

function LineChart({
  data,
  color = 'stroke-noor-500',
}: {
  data: { date: string; value: number }[]
  color?: string
}) {
  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)
  const w = 100
  const h = 40
  const step = w / (data.length - 1)

  const points = data.map((d, i) => ({
    x: i * step,
    y: h - (d.value / max) * (h - 4) - 2,
  }))

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`
  }, '')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L 0 ${h} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: 80 }}
    >
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#area-grad)" className={color.replace('stroke-', 'text-')} />
      <motion.path
        d={pathD}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={color}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 text-center">
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function AnalyticsView() {
  const { data: profile, isLoading: loadingProfile } = useProfile()
  const { data: tasks, isLoading: loadingTasks } = useAllTasks()
  const { data: sessions, isLoading: loadingSessions } = useFocusSessions()
  const { data: quranLogs, isLoading: loadingQuran } = useQuranLogs()

  const days7 = useMemo(() => getLast7Days(), [])
  const days30 = useMemo(() => getLast30Days(), [])

  const isLoading = loadingProfile || loadingTasks || loadingSessions || loadingQuran

  // Focus minutes per day (last 7 days)
  const focusData = useMemo(() => {
    return days7.map(({ date, label }) => {
      const mins = (sessions ?? [])
        .filter((s) => s.completed && new Date(s.started_at).toISOString().split('T')[0] === date)
        .reduce((sum, s) => sum + s.duration_mins, 0)
      return { label, value: mins }
    })
  }, [days7, sessions])

  // Tasks completed per day (last 7 days)
  const tasksData = useMemo(() => {
    return days7.map(({ date, label }) => {
      const count = (tasks ?? []).filter((t) => t.completed && t.due_date === date).length
      return { label, value: count }
    })
  }, [days7, tasks])

  // Quran pages cumulative line (last 30 days)
  const quranData = useMemo(() => {
    let cumulative = 0
    return days30.map((date) => {
      const pages = (quranLogs ?? [])
        .filter((l) => l.date === date)
        .reduce((sum, l) => sum + l.pages_read, 0)
      cumulative += pages
      return { date, value: cumulative }
    })
  }, [days30, quranLogs])

  const totalFocusMins = (sessions ?? [])
    .filter((s) => s.completed)
    .reduce((s, sess) => s + sess.duration_mins, 0)
  const totalTasks = (tasks ?? []).filter((t) => t.completed).length
  const totalQuranPages = (quranLogs ?? []).reduce((s, l) => s + l.pages_read, 0)

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your growth at a glance</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Focus hours"
                value={Math.round((totalFocusMins / 60) * 10) / 10}
                sub="all time"
              />
              <StatCard label="Tasks done" value={totalTasks} sub="all time" />
              <StatCard label="Quran pages" value={totalQuranPages} sub="all time" />
            </div>

            {/* Streak highlight */}
            {profile && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Current streak" value={`${profile.streak}d`} />
                <StatCard label="Longest streak" value={`${profile.longest_streak}d`} />
              </div>
            )}

            {/* Charts grid */}
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {/* Focus chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Focus minutes — last 7 days</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <BarChart data={focusData} color="fill-noor-500" unit="minutes" />
                </CardContent>
              </Card>

              {/* Tasks chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tasks completed — last 7 days</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <BarChart data={tasksData} color="fill-accent-500" unit="tasks" />
                </CardContent>
              </Card>

              {/* Quran cumulative line */}
              <Card className="lg:col-span-2 xl:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quran pages — cumulative (30 days)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <LineChart data={quranData} color="stroke-gold-500" />
                  <p className="text-xs text-muted-foreground text-right mt-1">pages</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </motion.div>
    </PageShell>
  )
}
