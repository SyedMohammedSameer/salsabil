import { View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { Hub } from '~/components/Hub'
import { Muted } from '~/components/ui'
import { useTodayFocusMinutes } from '@/hooks/useFocus'
import TimerContent from '~/features/focus'
import TasksContent from '~/features/tasks'
import RoomsContent from '~/features/rooms'

// Focus: the productivity hub. The timer, the task list and study rooms.

export default function FocusHub() {
  const { data: minutes } = useTodayFocusMinutes()

  return (
    <Hub
      name="focus"
      title="Focus"
      right={
        <View className="flex-row items-center gap-1.5 pb-1.5">
          <Flame size={14} color="#f59e0b" />
          <Muted className="text-xs">{minutes ?? 0} min today</Muted>
        </View>
      }
      labels={{ timer: 'Timer', tasks: 'Tasks', rooms: 'Rooms' }}
      render={(tab) =>
        tab === 'timer' ? <TimerContent /> : tab === 'tasks' ? <TasksContent /> : <RoomsContent />
      }
    />
  )
}
