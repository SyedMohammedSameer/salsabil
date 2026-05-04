import { useNavigate } from 'react-router-dom'
import { Drawer } from 'vaul'
import {
  IconTasks,
  IconCalendar,
  IconQuran,
  IconAdhkar,
  IconWorkouts,
  IconChallenges,
  IconRooms,
  IconAnalytics,
  IconProfile,
  IconSettings,
} from '@/components/shared/NavIcons'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

const MORE_ITEMS = [
  { path: '/tasks', icon: <IconTasks />, label: 'Tasks' },
  { path: '/calendar', icon: <IconCalendar />, label: 'Calendar' },
  { path: '/quran', icon: <IconQuran />, label: 'Quran' },
  { path: '/adhkar', icon: <IconAdhkar />, label: 'Adhkar' },
  { path: '/workouts', icon: <IconWorkouts />, label: 'Workouts' },
  { path: '/challenges', icon: <IconChallenges />, label: 'Challenges' },
  { path: '/rooms', icon: <IconRooms />, label: 'Study Rooms' },
  { path: '/analytics', icon: <IconAnalytics />, label: 'Analytics' },
  { path: '/profile', icon: <IconProfile />, label: 'Profile' },
  { path: '/settings', icon: <IconSettings />, label: 'Settings' },
]

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const navigate = useNavigate()

  const handleNavigate = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card border-t border-border p-6 pb-10 focus:outline-none"
          style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border" />
          <Drawer.Title className="text-base font-semibold text-foreground mb-4">More</Drawer.Title>

          <div className="grid grid-cols-4 gap-3">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 p-3 min-h-[72px] text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
              >
                <span className="text-foreground">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
