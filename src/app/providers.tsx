import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query'
import { ThemeProvider } from '@/hooks/useTheme'
import { AuthProvider } from '@/hooks/useAuth'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: 'rounded-2xl border border-border bg-card text-card-foreground shadow-lg',
                success: 'border-accent-500/30 bg-accent-50 dark:bg-accent-900/20',
                error: 'border-danger-500/30 bg-red-50 dark:bg-red-900/20',
              },
            }}
            richColors
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
