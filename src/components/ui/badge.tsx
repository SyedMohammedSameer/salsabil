import { cva, type VariantProps } from 'class-variance-authority'
import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border border-border text-foreground',
        success:
          'border-transparent bg-accent-500/15 text-accent-600 dark:text-accent-400 dark:bg-accent-500/20',
        warning:
          'border-transparent bg-warn-500/15 text-warn-600 dark:text-warn-400 dark:bg-warn-500/20',
        danger:
          'border-transparent bg-danger-500/15 text-danger-600 dark:text-danger-400 dark:bg-danger-500/20',
        noor: 'border-transparent bg-noor-500/15 text-noor-600 dark:text-noor-400 dark:bg-noor-500/20',
        gold: 'border-transparent bg-gold-500/15 text-gold-600 dark:text-gold-400 dark:bg-gold-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
