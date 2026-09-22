import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { CalendarDays } from 'lucide-react-native'
import { Screen, Muted, Card, SectionHeader } from '~/components/ui'
import { MonthGrid } from '~/components/ui/pickers'
import { TaskRow } from '~/components/tasks/TaskRow'
import { cancelTaskReminder } from '~/lib/notifications'
import { addDays, parseDate, relativeDay } from '~/lib/format'
import { useAllTasks, useCompleteTask, useDeleteTask } from '@/hooks/useTasks'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Task } from '@/lib/database.types'

// All tasks: a two-week strip and a month calendar to jump to any day, and
// otherwise everything grouped by when it is due. Pushed from the Focus hub.

type Group = { key: string; title: string; tasks: Task[]; danger?: boolean }

export default function AllTasksScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()
  const { data: allTasks, isLoading } = useAllTasks()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  const [day, setDay] = useState<string | null>(null)
  const [calendar, setCalendar] = useState(false)

  const tasks = allTasks ?? []
  const marks = useMemo(
    () => new Set(tasks.filter((t) => !t.completed && t.due_date).map((t) => t.due_date as string)),
    [tasks],
  )
  const strip = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today])

  const groups: Group[] = useMemo(() => {
    if (day) {
      const list = tasks.filter((t) => t.due_date === day)
      return [
        { key: 'open', title: relativeDay(day, today), tasks: list.filter((t) => !t.completed) },
        { key: 'done', title: 'Completed', tasks: list.filter((t) => t.completed) },
      ].filter((g) => g.tasks.length > 0)
    }
    const open = tasks.filter((t) => !t.completed)
    const weekEnd = addDays(today, 7)
    const tomorrow = addDays(today, 1)
    const g: Group[] = [
      { key: 'overdue', title: 'Overdue', tasks: open.filter((t) => t.due_date && t.due_date < today), danger: true },
      { key: 'today', title: 'Today', tasks: open.filter((t) => t.due_date === today) },
      { key: 'tomorrow', title: 'Tomorrow', tasks: open.filter((t) => t.due_date === tomorrow) },
      { key: 'week', title: 'Next 7 days', tasks: open.filter((t) => t.due_date && t.due_date > tomorrow && t.due_date <= weekEnd) },
      { key: 'later', title: 'Later', tasks: open.filter((t) => t.due_date && t.due_date > weekEnd) },
      { key: 'nodate', title: 'No date', tasks: open.filter((t) => !t.due_date) },
      {
        key: 'done',
        title: 'Completed recently',
        tasks: tasks
          .filter((t) => t.completed)
          .sort((a, b) => ((a.completed_at ?? '') < (b.completed_at ?? '') ? 1 : -1))
          .slice(0, 20),
      },
    ]
    return g.filter((x) => x.tasks.length > 0)
  }, [tasks, day, today])

  const toggle = (id: string, completed: boolean) => {
    completeTask.mutate({ id, completed })
    if (completed) void cancelTaskReminder(id)
  }
  const remove = (id: string) => {
    deleteTask.mutate(id)
    void cancelTaskReminder(id)
  }

  return (
    <Screen>
      <View className="gap-4 pb-6 pt-2">
        {/* Day strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
          style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
        >
          <StripChip label="All" sub="" active={day === null} onPress={() => setDay(null)} />
          {strip.map((d) => {
            const dt = parseDate(d)
            return (
              <StripChip
                key={d}
                label={dt.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}
                sub={String(dt.getDate())}
                active={day === d}
                marked={marks.has(d)}
                today={d === today}
                onPress={() => setDay(d)}
              />
            )
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            onPress={() => setCalendar((v) => !v)}
            className={cn('h-14 w-12 items-center justify-center rounded-2xl', calendar ? 'bg-noor-500/10' : 'bg-muted')}
          >
            <CalendarDays size={18} color={calendar ? (dark ? '#2dd4bf' : '#0d9488') : '#8a9793'} />
          </Pressable>
        </ScrollView>

        {calendar ? (
          <Card>
            <MonthGrid
              value={day}
              marks={marks}
              onChange={(d) => {
                setDay(d)
                setCalendar(false)
              }}
            />
          </Card>
        ) : null}

        {isLoading ? <ActivityIndicator /> : null}

        {groups.length === 0 && !isLoading ? (
          <Card variant="outline-dashed" className="items-center py-10">
            <Muted>{day ? `Nothing on ${relativeDay(day, today)}.` : 'No tasks yet.'}</Muted>
          </Card>
        ) : null}

        {groups.map((g) => (
          <View key={g.key} className="gap-3">
            <View className="flex-row items-end justify-between">
              <SectionHeader title={g.title} />
              <Muted className={cn('text-xs', g.danger && 'text-danger-500')}>{g.tasks.length}</Muted>
            </View>
            <Card className={cn('p-0', g.danger && 'border-danger-500/30')}>
              {g.tasks.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  first={i === 0}
                  showDate={g.key !== 'today' && !day}
                  busy={completeTask.isPending && completeTask.variables?.id === task.id}
                  onToggle={() => toggle(task.id, !task.completed)}
                  onDelete={() => remove(task.id)}
                />
              ))}
            </Card>
          </View>
        ))}
      </View>
    </Screen>
  )
}

function StripChip({
  label,
  sub,
  active,
  marked,
  today,
  onPress,
}: {
  label: string
  sub: string
  active: boolean
  marked?: boolean
  today?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className={cn(
        'h-14 w-12 items-center justify-center gap-0.5 rounded-2xl',
        active ? 'bg-primary' : today ? 'border border-noor-500 bg-card' : 'bg-muted',
      )}
    >
      <Text className={cn('text-[10px] font-semibold', active ? 'text-white/85' : 'text-muted-foreground')}>{label}</Text>
      {sub ? (
        <Text className={cn('text-[15px] font-bold', active ? 'text-white' : 'text-foreground')}>{sub}</Text>
      ) : (
        <Text className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-foreground')}>All</Text>
      )}
      {marked && !active ? <View className="h-1 w-1 rounded-full bg-noor-500" /> : null}
    </Pressable>
  )
}
