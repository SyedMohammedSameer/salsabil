import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Use h1 for page-level titles, h2 (default) for sections within a page */
  as?: 'h1' | 'h2' | 'h3'
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  as: Tag = 'h2',
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="space-y-0.5">
        <Tag
          className={cn(
            'font-semibold tracking-tight text-foreground',
            Tag === 'h1' ? 'text-2xl' : Tag === 'h2' ? 'text-xl' : 'text-base',
          )}
        >
          {title}
        </Tag>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
