import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdhkarLogs, useLogAdhkarComplete } from '@/hooks/useAdhkar'
import { ADHKAR_SETS, ADHKAR_SET_LABELS, type AdhkarItem, type AdhkarSet } from '@/data/adhkar'
import type { AdhkarTime } from '@/lib/database.types'
import { cn } from '@/lib/cn'

function today() {
  return new Date().toISOString().split('T')[0]
}

const SET_TO_TIME: Record<AdhkarSet, AdhkarTime> = {
  morning: 'morning',
  evening: 'evening',
  after_prayer: 'after_prayer',
}

interface CounterProps {
  item: AdhkarItem
  progress: number
  onTap: () => void
}

function AdhkarCounter({ item, progress, onTap }: CounterProps) {
  const done = progress >= item.count
  const pct = Math.min((progress / item.count) * 100, 100)

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        done ? 'border-accent-500/30 bg-accent-500/5' : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p
            dir="rtl"
            className={cn(
              'font-arabic text-base leading-loose text-right',
              done ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {item.arabic}
          </p>
          {item.transliteration && (
            <p className="mt-1 text-xs text-muted-foreground italic">{item.transliteration}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground leading-snug">{item.translation}</p>
          {item.source && (
            <p className="mt-1 text-[10px] text-muted-foreground/60">{item.source}</p>
          )}
          {item.count > 1 && (
            <div className="mt-2 space-y-1">
              <Progress value={pct} className="h-1" />
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <button
            onClick={onTap}
            disabled={done}
            className={cn(
              'flex h-14 w-14 flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-90',
              done
                ? 'border-accent-500/30 bg-accent-500/10 cursor-default'
                : 'border-noor-400 bg-noor-500/10 hover:bg-noor-500/20 hover:border-noor-500',
            )}
          >
            {done ? (
              <CheckCircle2 className="h-6 w-6 text-accent-500" strokeWidth={1.75} />
            ) : (
              <>
                <span className="text-xl font-bold text-noor-600 dark:text-noor-400 leading-none">
                  {progress}
                </span>
                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                  / {item.count}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function AdhkarView() {
  const [activeSet, setActiveSet] = useState<AdhkarSet>('morning')
  const todayStr = today()
  const items = ADHKAR_SETS[activeSet]

  const { data: logs } = useAdhkarLogs(todayStr)
  const logComplete = useLogAdhkarComplete()

  // Per-item counter stored in component state (resets on tab change)
  const [counters, setCounters] = useState<Record<string, number>>({})

  // Check if this set is already marked complete in the DB
  const setAlreadyDone = useMemo(() => {
    const time = SET_TO_TIME[activeSet]
    return logs?.some((l) => l.time === time && l.completed) ?? false
  }, [logs, activeSet])

  const getCount = useCallback(
    (id: string) => counters[`${activeSet}:${id}`] ?? 0,
    [counters, activeSet],
  )

  const handleTap = (item: AdhkarItem) => {
    const key = `${activeSet}:${item.id}`
    setCounters((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] ?? 0) + 1, item.count),
    }))
  }

  const allDone = useMemo(
    () => items.every((item) => getCount(item.id) >= item.count),
    [items, getCount],
  )

  const completedCount = items.filter((item) => getCount(item.id) >= item.count).length
  const pct = Math.round((completedCount / items.length) * 100)

  const handleMarkComplete = () => {
    logComplete.mutate({ date: todayStr, time: SET_TO_TIME[activeSet] })
  }

  const handleReset = () => {
    const keysToReset = items.map((item) => `${activeSet}:${item.id}`)
    setCounters((prev) => {
      const next = { ...prev }
      for (const k of keysToReset) delete next[k]
      return next
    })
  }

  return (
    <PageShell maxWidth="5xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Adhkar</h1>
          <p className="text-sm text-muted-foreground">Daily remembrance of Allah</p>
        </div>

        {/* Set selector */}
        <Tabs value={activeSet} onValueChange={(v) => setActiveSet(v as AdhkarSet)}>
          <TabsList className="w-full">
            {(Object.keys(ADHKAR_SET_LABELS) as AdhkarSet[]).map((set) => (
              <TabsTrigger key={set} value={set} className="flex-1 text-xs">
                {ADHKAR_SET_LABELS[set]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Progress bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {setAlreadyDone ? (
                  <span className="text-accent-600 dark:text-accent-400">
                    ✓ Set completed today
                  </span>
                ) : (
                  `${completedCount} / ${items.length} completed`
                )}
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            </div>
            <Progress value={setAlreadyDone ? 100 : pct} className="h-2" />
          </CardContent>
        </Card>

        {/* Adhkar list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSet}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="grid gap-3 md:grid-cols-2"
          >
            {items.map((item) => (
              <AdhkarCounter
                key={item.id}
                item={item}
                progress={setAlreadyDone ? item.count : getCount(item.id)}
                onTap={() => handleTap(item)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Complete button */}
        {!setAlreadyDone && (
          <Button
            className="w-full gap-2"
            disabled={!allDone || logComplete.isPending}
            onClick={handleMarkComplete}
          >
            <CheckCircle2 className="h-4 w-4" />
            {allDone ? 'Mark set as complete' : `${items.length - completedCount} remaining`}
          </Button>
        )}
      </motion.div>
    </PageShell>
  )
}
