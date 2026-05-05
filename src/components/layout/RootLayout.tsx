import { Outlet, useNavigation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { NotificationBell } from './NotificationBell'
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette'

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

      {/* Notification bell — top-right corner */}
      <div className="fixed top-3 right-3 z-40">
        <NotificationBell />
      </div>

      {/* Main content area */}
      <main
        id="main-content"
        className="
          flex-1 overflow-y-auto
          pb-20 lg:pb-0
          lg:ml-16
        "
      >
        <Outlet />
      </main>

      {/* Global Cmd+K command palette */}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
