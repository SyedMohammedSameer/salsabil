import { useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Check, Trash2, Plus, X } from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input } from '~/components/ui'
import {
  useTasksForDate,
  useCreateTask,
  useCompleteTask,
  useDeleteTask,
} from '@/hooks/useTasks'
import { localDateString } from '@/lib/dates'
import { TASK_COINS_BY_PRIORITY } from '@/lib/rewards'
import type { Task, TaskPriority } from '@/lib/database.types'

// Ported from src/views/tasks/TasksView.tsx. The hooks are shared unchanged, so
// completing a task here awards coins through the same idempotent ledger path.

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#83938f',
  medium: '#14b8a6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

type Filter = 'all' | 'open' | 'done'

function TaskRow({
  task,
  onToggle,
  onDelete,
  busy,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <Card className="flex-row items-center gap-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
        disabled={busy}
        onPress={onToggle}
        className="h-7 w-7 items-center justify-center rounded-md border"
        style={{
          borderColor: task.completed ? '#10b981' : '#83938f',
          backgroundColor: task.completed ? '#10b981' : 'transparent',
        }}
      >
        {task.completed ? <Check size={16} color="#ffffff" /> : null}
      </Pressable>

      <View className="min-w-0 flex-1">
        <Text
          className="text-base text-foreground"
          style={task.completed ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
        >
          {task.title}
        </Text>
        <View className="flex-row items-center gap-2 pt-0.5">
          <Text className="text-[11px]" style={{ color: PRIORITY_COLOR[task.priority] }}>
            {task.priority}
          </Text>
          <Muted className="text-[11px]">
            +{TASK_COINS_BY_PRIORITY[task.priority]} coins
          </Muted>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${task.title}`}
        onPress={onDelete}
        hitSlop={8}
      >
        <Trash2 size={18} color="#83938f" />
      </Pressable>
    </Card>
  )
}

export default function TasksScreen() {
  const today = localDateString()
  const { data: tasks, isLoading } = useTasksForDate(today)
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [filter, setFilter] = useState<Filter>('open')

  const visible = useMemo(() => {
    const all = tasks ?? []
    if (filter === 'open') return all.filter((t) => !t.completed)
    if (filter === 'done') return all.filter((t) => t.completed)
    return all
  }, [tasks, filter])

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    createTask.mutate(
      { title: trimmed, priority, due_date: today },
      {
        onSuccess: () => {
          setTitle('')
          setPriority('medium')
          setAdding(false)
        },
      },
    )
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={adding ? 'Cancel new task' : 'Add task'}
          onPress={() => setAdding((v) => !v)}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          {adding ? <X size={18} color="#ffffff" /> : <Plus size={18} color="#ffffff" />}
        </Pressable>
      </View>

      {adding ? (
        <Card className="mb-3 gap-3">
          <Input
            label="Task"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-foreground">Priority</Text>
            <View className="flex-row gap-2">
              {PRIORITIES.map((p) => {
                const active = priority === p
                return (
                  <Pressable
                    key={p}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setPriority(p)}
                    className="flex-1 items-center rounded-lg border py-2"
                    style={{
                      borderColor: active ? PRIORITY_COLOR[p] : 'transparent',
                      backgroundColor: active
                        ? `${PRIORITY_COLOR[p]}1a`
                        : 'rgba(127,127,127,0.08)',
                    }}
                  >
                    <Text
                      className="text-[11px]"
                      style={{ color: active ? PRIORITY_COLOR[p] : '#83938f' }}
                    >
                      {p}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
          <Button onPress={submit} loading={createTask.isPending} disabled={!title.trim()}>
            Add task
          </Button>
        </Card>
      ) : null}

      <View className="flex-row gap-2 pb-3">
        {(['open', 'done', 'all'] as Filter[]).map((f) => {
          const active = filter === f
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(f)}
              className="rounded-full border px-3 py-1.5"
              style={{
                borderColor: active ? '#14b8a6' : 'transparent',
                backgroundColor: active ? 'rgba(20,184,166,0.1)' : 'rgba(127,127,127,0.08)',
              }}
            >
              <Text className="text-xs" style={{ color: active ? '#14b8a6' : '#83938f' }}>
                {f}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : visible.length === 0 ? (
        <View className="items-center py-16">
          <Muted>
            {filter === 'done' ? 'Nothing completed yet today.' : 'No tasks for today.'}
          </Muted>
        </View>
      ) : (
        <View className="gap-2">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              busy={completeTask.isPending && completeTask.variables?.id === task.id}
              onToggle={() =>
                completeTask.mutate({ id: task.id, completed: !task.completed })
              }
              onDelete={() => deleteTask.mutate(task.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  )
}
