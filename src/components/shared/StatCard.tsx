import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: number
  trendLabel?: string
  iconColor?: string
  iconBg?: string
  className?: string
  variant?: 'default' | 'glass'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = 'text-noor-600 dark:text-noor-400',
  iconBg = 'bg-noor-100 dark:bg-noor-900/50',
  className,
  variant = 'default',
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0

  return (
    <Card variant={variant} className={className}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {trend !== undefined && (
              <div
                className={cn(
                  'mt-1.5 flex items-center gap-1 text-xs font-medium',
                  isPositive
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-danger-600 dark:text-danger-400',
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(trend)}%</span>
                {trendLabel && (
                  <span className="text-muted-foreground font-normal">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                iconBg,
              )}
            >
              <Icon className={cn('h-5 w-5', iconColor)} strokeWidth={1.75} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
