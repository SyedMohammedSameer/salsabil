import { describe, it, expect } from 'vitest'

// ─── Task filtering logic ─────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  completed: boolean
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    title: 'Test task',
    completed: false,
    due_date: null,
    priority: 'medium',
    ...overrides,
  }
}

function filterToday(tasks: Task[], today: string): Task[] {
  return tasks.filter((t) => t.due_date === today || !t.due_date)
}

function filterUpcoming(tasks: Task[], today: string): Task[] {
  return tasks.filter((t) => t.due_date && t.due_date > today && !t.completed)
}

const TODAY = '2025-05-04'
const TOMORROW = '2025-05-05'
const YESTERDAY = '2025-05-03'

describe('Task filtering — today tab', () => {
  it('includes tasks with no due date', () => {
    const t = makeTask({ due_date: null })
    expect(filterToday([t], TODAY)).toHaveLength(1)
  })

  it('includes tasks due today', () => {
    const t = makeTask({ due_date: TODAY })
    expect(filterToday([t], TODAY)).toHaveLength(1)
  })

  it('excludes tasks due tomorrow', () => {
    const t = makeTask({ due_date: TOMORROW })
    expect(filterToday([t], TODAY)).toHaveLength(0)
  })

  it('excludes tasks due yesterday', () => {
    const t = makeTask({ due_date: YESTERDAY })
    expect(filterToday([t], TODAY)).toHaveLength(0)
  })
})

describe('Task filtering — upcoming tab', () => {
  it('includes future incomplete tasks', () => {
    const t = makeTask({ due_date: TOMORROW, completed: false })
    expect(filterUpcoming([t], TODAY)).toHaveLength(1)
  })

  it('excludes completed future tasks', () => {
    const t = makeTask({ due_date: TOMORROW, completed: true })
    expect(filterUpcoming([t], TODAY)).toHaveLength(0)
  })

  it('excludes tasks without a due date', () => {
    const t = makeTask({ due_date: null })
    expect(filterUpcoming([t], TODAY)).toHaveLength(0)
  })

  it('excludes tasks due today (not upcoming)', () => {
    const t = makeTask({ due_date: TODAY })
    expect(filterUpcoming([t], TODAY)).toHaveLength(0)
  })

  it('excludes overdue tasks', () => {
    const t = makeTask({ due_date: YESTERDAY })
    expect(filterUpcoming([t], TODAY)).toHaveLength(0)
  })
})

describe('Priority ordering', () => {
  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }

  it('urgent > high > medium > low', () => {
    expect(PRIORITY_ORDER.urgent).toBeLessThan(PRIORITY_ORDER.high)
    expect(PRIORITY_ORDER.high).toBeLessThan(PRIORITY_ORDER.medium)
    expect(PRIORITY_ORDER.medium).toBeLessThan(PRIORITY_ORDER.low)
  })

  it('sorts tasks by priority', () => {
    const tasks: Task[] = [
      makeTask({ priority: 'low' }),
      makeTask({ priority: 'urgent' }),
      makeTask({ priority: 'medium' }),
      makeTask({ priority: 'high' }),
    ]
    const sorted = [...tasks].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    )
    expect(sorted[0].priority).toBe('urgent')
    expect(sorted[1].priority).toBe('high')
    expect(sorted[2].priority).toBe('medium')
    expect(sorted[3].priority).toBe('low')
  })
})
