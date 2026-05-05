import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Zap, Timer, Leaf, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'
import { cn } from '@/lib/cn'
import type { Notification } from '@/lib/database.types'

// ─── Icon by notification type ────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 shrink-0'
  if (type === 'focus_complete') return <Timer className={cn(cls, 'text-noor-500')} />
  if (type === 'task_complete') return <Check className={cn(cls, 'text-emerald-500')} />
  if (type === 'garden_stage') return <Leaf className={cn(cls, 'text-emerald-400')} />
  if (type === 'quran_streak') return <BookOpen className={cn(cls, 'text-amber-500')} />
  return <Zap className={cn(cls, 'text-muted-foreground')} />
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotifRow({ notif }: { notif: Notification }) {
  const markRead = useMarkRead()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
        !notif.read && 'bg-noor-500/5',
      )}
      onClick={() => {
        if (!notif.read) markRead.mutate(notif.id)
      }}
    >
      <div className="mt-0.5">
        <NotifIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug',
            !notif.read ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {new Date(notif.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
      {!notif.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-noor-500 shrink-0" />}
    </motion.div>
  )
}

// ─── Bell + dropdown ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { data: notifications = [] } = useNotifications()
  const markAllRead = useMarkAllRead()

  const unread = notifications.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-noor-500 text-[9px] font-bold text-white"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-80 rounded-2xl border bg-popover shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unread > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell
                    className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-muted-foreground">All caught up</p>
                </div>
              ) : (
                <motion.div layout>
                  {notifications.slice(0, 20).map((n) => (
                    <NotifRow key={n.id} notif={n} />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
