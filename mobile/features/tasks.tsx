import { useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Plus, CalendarDays, ChevronRight, Bell } from 'lucide-react-native'
import { HubContent, Muted, Card, Gradient, FadeIn, SectionHeader } from '~/components/ui'
import { MonthGrid, TimeChips } from '~/components/ui/pickers'
import { TaskRow, PRIORITY_COLOR, PRIORITY_LABEL } from '~/components/tasks/TaskRow'
import { scheduleTaskReminder, cancelTaskReminder } from '~/lib/notifications'
import { clock12, relativeDay, addDays } from '~/lib/format'
import { useAllTasks, useCreateTask, useCompleteTask, useDeleteTask } from '@/hooks/useTasks'
import { localDateString } from '@/lib/dates'
import { TASK_COINS_BY_PRIORITY } from '@/lib/rewards'
import { cn } from '@/lib/cn'
import type { TaskPriority } from '@/lib/database.types'

// The Tasks section of the Focus hub: today's tasks, with a quick-add bar
// that takes an optional due date and time. A task with a time gets an
// on-device reminder. Everything not due today lives on the All tasks screen.

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const SUMMARY = ['#059669', '#047857'] as const

export default function TasksScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()

  const { data: allTasks, isLoading } = useAllTasks()
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  // Quick add
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState<string | null>(today)
  const [dueTime, setDueTime] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)

  const tasks = allTasks ?? []
  const todays = useMemo(() => tasks.filter((t) => t.due_date === today), [tasks, today])
  const overdue = useMemo(
    () => tasks.filter((t) => !t.completed && !!t.due_date && t.due_date < today),
    [tasks, today],
  )
  const upcoming = useMemo(
    () => tasks.filter((t) => !t.completed && !!t.due_date && t.due_date > today),
    [tasks, today],
  )
  const todo = todays.filter((t) => !t.completed)
  const done = todays.filter((t) => t.completed)
  const earned = done.reduce((s, t) => s + TASK_COINS_BY_PRIORITY[t.priority], 0)
  const available = todays.reduce((s, t) => s + TASK_COINS_BY_PRIORITY[t.priority], 0)
  const pct = todays.length ? done.length / todays.length : 0

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    createTask.mutate(
      {
        title: trimmed,
        priority,
        due_date: dueDate ?? undefined,
        due_time: dueTime ?? undefined,
      },
      {
        onSuccess: (task) => {
          setTitle('')
          setPriority('medium')
          setDueDate(today)
          setDueTime(null)
          setScheduling(false)
          if (task.due_time) void scheduleTaskReminder(task)
        },
      },
    )
  }

  const toggle = (id: string, completed: boolean) => {
    completeTask.mutate({ id, completed })
    if (completed) void cancelTaskReminder(id)
  }
  const remove = (id: string) => {
    deleteTask.mutate(id)
    void cancelTaskReminder(id)
  }

  const whenLabel = [
    dueDate ? relativeDay(dueDate, today) : 'No date',
    dueTime ? clock12(dueTime) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Summary */}
        <FadeIn index={0}>
          <Gradient
            colors={SUMMARY}
            radius={20}
            orbs
            style={{
              backgroundColor: '#059669',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <View className="px-[18px] pb-4 pt-4">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/85">Today</Text>
                  <Text className="mt-1 text-[34px] font-bold leading-[38px] tracking-tight text-white">
                    {done.length}
                    <Text className="text-base font-medium text-white/85"> of {todays.length} done</Text>
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/85">Earned</Text>
                  <Text className="mt-1 text-[22px] font-bold leading-[26px] text-white">+{earned}</Text>
                  <Text className="text-xs text-white/85">of {available} coins</Text>
                </View>
              </View>
              <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
                <View className="h-full rounded-full bg-white" style={{ width: `${pct * 100}%` }} />
              </View>
            </View>
          </Gradient>
        </FadeIn>

        {/* Quick add */}
        <FadeIn index={1}>
          <Card className="gap-3 p-2 pl-4">
            <View className="flex-row items-center gap-2.5">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Add a task…"
                placeholderTextColor="#9aa8a4"
                returnKeyType="done"
                onSubmitEditing={submit}
                accessibilityLabel="New task"
                className="min-w-0 flex-1 py-2 text-[15px] text-foreground"
              />
              <View className="flex-row items-center gap-1.5">
                {PRIORITIES.map((p) => {
                  const active = priority === p
                  return (
                    <Pressable
                      key={p}
                      accessibilityRole="button"
                      accessibilityLabel={`${PRIORITY_LABEL[p]} priority`}
                      accessibilityState={{ selected: active }}
                      hitSlop={6}
                      onPress={() => {
                        void Haptics.selectionAsync()
                        setPriority(p)
                      }}
                      className="h-5 w-5 items-center justify-center"
                    >
                      <View
                        className="h-3.5 w-3.5 rounded-full"
                        style={{
                          backgroundColor: PRIORITY_COLOR[p],
                          ...(active
                            ? { borderWidth: 2, borderColor: dark ? '#070c0b' : '#ffffff', shadowColor: PRIORITY_COLOR[p], transform: [{ scale: 1.3 }] }
                            : { opacity: 0.55 }),
                        }}
                      />
                    </Pressable>
                  )
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set date and time"
                accessibilityState={{ expanded: scheduling }}
                onPress={() => setScheduling((v) => !v)}
                className={cn(
                  'h-9 w-9 items-center justify-center rounded-xl',
                  scheduling || dueTime || dueDate !== today ? 'bg-noor-500/10' : 'bg-muted',
                )}
              >
                <CalendarDays size={18} color={scheduling || dueTime || dueDate !== today ? (dark ? '#2dd4bf' : '#0d9488') : '#8a9793'} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add task"
                disabled={!title.trim() || createTask.isPending}
                onPress={submit}
                className="h-9 w-9 items-center justify-center rounded-xl bg-primary"
                style={!title.trim() ? { opacity: 0.45 } : undefined}
              >
                {createTask.isPending ? <ActivityIndicator size="small" color="#ffffff" /> : <Plus size={18} strokeWidth={2.5} color="#ffffff" />}
              </Pressable>
            </View>

            {(scheduling || dueTime || dueDate !== today) && !scheduling ? (
              <Pressable onPress={() => setScheduling(true)} className="flex-row items-center gap-1.5 pb-1">
                {dueTime ? <Bell size={12} color={dark ? '#2dd4bf' : '#0d9488'} /> : <CalendarDays size={12} color={dark ? '#2dd4bf' : '#0d9488'} />}
                <Text className="text-xs font-medium text-noor-600 dark:text-noor-400">{whenLabel}</Text>
              </Pressable>
            ) : null}

            {scheduling ? (
              <View className="gap-3 pb-2 pr-2">
                <View className="flex-row flex-wrap gap-2">
                  {[
                    { label: 'Today', value: today },
                    { label: 'Tomorrow', value: addDays(today, 1) },
                    { label: 'Next week', value: addDays(today, 7) },
                    { label: 'No date', value: null },
                  ].map((o) => {
                    const active = dueDate === o.value
                    return (
                      <Pressable
                        key={o.label}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          void Haptics.selectionAsync()
                          setDueDate(o.value)
                          if (!o.value) setDueTime(null)
                        }}
                        className={cn(
                          'rounded-full border px-3 py-1.5',
                          active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted',
                        )}
                      >
                        <Text className={cn('text-xs font-semibold', active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                          {o.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <MonthGrid value={dueDate} onChange={setDueDate} marks={new Set(tasks.filter((t) => !t.completed && t.due_date).map((t) => t.due_date as string))} />
                {dueDate ? (
                  <View className="gap-1.5">
                    <Text className="text-xs font-semibold text-foreground">Time · a reminder fires at it</Text>
                    <TimeChips value={dueTime} onChange={setDueTime} />
                  </View>
                ) : null}
                <Pressable onPress={() => setScheduling(false)} className="items-end">
                  <Text className="text-xs font-semibold text-noor-600 dark:text-noor-400">Done · {whenLabel}</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        </FadeIn>

        {isLoading ? <ActivityIndicator /> : null}

        {/* Overdue */}
        {overdue.length > 0 ? (
          <FadeIn index={2}>
            <View className="gap-3">
              <SectionHeader title="Overdue" description={`${overdue.length} from earlier days`} />
              <Card className="border-danger-500/30 p-0">
                {overdue.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    first={i === 0}
                    showDate
                    busy={completeTask.isPending && completeTask.variables?.id === task.id}
                    onToggle={() => toggle(task.id, !task.completed)}
                    onDelete={() => remove(task.id)}
                  />
                ))}
              </Card>
            </View>
          </FadeIn>
        ) : null}

        {/* To do */}
        <FadeIn index={3}>
          <View className="gap-3">
            <View className="flex-row items-end justify-between">
              <SectionHeader title="To do" />
              <Muted className="text-xs">{todo.length}</Muted>
            </View>
            {todo.length === 0 && !isLoading ? (
              <Card variant="outline-dashed" className="items-center py-6">
                <Muted className="text-xs">{todays.length ? 'All done for today. MashaAllah.' : 'Nothing due today. Add one above.'}</Muted>
              </Card>
            ) : (
              <Card className="p-0">
                {todo.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    first={i === 0}
                    busy={completeTask.isPending && completeTask.variables?.id === task.id}
                    onToggle={() => toggle(task.id, true)}
                    onDelete={() => remove(task.id)}
                  />
                ))}
              </Card>
            )}
          </View>
        </FadeIn>

        {/* Done */}
        {done.length > 0 ? (
          <FadeIn index={4}>
            <View className="gap-3">
              <View className="flex-row items-end justify-between">
                <SectionHeader title="Done" />
                <Muted className="text-xs">{done.length}</Muted>
              </View>
              <Card className="p-0">
                {done.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    first={i === 0}
                    busy={completeTask.isPending && completeTask.variables?.id === task.id}
                    onToggle={() => toggle(task.id, false)}
                    onDelete={() => remove(task.id)}
                  />
                ))}
              </Card>
            </View>
          </FadeIn>
        ) : null}

        {/* Everything else */}
        <FadeIn index={5}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/tasks')}
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-noor-500/10">
              <CalendarDays size={18} color={dark ? '#2dd4bf' : '#0d9488'} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-foreground">All tasks and upcoming</Text>
              <Muted className="text-xs">
                {upcoming.length} upcoming
                {overdue.length ? ` · ${overdue.length} overdue` : ''} · calendar view
              </Muted>
            </View>
            <ChevronRight size={18} color="#8a9793" />
          </Pressable>
        </FadeIn>
      </View>
    </HubContent>
  )
}
