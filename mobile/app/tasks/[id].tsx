import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Trash2, Repeat, Tag, X, Check, Bell } from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input, FadeIn } from '~/components/ui'
import { MonthGrid, TimeChips } from '~/components/ui/pickers'
import { PRIORITY_COLOR, PRIORITY_LABEL } from '~/components/tasks/TaskRow'
import { addDays, clock12, relativeDay } from '~/lib/format'
import { useAllTasks, useCreateTask, useUpdateTask, useDeleteTask, useCompleteTask } from '@/hooks/useTasks'
import { nextOccurrence } from '@/lib/api/tasks'
import { TASK_COINS_BY_PRIORITY } from '@/lib/rewards'
import { localDateString } from '@/lib/dates'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'
import type { TaskPriority, TaskRecurrence } from '@/lib/database.types'

// One task, in full: title, notes, priority, when it is due, whether it
// repeats, and tags. Opened by tapping a task anywhere; `new` creates one,
// optionally on a given day (`?date=YYYY-MM-DD`, from the All tasks calendar).

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const REPEATS: { value: TaskRecurrence; label: string }[] = [
  { value: 'none', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function Label({ children }: { children: string }) {
  return <Text className="text-sm font-medium text-foreground">{children}</Text>
}

function Pill({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted')}
    >
      {children}
    </Pressable>
  )
}

export default function TaskEditorScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>()
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()
  const isNew = id === 'new'

  const { data: tasks, isLoading } = useAllTasks()
  const task = useMemo(() => (isNew ? null : (tasks ?? []).find((t) => t.id === id) ?? null), [tasks, id, isNew])
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const completeTask = useCompleteTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState<string | null>(isNew ? (date ?? today) : null)
  const [dueTime, setDueTime] = useState<string | null>(null)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [calendar, setCalendar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the form once the task is loaded, without clobbering edits in flight.
  const [seeded, setSeeded] = useState(isNew)
  useEffect(() => {
    if (seeded || !task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setDueDate(task.due_date)
    setDueTime(task.due_time ? task.due_time.slice(0, 5) : null)
    setRecurrence(task.recurrence)
    setTags(task.tags ?? [])
    setSeeded(true)
  }, [task, seeded])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const t of tasks ?? []) for (const tag of t.tags ?? []) set.add(tag)
    return [...set].filter((t) => !tags.includes(t)).slice(0, 8)
  }, [tasks, tags])

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '').toLowerCase().slice(0, 24)
    if (!tag || tags.includes(tag) || tags.length >= 8) return
    setTags((t) => [...t, tag])
    setTagDraft('')
  }

  const save = () => {
    setError(null)
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Give the task a title.')
      return
    }
    if (recurrence !== 'none' && !dueDate) {
      setError('A repeating task needs a date to start from.')
      return
    }
    const fields = {
      title: trimmed,
      description: description.trim() || null,
      priority,
      due_date: dueDate,
      due_time: dueDate ? dueTime : null,
      recurrence,
      tags,
    }
    const done = () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    }
    const failed = (e: unknown) => setError(e instanceof Error ? e.message : 'Could not save the task.')
    if (isNew) {
      createTask.mutate(
        {
          ...fields,
          description: fields.description ?? undefined,
          due_date: fields.due_date ?? undefined,
          due_time: fields.due_time ?? undefined,
        },
        { onSuccess: done, onError: failed },
      )
    } else if (task) {
      updateTask.mutate({ id: task.id, updates: fields }, { onSuccess: done, onError: failed })
    }
  }

  const remove = () => {
    if (!task) return
    Alert.alert('Delete task?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteTask.mutate(task.id, {
            onSuccess: () => {
              toast.success('Task deleted')
              router.back()
            },
          }),
      },
    ])
  }

  if (!isNew && isLoading) {
    return (
      <Screen>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }
  if (!isNew && !task) {
    return (
      <Screen>
        <Card variant="outline-dashed" className="mt-4 items-center py-8">
          <Muted>This task no longer exists.</Muted>
        </Card>
      </Screen>
    )
  }

  const busy = createTask.isPending || updateTask.isPending
  const whenChips = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next week', value: addDays(today, 7) },
    { label: 'No date', value: null },
  ]
  const repeatHint =
    recurrence !== 'none' && dueDate
      ? `Next after this one: ${relativeDay(nextOccurrence(dueDate, recurrence) ?? dueDate, today)}`
      : null

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'New task' : 'Edit task' }} />
      <View className="gap-4 pb-10 pt-2">
        {task ? (
          <FadeIn index={0}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                completeTask.mutate({ id: task.id, completed: !task.completed })
              }}
              className={cn(
                'flex-row items-center gap-3 rounded-2xl border px-4 py-3',
                task.completed ? 'border-accentGreen-500/40 bg-accentGreen-500/10' : 'border-border bg-card',
              )}
            >
              <View
                className={cn(
                  'h-6 w-6 items-center justify-center rounded-full border-[1.5px]',
                  task.completed ? 'border-accentGreen-500 bg-accentGreen-500' : 'border-muted-foreground/60',
                )}
              >
                {task.completed ? <Check size={14} strokeWidth={3} color="#ffffff" /> : null}
              </View>
              <Text className="flex-1 text-[14px] font-medium text-foreground">
                {task.completed ? 'Completed' : 'Mark as done'}
              </Text>
              <Muted className="text-xs">+{TASK_COINS_BY_PRIORITY[task.priority]} coins</Muted>
            </Pressable>
          </FadeIn>
        ) : null}

        <FadeIn index={1}>
          <Card className="gap-4">
            <Input label="Title" value={title} onChangeText={setTitle} placeholder="What needs doing?" autoFocus={isNew} maxLength={200} />
            <View className="gap-1.5">
              <Label>Notes</Label>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Details, links, a checklist…"
                placeholderTextColor="#83938f"
                multiline
                maxLength={2000}
                accessibilityLabel="Notes"
                className="min-h-[88px] rounded-xl border border-input bg-card px-3 py-2.5 text-base text-foreground"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            <View className="gap-2">
              <Label>Priority</Label>
              <View className="flex-row flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <Pill key={p} active={priority === p} onPress={() => setPriority(p)}>
                    <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[p] }} />
                    <Text className={cn('text-xs font-semibold', priority === p ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                      {PRIORITY_LABEL[p] === 'Med' ? 'Medium' : PRIORITY_LABEL[p]} · +{TASK_COINS_BY_PRIORITY[p]}
                    </Text>
                  </Pill>
                ))}
              </View>
            </View>
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Label>Due</Label>
              <Pressable onPress={() => setCalendar((v) => !v)} hitSlop={6}>
                <Text className="text-xs font-semibold text-noor-600 dark:text-noor-400">{calendar ? 'Hide calendar' : 'Pick a date'}</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {whenChips.map((o) => (
                <Pill
                  key={o.label}
                  active={dueDate === o.value}
                  onPress={() => {
                    setDueDate(o.value)
                    if (!o.value) {
                      setDueTime(null)
                      setRecurrence('none')
                    }
                  }}
                >
                  <Text className={cn('text-xs font-semibold', dueDate === o.value ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                    {o.label}
                  </Text>
                </Pill>
              ))}
              {dueDate && !whenChips.some((o) => o.value === dueDate) ? (
                <Pill active onPress={() => setCalendar(true)}>
                  <Text className="text-xs font-semibold text-noor-600 dark:text-noor-400">{relativeDay(dueDate, today)}</Text>
                </Pill>
              ) : null}
            </View>
            {calendar ? <MonthGrid value={dueDate} onChange={setDueDate} /> : null}
            {dueDate ? (
              <View className="gap-1.5">
                <View className="flex-row items-center gap-1.5">
                  <Bell size={12} color="#8a9793" />
                  <Muted className="text-xs">{dueTime ? `Reminder at ${clock12(dueTime)}` : 'Add a time for a reminder'}</Muted>
                </View>
                <TimeChips value={dueTime} onChange={setDueTime} />
              </View>
            ) : null}
          </Card>
        </FadeIn>

        <FadeIn index={3}>
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <Repeat size={15} color={dark ? '#2dd4bf' : '#0d9488'} />
              <Label>Repeat</Label>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {REPEATS.map((r) => (
                <Pill
                  key={r.value}
                  active={recurrence === r.value}
                  onPress={() => {
                    setRecurrence(r.value)
                    if (r.value !== 'none' && !dueDate) setDueDate(today)
                  }}
                >
                  <Text className={cn('text-xs font-semibold', recurrence === r.value ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                    {r.label}
                  </Text>
                </Pill>
              ))}
            </View>
            {repeatHint ? <Muted className="text-xs">{repeatHint}. The next one appears when you complete this.</Muted> : null}
          </Card>
        </FadeIn>

        <FadeIn index={4}>
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <Tag size={15} color={dark ? '#2dd4bf' : '#0d9488'} />
              <Label>Tags</Label>
            </View>
            {tags.length ? (
              <View className="flex-row flex-wrap gap-2">
                {tags.map((t) => (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove tag ${t}`}
                    onPress={() => setTags((all) => all.filter((x) => x !== t))}
                    className="flex-row items-center gap-1 rounded-full bg-noor-500/10 py-1.5 pl-3 pr-2"
                  >
                    <Text className="text-xs font-semibold text-noor-700 dark:text-noor-300">#{t}</Text>
                    <X size={12} color={dark ? '#5eead4' : '#0f766e'} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput
              value={tagDraft}
              onChangeText={(v) => (v.endsWith(' ') || v.endsWith(',') ? addTag(v.slice(0, -1)) : setTagDraft(v))}
              onSubmitEditing={() => addTag(tagDraft)}
              placeholder="Add a tag, e.g. study"
              placeholderTextColor="#83938f"
              autoCapitalize="none"
              returnKeyType="done"
              accessibilityLabel="New tag"
              className="h-11 rounded-xl border border-input bg-card px-3 text-[15px] text-foreground"
            />
            {allTags.length ? (
              <View className="flex-row flex-wrap gap-2">
                {allTags.map((t) => (
                  <Pressable key={t} onPress={() => addTag(t)} className="rounded-full bg-muted px-3 py-1.5">
                    <Text className="text-xs text-muted-foreground">+ #{t}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        </FadeIn>

        {error ? <Text className="px-1 text-xs text-destructive">{error}</Text> : null}
        <Button onPress={save} loading={busy}>
          {isNew ? 'Add task' : 'Save changes'}
        </Button>

        {task ? (
          <Pressable
            accessibilityRole="button"
            onPress={remove}
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-danger-500/30 py-3"
          >
            <Trash2 size={16} color="#ef4444" />
            <Text className="text-sm font-semibold text-danger-500">Delete task</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  )
}
