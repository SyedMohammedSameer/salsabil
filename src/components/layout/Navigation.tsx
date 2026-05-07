import type { ReactNode } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import {
  IconHome,
  IconFocus,
  IconPrayer,
  IconTasks,
  IconQuran,
  IconAdhkar,
  IconWorkouts,
  IconChallenges,
  IconRooms,
  IconGarden,
  IconProfile,
  IconSettings,
  IconChevronRight,
  IconMore,
} from '@/components/shared/NavIcons'
import { NoorMiniOrb } from './NoorMiniOrb'
import { MoreSheet } from './MoreSheet'

interface NavItem {
  path: string
  icon: ReactNode
  label: string
}

const PRIMARY_NAV: NavItem[] = [
  { path: '/', icon: <IconHome />, label: 'Home' },
  { path: '/focus', icon: <IconFocus />, label: 'Focus' },
  { path: '/ai', icon: null, label: 'Noor' }, // Noor uses the orb
  { path: '/prayers', icon: <IconPrayer />, label: 'Prayers' },
]

const SIDEBAR_NAV: NavItem[] = [
  { path: '/', icon: <IconHome />, label: 'Dashboard' },
  { path: '/focus', icon: <IconFocus />, label: 'Focus' },
  { path: '/tasks', icon: <IconTasks />, label: 'Tasks' },

  { path: '/prayers', icon: <IconPrayer />, label: 'Prayers' },
  { path: '/quran', icon: <IconQuran />, label: 'Quran' },
  { path: '/adhkar', icon: <IconAdhkar />, label: 'Adhkar' },
  { path: '/workouts', icon: <IconWorkouts />, label: 'Workouts' },
  { path: '/challenges', icon: <IconChallenges />, label: 'Challenges' },
  { path: '/rooms', icon: <IconRooms />, label: 'Study Rooms' },
  { path: '/garden', icon: <IconGarden />, label: 'Garden' },
]

export function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-full z-40',
          'border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-out',
          expanded ? 'w-60' : 'w-16',
        )}
      >
        {/* Skip to content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to content
        </a>

        {/* Logo */}
        <div className="flex h-16 items-center justify-center px-3 border-b border-sidebar-border">
          <img src="/salsabil-icon-32.png" alt="Salsabil" className="h-8 w-8 shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-3 text-base font-semibold text-foreground overflow-hidden whitespace-nowrap"
              >
                Salsabil
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {SIDEBAR_NAV.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex items-center w-full rounded-xl min-h-11 px-3 gap-3',
                  'text-sm font-medium transition-colors duration-150',
                  active
                    ? 'text-noor-600 dark:text-noor-400 bg-noor-50 dark:bg-noor-950/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-noor-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </nav>

        {/* Bottom: Noor + Settings + Toggle */}
        <div className="border-t border-sidebar-border py-3 px-2 space-y-1">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center w-full rounded-xl min-h-11 px-3 gap-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <IconProfile />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Profile
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center w-full rounded-xl min-h-11 px-3 gap-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <IconSettings />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Expand/collapse toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center w-full rounded-xl min-h-11 px-3 gap-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <IconChevronRight />
            </motion.div>
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.path)

          if (item.path === '/ai') {
            return <NoorMiniOrb key="noor" isBottomBar />
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 rounded-xl px-2',
                'text-xs font-medium transition-colors duration-150',
                active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="bottom-bar-active"
                  className="absolute inset-0 rounded-xl bg-noor-50 dark:bg-noor-950/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.icon}</span>
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 rounded-xl px-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-label="More navigation options"
        >
          <IconMore />
          <span>More</span>
        </button>
      </nav>

      {/* Floating Noor orb (desktop / non-AI routes) */}
      {location.pathname !== '/ai' && (
        <div className="hidden lg:block">
          <NoorMiniOrb />
        </div>
      )}

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
