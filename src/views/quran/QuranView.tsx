import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, BookOpen, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import {
  useTodayQuranPages,
  useWeeklyQuranPages,
  useQuranLogs,
  useCreateQuranLog,
} from '@/hooks/useQuranLogs'
import type { QuranLog } from '@/lib/database.types'
import { cn } from '@/lib/cn'

const logSchema = z.object({
  pages_read: z.coerce.number().int().min(1, 'At least 1 page').max(604),
  surah_from: z.coerce.number().int().min(1).max(114).optional().or(z.literal('')),
  ayah_from: z.coerce.number().int().min(1).optional().or(z.literal('')),
  surah_to: z.coerce.number().int().min(1).max(114).optional().or(z.literal('')),
  ayah_to: z.coerce.number().int().min(1).optional().or(z.literal('')),
  duration_mins: z.coerce.number().int().min(1).max(480).optional().or(z.literal('')),
  notes: z.string().max(300).optional(),
})

type LogForm = z.infer<typeof logSchema>

function today() {
  return new Date().toISOString().split('T')[0]
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

function WeeklyChart({ data }: { data: { date: string; pages: number }[] }) {
  const days = getLast7Days()
  const pageMap = new Map(data.map((d) => [d.date, d.pages]))
  const max = Math.max(...days.map((d) => pageMap.get(d.date) ?? 0), 1)

  return (
    <div className="flex items-end gap-2 h-24">
      {days.map(({ date, label }) => {
        const pages = pageMap.get(date) ?? 0
        const pct = Math.max((pages / max) * 100, pages > 0 ? 8 : 0)
        const isToday = date === today()
        return (
          <div key={date} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] text-muted-foreground">{pages > 0 ? pages : ''}</span>
            <div className="w-full flex-1 flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                className={cn(
                  'w-full rounded-t-lg min-h-0',
                  isToday ? 'bg-noor-500' : pages > 0 ? 'bg-gold-400/60' : 'bg-muted',
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span
              className={cn(
                'text-[10px]',
                isToday ? 'text-noor-500 font-semibold' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LogSessionDialog({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const createLog = useCreateQuranLog()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogForm>({ resolver: zodResolver(logSchema) })

  const onSubmit = async (data: LogForm) => {
    await createLog.mutateAsync({
      date: today(),
      pages_read: data.pages_read as number,
      surah_from: data.surah_from ? Number(data.surah_from) : 1,
      ayah_from: data.ayah_from ? Number(data.ayah_from) : 1,
      surah_to: data.surah_to ? Number(data.surah_to) : 1,
      ayah_to: data.ayah_to ? Number(data.ayah_to) : 1,
      duration_mins: data.duration_mins ? Number(data.duration_mins) : undefined,
      notes: data.notes || undefined,
    })
    reset()
    setOpen(false)
    onLogged()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Log session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log Quran Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="pages">Pages read *</Label>
            <Input
              id="pages"
              type="number"
              min={1}
              max={604}
              placeholder="e.g. 5"
              autoFocus
              {...register('pages_read')}
            />
            {errors.pages_read && (
              <p className="text-xs text-destructive">{errors.pages_read.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sf" className="text-xs">
                From surah
              </Label>
              <Input
                id="sf"
                type="number"
                min={1}
                max={114}
                placeholder="1–114"
                {...register('surah_from')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af" className="text-xs">
                From ayah
              </Label>
              <Input id="af" type="number" min={1} placeholder="Ayah" {...register('ayah_from')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st" className="text-xs">
                To surah
              </Label>
              <Input
                id="st"
                type="number"
                min={1}
                max={114}
                placeholder="1–114"
                {...register('surah_to')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="at" className="text-xs">
                To ayah
              </Label>
              <Input id="at" type="number" min={1} placeholder="Ayah" {...register('ayah_to')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dur" className="text-xs">
              Duration (minutes)
            </Label>
            <Input
              id="dur"
              type="number"
              min={1}
              max={480}
              placeholder="Optional"
              {...register('duration_mins')}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Session'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LogRow({ log }: { log: QuranLog }) {
  const label = `Surah ${log.surah_from}:${log.ayah_from} → ${log.surah_to}:${log.ayah_to}`
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
          {log.duration_mins ? ` · ${log.duration_mins} min` : ''}
        </p>
      </div>
      <span className="text-lg font-bold text-gold-500">{log.pages_read}</span>
    </div>
  )
}

export default function QuranView() {
  const todayStr = today()
  const from = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  }, [])

  const { data: todayPages, isLoading: loadingToday } = useTodayQuranPages(todayStr)
  const { data: weeklyData, isLoading: loadingWeekly } = useWeeklyQuranPages(from, todayStr)
  const { data: logs, isLoading: loadingLogs } = useQuranLogs()

  return (
    <PageShell maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Quran</h1>
            <p className="text-sm text-muted-foreground">Track your daily reading</p>
          </div>
          <LogSessionDialog onLogged={() => {}} />
        </div>

        {/* Today's pages */}
        <Card variant="glass-noor">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg">
              <BookOpen className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Today
              </p>
              {loadingToday ? (
                <Skeleton className="h-10 w-20 mt-1" />
              ) : (
                <p className="text-4xl font-bold text-foreground">
                  {todayPages ?? 0}
                  <span className="text-base font-normal text-muted-foreground ml-1.5">pages</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Week</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingWeekly ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : (
              <WeeklyChart data={weeklyData ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-2">
            {loadingLogs ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen
                  className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">No sessions logged yet</p>
              </div>
            ) : (
              <div>
                {logs.slice(0, 10).map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  )
}
