import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  Home,
  Moon,
  BookOpen,
  Heart,
  Timer,
  CheckSquare,
  Calendar,
  Dumbbell,
  Trophy,
  Users,
  Sparkles,
  User,
  Settings,
  BarChart2,
  Plus,
  Search,
} from 'lucide-react'
import { useAllTasks, useCreateTask } from '@/hooks/useTasks'
import { cn } from '@/lib/cn'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Prayers', path: '/prayers', icon: Moon },
  { label: 'Quran', path: '/quran', icon: BookOpen },
  { label: 'Adhkar', path: '/adhkar', icon: Heart },
  { label: 'Focus', path: '/focus', icon: Timer },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Workouts', path: '/workouts', icon: Dumbbell },
  { label: 'Challenges', path: '/challenges', icon: Trophy },
  { label: 'Study Rooms', path: '/rooms', icon: Users },
  { label: 'Noor AI', path: '/ai', icon: Sparkles },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Analytics', path: '/analytics', icon: BarChart2 },
]

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const { data: tasks } = useAllTasks()
  const createTask = useCreateTask()

  useEffect(() => {
    if (!open) {
      setSearch('')
      setCreating(false)
    }
  }, [open])

  const go = useCallback(
    (path: string) => {
      navigate(path)
      onClose()
    },
    [navigate, onClose],
  )

  const handleCreateTask = useCallback(async () => {
    const title = search.replace(/^(add|create|new)\s+task\s*/i, '').trim()
    if (!title) return
    setCreating(true)
    try {
      await createTask.mutateAsync({ title, priority: 'medium' })
      onClose()
    } finally {
      setCreating(false)
    }
  }, [search, createTask, onClose])

  const incompleteTasks = tasks?.filter((t) => !t.completed).slice(0, 8) ?? []

  const isTaskCreate = /^(add|create|new)\s+task\s+/i.test(search)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="flex flex-col" shouldFilter={true}>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder='Search or type "add task …"'
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:flex h-5 items-center rounded border border-border px-1.5 text-[10px] text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Quick create task if search looks like "add task ..." */}
            {isTaskCreate && (
              <Command.Group heading="Quick Action">
                <Command.Item
                  value={`create-task-${search}`}
                  onSelect={handleCreateTask}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer',
                    'text-foreground select-none',
                    'aria-selected:bg-noor-500/10 aria-selected:text-noor-600 dark:aria-selected:text-noor-400',
                  )}
                >
                  <Plus className="h-4 w-4 text-noor-500 shrink-0" />
                  <span>
                    {creating ? (
                      'Creating…'
                    ) : (
                      <>
                        Create task:{' '}
                        <span className="font-medium">
                          {search.replace(/^(add|create|new)\s+task\s*/i, '').trim()}
                        </span>
                      </>
                    )}
                  </span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Navigation */}
            <Command.Group heading="Navigate">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <Command.Item
                  key={path}
                  value={label}
                  onSelect={() => go(path)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer',
                    'text-foreground select-none',
                    'aria-selected:bg-accent aria-selected:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Tasks */}
            {incompleteTasks.length > 0 && (
              <Command.Group heading="Tasks">
                {incompleteTasks.map((task) => (
                  <Command.Item
                    key={task.id}
                    value={task.title}
                    onSelect={() => go('/tasks')}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer',
                      'text-foreground select-none',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                    )}
                  >
                    <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono">esc</kbd> close
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return { open, setOpen }
}
