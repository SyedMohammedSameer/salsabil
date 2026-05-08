import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PageShellProps {
  children: ReactNode
  className?: string
  /** Max width cap — defaults to 4xl (896px) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
  /** Remove horizontal padding (for full-bleed pages like Garden) */
  noPadding?: boolean
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

export function PageShell({
  children,
  className,
  maxWidth = '6xl',
  noPadding = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthMap[maxWidth],
        !noPadding && 'px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
    >
      {children}
    </div>
  )
}
