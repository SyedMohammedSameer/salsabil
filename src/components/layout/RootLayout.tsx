import { Outlet, useNavigation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { Navigation } from './Navigation'
import { NotificationBell } from './NotificationBell'
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette'
import { useTheme } from '@/hooks/useTheme'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function RootLayout() {
  const { state } = useNavigation()
  const { open, setOpen } = useCommandPalette()

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Top progress bar on route transition */}
      {state === 'loading' && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-noor-500 animate-pulse" />
      )}

      {/* Desktop sidebar + Mobile bottom bar */}
      <Navigation />

      {/* Top bar — spans the main content area, holds global controls */}
      <div className="fixed top-0 right-0 z-40 h-12 flex items-center gap-1 px-3 lg:left-16">
        {/* Spacer pushes controls to the right */}
        <div className="flex-1" />
        <ThemeToggle />
        <NotificationBell />
      </div>

      {/* Main content area — pt-12 clears the top bar */}
      <main id="main-content" className="flex-1 overflow-y-auto pt-12 pb-20 lg:pb-0 lg:ml-16">
        <Outlet />
      </main>

      {/* Global Cmd+K command palette */}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
