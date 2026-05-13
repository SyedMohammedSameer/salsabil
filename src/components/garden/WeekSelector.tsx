import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { addWeeks, formatWeekRange, isSameWeek, startOfWeek } from '@/lib/weeks'

interface WeekSelectorProps {
  weekStart: Date
  onChange: (next: Date) => void
  treeCount: number
}

export function WeekSelector({ weekStart, onChange, treeCount }: WeekSelectorProps) {
  const now = new Date()
  const isCurrentWeek = isSameWeek(weekStart, now)
  const isFutureBlocked = startOfWeek(addWeeks(weekStart, 1)) > startOfWeek(now)

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-2 py-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg"
        onClick={() => onChange(addWeeks(weekStart, -1))}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <motion.div
        key={weekStart.toISOString()}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex flex-1 flex-col items-center text-center"
      >
        <p className="text-sm font-semibold text-foreground leading-tight">
          {isCurrentWeek ? 'This week' : formatWeekRange(weekStart)}
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight">
          {isCurrentWeek && <span className="mr-1">{formatWeekRange(weekStart)} · </span>}
          {treeCount} {treeCount === 1 ? 'tree' : 'trees'}
        </p>
      </motion.div>

      <div className="flex items-center gap-1">
        {!isCurrentWeek && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[11px] font-medium rounded-lg"
            onClick={() => onChange(startOfWeek(now))}
          >
            Today
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 w-8 p-0 rounded-lg', isFutureBlocked && 'opacity-30')}
          disabled={isFutureBlocked}
          onClick={() => onChange(addWeeks(weekStart, 1))}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
