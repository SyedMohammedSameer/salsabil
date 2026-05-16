import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { usePrayersForDate, useUpsertPrayer } from '@/hooks/usePrayers'
import { PRAYER_META, type PrayerName } from '@/types'
import type { PrayerStatus } from '@/lib/database.types'
import { cn } from '@/lib/cn'

import { localDateString } from '@/lib/dates'
const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

function formatDate(d: Date) {
  return localDateString(d)
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isToday(date: string) {
  return date === formatDate(new Date())
}

const STATUS_CONFIG: Record<
  PrayerStatus,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  prayed: {
    label: 'Prayed',
    icon: CheckCircle2,
    color: 'text-accent-600 dark:text-accent-400',
    bg: 'bg-accent-500/10 border-accent-500/30',
  },
  late: {
    label: 'Late',
    icon: Clock,
    color: 'text-warn-600 dark:text-warn-400',
    bg: 'bg-warn-500/10 border-warn-500/30',
  },
  qada: {
    label: 'Qada',
    icon: RotateCcw,
    color: 'text-noor-600 dark:text-noor-400',
    bg: 'bg-noor-500/10 border-noor-500/30',
  },
  missed: {
    label: 'Missed',
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
  },
}

interface PrayerRowProps {
  name: PrayerName
  currentStatus: PrayerStatus | null
  onStatusChange: (status: PrayerStatus | null) => void
  isPending: boolean
}

function PrayerRow({ name, currentStatus, onStatusChange, isPending }: PrayerRowProps) {
  const meta = PRAYER_META[name]
  const cfg = currentStatus ? STATUS_CONFIG[currentStatus] : null

  const handleStatusClick = (status: PrayerStatus) => {
    // Toggle off if already selected
    onStatusChange(currentStatus === status ? null : status)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{meta.label}</span>
          {cfg && (
            <Badge className={cn('border text-xs h-5 px-1.5 gap-1', cfg.bg, cfg.color)}>
              <cfg.icon className="h-2.5 w-2.5" />
              {cfg.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize mt-0.5">{name}</p>
      </div>

      <div className="flex gap-1.5 shrink-0">
        {(Object.keys(STATUS_CONFIG) as PrayerStatus[]).map((status) => {
          const s = STATUS_CONFIG[status]
          const Icon = s.icon
          const active = currentStatus === status
          return (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              disabled={isPending}
              title={s.label}
              className={cn(
                'h-8 w-8 rounded-lg border flex items-center justify-center transition-all',
                active
                  ? cn(s.bg, s.color, 'shadow-sm scale-105')
                  : 'border-border text-muted-foreground/40 hover:border-border/80 hover:text-muted-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.5 : 1.75} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Weekly mini-strip showing 7 days relative to the selected date
function WeekStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string
  onSelect: (d: string) => void
}) {
  const days = useMemo(() => {
    const selected = new Date(selectedDate + 'T00:00:00')
    // Center on selected date: -3 to +3
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(selected, i - 3)
      return {
        date: formatDate(d),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
        day: d.getDate(),
      }
    })
  }, [selectedDate])

  return (
    <div className="flex justify-between gap-1">
      {days.map(({ date, label, day }) => {
        const active = date === selectedDate
        const today = isToday(date)
        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl p-2 flex-1 transition-all',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <span
              className={cn(
                'text-[10px]',
                active ? 'text-primary-foreground/70' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            <span className={cn('text-sm font-semibold', today && !active && 'text-noor-500')}>
              {day}
            </span>
            {today && !active && <span className="h-1 w-1 rounded-full bg-noor-500" />}
          </button>
        )
      })}
    </div>
  )
}

export default function PrayerView() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const { data: prayers, isLoading } = usePrayersForDate(selectedDate)
  const upsertPrayer = useUpsertPrayer()

  const prayerMap = useMemo(() => {
    const map: Partial<Record<PrayerName, PrayerStatus | null>> = {}
    for (const p of prayers ?? []) {
      map[p.prayer] = p.status
    }
    return map
  }, [prayers])

  const prayedCount = PRAYER_ORDER.filter(
    (name) => prayerMap[name] && prayerMap[name] !== 'missed',
  ).length
  const prayerPct = Math.round((prayedCount / 5) * 100)

  const handleStatusChange = (prayer: PrayerName, status: PrayerStatus | null) => {
    if (!status) return
    upsertPrayer.mutate({ date: selectedDate, prayer, status })
  }

  const goDay = (n: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    setSelectedDate(formatDate(addDays(d, n)))
  }

  const dateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    if (isToday(selectedDate)) return 'Today'
    const yesterday = formatDate(addDays(new Date(), -1))
    if (selectedDate === yesterday) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }, [selectedDate])

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Header + date nav */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Prayers</h1>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => goDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isToday(selectedDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(formatDate(new Date()))}
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => goDay(1)}
              disabled={isToday(selectedDate)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop 2-col: left = navigation/progress, right = prayer list */}
        <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6 space-y-4 lg:space-y-0">
          {/* Left column: week strip + progress */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-3">
                <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Daily progress</span>
                  <span className="text-sm font-semibold text-foreground">{prayedCount} / 5</span>
                </div>
                <Progress value={prayerPct} className="h-2" />
                {prayedCount === 5 && (
                  <p className="mt-2 text-xs text-accent-600 dark:text-accent-400 font-medium">
                    ✓ All prayers completed — may Allah accept
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: prayer list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Tap a status to mark each prayer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))
                : PRAYER_ORDER.map((name) => (
                    <PrayerRow
                      key={name}
                      name={name}
                      currentStatus={prayerMap[name] ?? null}
                      onStatusChange={(status) => handleStatusChange(name, status)}
                      isPending={upsertPrayer.isPending}
                    />
                  ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </PageShell>
  )
}
