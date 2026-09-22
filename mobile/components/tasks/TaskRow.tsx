import { View, Text, Pressable, Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Check, Bell } from 'lucide-react-native'
import { Muted } from '~/components/ui'
import { clock12, relativeDay } from '~/lib/format'
import { TASK_COINS_BY_PRIORITY } from '@/lib/rewards'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Task, TaskPriority } from '@/lib/database.types'

// One task row, shared by the Focus hub's Tasks section and the All tasks
// screen. Tap the circle to toggle; long-press the row to delete.

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#a9b6b2',
  medium: '#14b8a6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
  urgent: 'Urgent',
}

const PRIORITY_PILL: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-muted', text: 'text-muted-foreground' },
  medium: { bg: 'bg-noor-500/10', text: 'text-noor-600 dark:text-noor-400' },
  high: { bg: 'bg-warn-500/10', text: 'text-warn-600 dark:text-warn-400' },
  urgent: { bg: 'bg-danger-500/10', text: 'text-danger-600 dark:text-danger-400' },
}

export function TaskRow({
  task,
  onToggle,
  onDelete,
  busy,
  showDate = false,
  first = false,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  busy: boolean
  /** Show the due day as well as the time (All tasks screen). */
  showDate?: boolean
  first?: boolean
}) {
  const today = localDateString()
  const overdue = !task.completed && !!task.due_date && task.due_date < today
  const coins = TASK_COINS_BY_PRIORITY[task.priority]
  const sub = [
    showDate && task.due_date ? relativeDay(task.due_date, today) : null,
    task.due_time ? clock12(task.due_time) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const confirmDelete = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Delete task?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={task.title}
      accessibilityHint="Long press to delete"
      onLongPress={confirmDelete}
      onPress={onToggle}
      className={cn('flex-row items-center gap-3 py-3 pl-3 pr-3.5', !first && 'border-t border-border')}
      style={busy ? { opacity: 0.6 } : undefined}
    >
      {/* Priority accent */}
      <View
        className="w-[3px] self-stretch rounded-full"
        style={{ backgroundColor: task.completed ? 'transparent' : PRIORITY_COLOR[task.priority], marginVertical: -4 }}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
        hitSlop={10}
        disabled={busy}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onToggle()
        }}
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full border-[1.5px]',
          task.completed ? 'border-accentGreen-500 bg-accentGreen-500' : 'border-muted-foreground/60',
        )}
      >
        {task.completed ? <Check size={14} strokeWidth={3} color="#ffffff" /> : null}
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text
          className={cn('text-[15px] font-medium text-foreground', task.completed && 'line-through opacity-50')}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {sub ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            {task.due_time && !task.completed ? <Bell size={10} color={overdue ? '#ef4444' : '#8a9793'} /> : null}
            <Muted className={cn('text-[11px]', overdue && 'text-danger-500')}>{sub}</Muted>
          </View>
        ) : null}
      </View>
      {task.completed ? (
        <Muted className="text-[11px]">+{coins}</Muted>
      ) : (
        <View className={cn('rounded-full px-2.5 py-1', PRIORITY_PILL[task.priority].bg)}>
          <Text className={cn('text-[11px] font-semibold', PRIORITY_PILL[task.priority].text)}>
            {PRIORITY_LABEL[task.priority]} · +{coins}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
