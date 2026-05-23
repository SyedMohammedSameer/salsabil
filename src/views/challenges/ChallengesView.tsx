import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trophy,
  CheckCircle2,
  Trash2,
  Loader2,
  Flame,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Coins,
  Sparkles,
  X,
  Pencil,
  Save,
  Calendar,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import {
  useChallenges,
  useCreateChallenge,
  useIncrementChallenge,
  useDeleteChallenge,
  useUpdateChallenge,
} from '@/hooks/useChallenges'
import type { Challenge, ChallengeStatus } from '@/lib/database.types'
import { cn } from '@/lib/cn'
import { localDateString } from '@/lib/dates'
import {
  CHALLENGE_TEMPLATES,
  DIFFICULTY_META,
  parseChallengeCategory,
  encodeChallengeCategory,
  getChallengeRewards,
  type ChallengeTemplate,
  type ChallengeDifficulty,
} from '@/data/challengeTemplates'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ChallengeStatus,
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'danger' }
> = {
  active: { label: 'Active', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'danger' },
  paused: { label: 'Paused', variant: 'warning' },
}

const LEGACY_CATEGORIES = ['fitness', 'prayer', 'quran', 'mindset', 'habit', 'other']

/** Tasks are stored as a JSON array in the description field. */
function getChallengeTasks(challenge: Challenge): string[] {
  if (challenge.description) {
    try {
      const p = JSON.parse(challenge.description)
      if (Array.isArray(p) && p.every((t) => typeof t === 'string')) return p
    } catch {
      /* plain text description */
    }
  }
  const { level } = parseChallengeCategory(challenge.category)
  return level?.tasks ?? []
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({
  value,
  max,
  size = 72,
  strokeWidth = 7,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circ * (1 - pct)

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-noor-500"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-bold text-foreground leading-none">{Math.round(pct * 100)}%</p>
      </div>
    </div>
  )
}

// ─── Challenge calendar ───────────────────────────────────────────────────────

function ChallengeCalendar({ challenge }: { challenge: Challenge }) {
  const start = new Date(challenge.start_date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)

  const total = challenge.target_days
  const done = challenge.current_days
  // cell sizing: small for long challenges, larger for short ones
  const cellPx = total <= 14 ? 26 : total <= 30 ? 20 : 14
  const fontSize = cellPx >= 22 ? 9 : cellPx >= 18 ? 8 : 0 // 0 = no number

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <p className="text-xs text-muted-foreground font-medium">Progress Calendar</p>
      </div>
      <div className="flex flex-wrap gap-1" style={{ maxWidth: '100%' }}>
        {Array.from({ length: total }).map((_, i) => {
          const dayNum = i + 1
          const isDone = dayNum <= done
          const isTodaySlot =
            dayNum === daysSinceStart + 1 && challenge.status === 'active' && !isDone

          return (
            <div
              key={i}
              style={{ width: cellPx, height: cellPx }}
              title={`Day ${dayNum}`}
              className={cn(
                'rounded-sm flex items-center justify-center transition-colors duration-200 shrink-0',
                isDone
                  ? 'bg-noor-500 text-white'
                  : isTodaySlot
                    ? 'bg-noor-500/20 ring-1 ring-noor-500 text-noor-500'
                    : 'bg-muted text-muted-foreground/30',
              )}
            >
              {fontSize > 0 && (
                <span style={{ fontSize }} className="font-medium leading-none select-none">
                  {dayNum}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-noor-500" />
          <span className="text-[10px] text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-muted" />
          <span className="text-[10px] text-muted-foreground">Pending</span>
        </div>
      </div>
    </div>
  )
}

// ─── Editable task list ───────────────────────────────────────────────────────

function EditableTaskList({
  tasks,
  onChange,
}: {
  tasks: string[]
  onChange: (tasks: string[]) => void
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const update = (i: number, val: string) => onChange(tasks.map((t, idx) => (idx === i ? val : t)))

  const remove = (i: number) => onChange(tasks.filter((_, idx) => idx !== i))

  const add = () => {
    onChange([...tasks, ''])
    // Focus the new input on next tick
    setTimeout(() => inputRefs.current[tasks.length]?.focus(), 30)
  }

  return (
    <div className="space-y-1.5">
      {tasks.map((task, i) => (
        <div key={i} className="flex items-center gap-1.5 group">
          <div className="h-4 w-4 rounded border border-muted-foreground/25 shrink-0 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/35" />
          </div>
          <input
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            value={task}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Task description…"
            className="flex-1 text-xs bg-transparent border-none outline-none rounded px-1 py-0.5 text-foreground placeholder:text-muted-foreground/50 focus:bg-muted/40 transition-colors"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-[11px] text-noor-500 hover:text-noor-400 transition-colors mt-1"
      >
        <Plus className="h-3 w-3" />
        Add task
      </button>
    </div>
  )
}

// ─── Challenge detail panel ───────────────────────────────────────────────────

function ChallengeDetailPanel({
  challenge,
  onClose,
  onIncrement,
}: {
  challenge: Challenge
  onClose: () => void
  onIncrement: () => void
}) {
  const [tasksOpen, setTasksOpen] = useState(false)
  const [editingTasks, setEditingTasks] = useState(false)
  const [tasks, setTasks] = useState<string[]>([])
  const updateChallenge = useUpdateChallenge()

  const { template, level, difficulty } = parseChallengeCategory(challenge.category)
  const { coinsPerDay, completionBonus } = getChallengeRewards(challenge.category)
  const diffMeta = difficulty ? DIFFICULTY_META[difficulty] : null
  const statusCfg = STATUS_CONFIG[challenge.status]
  const isActive = challenge.status === 'active'
  const isCompleted = challenge.status === 'completed'

  const daysLeft = challenge.target_days - challenge.current_days
  const coinsEarned = challenge.current_days * coinsPerDay + (isCompleted ? completionBonus : 0)
  const coinsLeft = isActive ? daysLeft * coinsPerDay + completionBonus : 0

  const projectedEnd = new Date(challenge.start_date + 'T00:00:00')
  projectedEnd.setDate(projectedEnd.getDate() + challenge.target_days)
  const endLabel = projectedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const taskList = getChallengeTasks(challenge)

  // Reset when switching challenges
  useEffect(() => {
    setTasks(taskList)
    setEditingTasks(false)
    setTasksOpen(false)
  }, [challenge.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveTasks = async () => {
    const finalTasks = tasks.filter((t) => t.trim())
    await updateChallenge.mutateAsync({ id: challenge.id, description: JSON.stringify(finalTasks) })
    setEditingTasks(false)
  }

  const handleToggleTasks = () => {
    setTasksOpen((p) => {
      if (p) setEditingTasks(false) // close edit mode when collapsing
      return !p
    })
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="p-0">
        {/* ── Coloured header ── */}
        <div
          className={cn(
            'px-4 pt-4 pb-3 flex items-start justify-between gap-2',
            template ? template.bgClass : 'bg-muted/30',
          )}
        >
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {template ? (
              <span className="text-2xl shrink-0">{template.emoji}</span>
            ) : (
              <Trophy className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight truncate">
                {challenge.title}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {diffMeta && difficulty && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      diffMeta.bgClass,
                      diffMeta.colorClass,
                    )}
                  >
                    {DIFFICULTY_META[difficulty].label}
                  </span>
                )}
                <Badge variant={statusCfg.variant} className="text-[10px] h-4 px-1.5">
                  {statusCfg.label}
                </Badge>
                {level && <span className="text-[10px] text-muted-foreground">{level.label}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* ── Progress ring + key numbers ── */}
          <div className="flex items-center gap-4">
            <ProgressRing
              value={challenge.current_days}
              max={challenge.target_days}
              size={64}
              strokeWidth={6}
            />
            <div className="space-y-0.5 flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Day {challenge.current_days} of {challenge.target_days}
              </p>
              {isCompleted ? (
                <p className="text-xs font-bold text-accent-500">
                  🏆 {(challenge.target_days * coinsPerDay + completionBonus).toLocaleString()}{' '}
                  coins earned
                </p>
              ) : isActive ? (
                <p className="text-xs font-semibold text-noor-500">
                  🪙 {coinsLeft.toLocaleString()} to earn
                </p>
              ) : coinsEarned > 0 ? (
                <p className="text-xs text-muted-foreground">
                  🪙 {coinsEarned.toLocaleString()} earned
                </p>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                {isCompleted ? `Completed ${endLabel}` : `Ends ~${endLabel}`}
              </p>
            </div>
          </div>

          {/* ── Calendar ── */}
          <ChallengeCalendar challenge={challenge} />

          {/* ── Action button ── */}
          {isActive && (
            <Button size="sm" className="w-full gap-1.5" onClick={onIncrement}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark today as done (+{coinsPerDay} 🪙)
            </Button>
          )}

          {/* ── Tasks accordion ── */}
          {taskList.length > 0 && (
            <div className="border-t border-border pt-1">
              {/* Accordion toggle row */}
              <button
                onClick={handleToggleTasks}
                className="w-full flex items-center justify-between py-2 text-xs font-semibold text-foreground hover:text-noor-500 transition-colors"
              >
                <span>Daily tasks ({taskList.length})</span>
                <div className="flex items-center gap-2">
                  {/* Edit button — only visible when open and not editing */}
                  {tasksOpen && !editingTasks && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setTasks(taskList)
                        setEditingTasks(true)
                      }}
                      className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {tasksOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Collapsible content */}
              <AnimatePresence initial={false}>
                {tasksOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2 space-y-2">
                      {editingTasks ? (
                        <>
                          <EditableTaskList tasks={tasks} onChange={setTasks} />
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs gap-1"
                              onClick={handleSaveTasks}
                              disabled={updateChallenge.isPending}
                            >
                              {updateChallenge.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setTasks(taskList)
                                setEditingTasks(false)
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          {taskList.map((task, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                              <div className="h-4 w-4 rounded border border-muted-foreground/25 shrink-0 mt-0.5 flex items-center justify-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/35" />
                              </div>
                              <span className="leading-snug">{task}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Template showcase (always visible on the tab) ────────────────────────────

function TemplateShowcase({
  onStartTemplate,
}: {
  onStartTemplate: (t: ChallengeTemplate) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
        Challenge Templates
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
        {CHALLENGE_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={cn(
              'shrink-0 w-44 rounded-xl border p-3 space-y-2 flex flex-col',
              template.bgClass,
              template.borderClass,
            )}
          >
            <span className="text-2xl">{template.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground leading-tight">{template.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                {template.tagline}
              </p>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['easy', 'medium', 'hard'] as ChallengeDifficulty[]).map((d) => (
                <span
                  key={d}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-semibold',
                    DIFFICULTY_META[d].bgClass,
                    DIFFICULTY_META[d].colorClass,
                  )}
                >
                  {DIFFICULTY_META[d].label}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className={cn('w-full h-7 text-xs gap-1', template.colorClass)}
              onClick={() => onStartTemplate(template)}
            >
              Start →
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 1 — Template Picker (in dialog) ─────────────────────────────────────

function TemplatePicker({ onSelect }: { onSelect: (template: ChallengeTemplate | null) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pick a template or build your own from scratch
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {CHALLENGE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={cn(
              'rounded-xl p-3 border text-left transition-all hover:scale-[1.02] active:scale-[0.98]',
              template.bgClass,
              template.borderClass,
            )}
          >
            <span className="text-2xl">{template.emoji}</span>
            <p className="text-sm font-semibold mt-1.5 leading-tight text-foreground">
              {template.name}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
              {template.tagline}
            </p>
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className="rounded-xl p-3 border border-dashed border-muted-foreground/30 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-muted-foreground/50 col-span-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Custom Challenge</p>
              <p className="text-[11px] text-muted-foreground">Build your own from scratch</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Difficulty card ──────────────────────────────────────────────────────────

function DifficultyCard({
  template,
  diff,
  selected,
  onClick,
}: {
  template: ChallengeTemplate
  diff: ChallengeDifficulty
  selected: boolean
  onClick: () => void
}) {
  const level = template.levels[diff]
  const meta = DIFFICULTY_META[diff]
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl p-2.5 border text-left transition-all',
        selected
          ? cn(meta.bgClass, meta.borderClass, 'ring-1', meta.ringClass)
          : 'border-border hover:border-muted-foreground/40',
      )}
    >
      <p className={cn('text-[11px] font-bold uppercase tracking-wider', meta.colorClass)}>
        {meta.label}
      </p>
      <p className="text-[11px] font-semibold text-foreground mt-0.5 leading-tight">
        {level.label}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {level.defaultDays}d · {level.tasks.length} tasks
      </p>
      <p className={cn('text-[11px] font-bold mt-1.5', meta.colorClass)}>
        🪙 {level.coinsPerDay}/day
      </p>
    </button>
  )
}

// ─── Step 2a — Configure template (with editable tasks) ───────────────────────

function TemplateConfigure({
  template,
  onBack,
  onSubmit,
  isLoading,
}: {
  template: ChallengeTemplate
  onBack: () => void
  onSubmit: (data: {
    title: string
    description?: string
    target_days: number
    start_date: string
    category: string
  }) => void
  isLoading: boolean
}) {
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium')
  const [useCustomDays, setUseCustomDays] = useState(false)
  const [selectedDays, setSelectedDays] = useState(template.levels.medium.defaultDays)
  const [customDaysRaw, setCustomDaysRaw] = useState('')
  const [title, setTitle] = useState(template.name)
  const [startDate, setStartDate] = useState(localDateString())
  const [tasks, setTasks] = useState<string[]>(template.levels.medium.tasks)

  const level = template.levels[difficulty]

  useEffect(() => {
    setSelectedDays(level.defaultDays)
    setUseCustomDays(false)
    setCustomDaysRaw('')
    setTasks(level.tasks)
  }, [difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveDays = useCustomDays
    ? Math.max(1, Math.min(365, Number(customDaysRaw) || level.defaultDays))
    : selectedDays

  const totalCoins = level.coinsPerDay * effectiveDays + level.completionBonus

  const handleCreate = () => {
    if (!title.trim()) return
    const finalTasks = tasks.filter((t) => t.trim())
    onSubmit({
      title: title.trim(),
      description: JSON.stringify(finalTasks),
      target_days: effectiveDays,
      start_date: startDate,
      category: encodeChallengeCategory(template.id, difficulty),
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 mt-0.5"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-2xl shrink-0">{template.emoji}</span>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">{template.name}</p>
            <p className="text-xs text-muted-foreground leading-snug">{template.tagline}</p>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Challenge name</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 text-sm"
          placeholder="Name your challenge"
        />
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Difficulty</Label>
        <div className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as ChallengeDifficulty[]).map((d) => (
            <DifficultyCard
              key={d}
              template={template}
              diff={d}
              selected={difficulty === d}
              onClick={() => setDifficulty(d)}
            />
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Duration</Label>
        <div className="flex flex-wrap gap-1.5">
          {level.suggestedDays.map((d) => (
            <button
              key={d}
              onClick={() => {
                setSelectedDays(d)
                setUseCustomDays(false)
              }}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                !useCustomDays && selectedDays === d
                  ? 'bg-noor-500 text-white border-noor-500'
                  : 'border-border hover:border-noor-500/50 text-foreground',
              )}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => setUseCustomDays(true)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-all',
              useCustomDays
                ? 'bg-noor-500 text-white border-noor-500'
                : 'border-border hover:border-noor-500/50 text-foreground',
            )}
          >
            Custom
          </button>
        </div>
        {useCustomDays && (
          <Input
            type="number"
            min={1}
            max={365}
            placeholder="Number of days…"
            value={customDaysRaw}
            onChange={(e) => setCustomDaysRaw(e.target.value)}
            className="h-8 text-sm w-36"
            autoFocus
          />
        )}
      </div>

      {/* Editable tasks */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Daily tasks — edit, remove, or add your own
        </Label>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <EditableTaskList tasks={tasks} onChange={setTasks} />
        </div>
      </div>

      {/* Start date */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Start date</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Reward preview */}
      <div className="rounded-xl bg-gradient-to-br from-noor-500/10 via-accent-500/5 to-transparent border border-noor-500/20 p-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Coins className="h-3.5 w-3.5 text-noor-500" />
          <p className="text-xs text-muted-foreground">Total reward if completed</p>
        </div>
        <p className="text-xl font-bold text-foreground tracking-tight">
          🪙 {totalCoins.toLocaleString()} coins
        </p>
        <p className="text-[11px] text-muted-foreground">
          {level.coinsPerDay} × {effectiveDays} days + {level.completionBonus.toLocaleString()}{' '}
          bonus
        </p>
      </div>

      <Button
        onClick={handleCreate}
        className="w-full gap-1.5"
        disabled={isLoading || !title.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Start Challenge
          </>
        )}
      </Button>
    </div>
  )
}

// ─── Step 2b — Custom form ────────────────────────────────────────────────────

const customSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(300).optional(),
  target_days: z.coerce.number().int().min(1).max(365),
  category: z.string().optional(),
  start_date: z.string(),
})

type CustomForm = z.infer<typeof customSchema>

function CustomChallengeForm({
  onBack,
  onSubmit,
  isLoading,
}: {
  onBack: () => void
  onSubmit: (data: {
    title: string
    description?: string
    target_days: number
    start_date: string
    category?: string
  }) => void
  isLoading: boolean
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomForm>({
    resolver: zodResolver(customSchema),
    defaultValues: { start_date: localDateString(), target_days: 30 },
  })
  const category = watch('category')
  const targetDays = watch('target_days')
  const coinsPerDay = 10
  const completionBonus = 150
  const totalCoins = (Number(targetDays) || 0) * coinsPerDay + completionBonus

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-foreground">Custom Challenge</p>
          <p className="text-xs text-muted-foreground">Define your own rules</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cc-title">Title</Label>
        <Input
          id="cc-title"
          placeholder="e.g. 30-day Fajr streak"
          autoFocus
          {...register('title')}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cc-desc" className="text-xs text-muted-foreground">
          Description (optional)
        </Label>
        <Input
          id="cc-desc"
          placeholder="What's this challenge about?"
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cc-days">Target days</Label>
          <Input id="cc-days" type="number" min={1} max={365} {...register('target_days')} />
          {errors.target_days && (
            <p className="text-xs text-destructive">{errors.target_days.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category ?? ''} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              {LEGACY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cc-start">Start date</Label>
        <Input id="cc-start" type="date" {...register('start_date')} />
      </div>

      <div className="rounded-xl bg-gradient-to-br from-noor-500/10 via-accent-500/5 to-transparent border border-noor-500/20 p-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Coins className="h-3.5 w-3.5 text-noor-500" />
          <p className="text-xs text-muted-foreground">Total reward if completed</p>
        </div>
        <p className="text-xl font-bold text-foreground">🪙 {totalCoins.toLocaleString()} coins</p>
        <p className="text-[11px] text-muted-foreground">
          {coinsPerDay} × {Number(targetDays) || 0} days + {completionBonus} bonus
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating…
          </>
        ) : (
          'Create Challenge'
        )}
      </Button>
    </form>
  )
}

// ─── New challenge dialog (fully controlled) ──────────────────────────────────

type DialogStep = 'pick' | 'configure-template' | 'configure-custom'

interface NewChallengeDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** undefined = show picker, null = custom, ChallengeTemplate = go straight to configure */
  initialTemplate?: ChallengeTemplate | null
  onAdded: () => void
}

function NewChallengeDialog({
  open,
  onOpenChange,
  initialTemplate,
  onAdded,
}: NewChallengeDialogProps) {
  const [step, setStep] = useState<DialogStep>('pick')
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null)
  const create = useCreateChallenge()

  // Sync step when dialog opens with an initialTemplate
  useEffect(() => {
    if (open) {
      if (initialTemplate === undefined) {
        setStep('pick')
        setSelectedTemplate(null)
      } else if (initialTemplate === null) {
        setStep('configure-custom')
        setSelectedTemplate(null)
      } else {
        setStep('configure-template')
        setSelectedTemplate(initialTemplate)
      }
    }
  }, [open, initialTemplate])

  const handleClose = (v: boolean) => {
    onOpenChange(v)
    if (!v) {
      setStep('pick')
      setSelectedTemplate(null)
    }
  }

  const handleTemplateSelect = (t: ChallengeTemplate | null) => {
    if (t) {
      setSelectedTemplate(t)
      setStep('configure-template')
    } else {
      setStep('configure-custom')
    }
  }

  const handleCreate = async (data: {
    title: string
    description?: string
    target_days: number
    start_date: string
    category?: string
  }) => {
    await create.mutateAsync(data)
    handleClose(false)
    onAdded()
  }

  const dialogTitle =
    step === 'pick'
      ? 'New Challenge'
      : step === 'configure-template' && selectedTemplate
        ? `${selectedTemplate.emoji} ${selectedTemplate.name}`
        : 'Custom Challenge'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn('max-h-[90vh] overflow-y-auto', step === 'pick' ? 'max-w-md' : 'max-w-sm')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'pick' && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <TemplatePicker onSelect={handleTemplateSelect} />
            </motion.div>
          )}

          {step === 'configure-template' && selectedTemplate && (
            <motion.div
              key="configure-template"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <TemplateConfigure
                template={selectedTemplate}
                onBack={() => setStep('pick')}
                onSubmit={handleCreate}
                isLoading={create.isPending}
              />
            </motion.div>
          )}

          {step === 'configure-custom' && (
            <motion.div
              key="configure-custom"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <CustomChallengeForm
                onBack={() => setStep('pick')}
                onSubmit={handleCreate}
                isLoading={create.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

// ─── Progress bar (used in compact card) ─────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-noor-500"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

// ─── Challenge card (compact, clickable) ──────────────────────────────────────

function ChallengeCard({
  challenge,
  selected,
  onClick,
  onDelete,
}: {
  challenge: Challenge
  selected: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const statusCfg = STATUS_CONFIG[challenge.status]
  const isActive = challenge.status === 'active'
  const isCompleted = challenge.status === 'completed'
  const { template, difficulty } = parseChallengeCategory(challenge.category)
  const { coinsPerDay } = getChallengeRewards(challenge.category)
  const diffMeta = difficulty ? DIFFICULTY_META[difficulty] : null
  const pct = Math.round((challenge.current_days / challenge.target_days) * 100)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <Card
        onClick={onClick}
        className={cn(
          'cursor-pointer transition-all hover:shadow-sm',
          isCompleted && 'border-accent-500/30 bg-accent-500/5',
          selected && 'ring-2 ring-noor-500 ring-offset-1',
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {template ? (
                  <span className="text-base shrink-0">{template.emoji}</span>
                ) : isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-accent-500 shrink-0" />
                ) : (
                  <Flame
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-noor-500' : 'text-muted-foreground/40',
                    )}
                  />
                )}
                <p className="text-sm font-semibold text-foreground truncate">{challenge.title}</p>
              </div>
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {diffMeta && difficulty && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      diffMeta.bgClass,
                      diffMeta.colorClass,
                    )}
                  >
                    {DIFFICULTY_META[difficulty].label}
                  </span>
                )}
                <Badge variant={statusCfg.variant} className="text-[10px] h-4 px-1.5">
                  {statusCfg.label}
                </Badge>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded-lg p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {challenge.current_days} / {challenge.target_days} days
              </span>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={challenge.current_days} max={challenge.target_days} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Started{' '}
              {new Date(challenge.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {isActive ? (
              <span className="text-noor-500 font-medium">+{coinsPerDay} 🪙 / day</span>
            ) : isCompleted ? (
              <span className="text-accent-500 font-medium">Complete! 🏆</span>
            ) : challenge.category && !challenge.category.includes('|') ? (
              <span className="capitalize">{challenge.category}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Section group helper ─────────────────────────────────────────────────────

function ChallengeGroup({
  label,
  challenges,
  selectedId,
  onSelect,
  onDelete,
}: {
  label: string
  challenges: Challenge[]
  selectedId: string | null
  onSelect: (c: Challenge) => void
  onDelete: (id: string) => void
}) {
  if (challenges.length === 0) return null
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
        {label} ({challenges.length})
      </p>
      <AnimatePresence>
        <div className="grid sm:grid-cols-2 gap-3">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              selected={selectedId === c.id}
              onClick={() => onSelect(c)}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function ChallengesView() {
  const { data: challenges, isLoading } = useChallenges()
  const increment = useIncrementChallenge()
  const deleteChallenge = useDeleteChallenge()

  // Dialog state — lifted so template showcase can open it pre-filled
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogInitialTemplate, setDialogInitialTemplate] = useState<
    ChallengeTemplate | null | undefined
  >(undefined)

  // Selected challenge for detail panel
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [showMobileDetail, setShowMobileDetail] = useState(false)

  const active = challenges?.filter((c) => c.status === 'active') ?? []
  const completed = challenges?.filter((c) => c.status === 'completed') ?? []
  const others = challenges?.filter((c) => c.status !== 'active' && c.status !== 'completed') ?? []

  const openDialogFresh = () => {
    setDialogInitialTemplate(undefined)
    setDialogOpen(true)
  }

  const openDialogWithTemplate = (t: ChallengeTemplate) => {
    setDialogInitialTemplate(t)
    setDialogOpen(true)
  }

  const handleSelectChallenge = (c: Challenge) => {
    if (selectedChallenge?.id === c.id) {
      setSelectedChallenge(null)
      setShowMobileDetail(false)
    } else {
      setSelectedChallenge(c)
      setShowMobileDetail(true)
    }
  }

  // Keep selected challenge in sync after mutations
  useEffect(() => {
    if (!selectedChallenge || !challenges) return
    const updated = challenges.find((c) => c.id === selectedChallenge.id)
    if (updated) setSelectedChallenge(updated)
    else setSelectedChallenge(null)
  }, [challenges]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleIncrement = (c: Challenge) => {
    increment.mutate({
      id: c.id,
      currentDays: c.current_days,
      targetDays: c.target_days,
      category: c.category,
    })
  }

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Challenges</h1>
            <p className="text-sm text-muted-foreground">
              {active.length > 0
                ? `${active.length} active · ${completed.length} completed`
                : 'Build habits, earn massive rewards'}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openDialogFresh}>
            <Plus className="h-4 w-4" />
            New challenge
          </Button>
        </div>

        {/* Template showcase — always visible */}
        <TemplateShowcase onStartTemplate={openDialogWithTemplate} />

        {/* My challenges + detail panel (2-col on desktop) */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : !challenges || challenges.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/20 mb-3" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">No challenges started yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Pick a template above and start earning massive coin rewards.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              'gap-6',
              selectedChallenge ? 'grid grid-cols-1 lg:grid-cols-[1fr_300px]' : 'flex flex-col',
            )}
          >
            {/* Left — challenge list */}
            <div className="space-y-6 min-w-0">
              {(active.length > 0 || completed.length > 0 || others.length > 0) && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                  My Challenges
                </p>
              )}
              <ChallengeGroup
                label="Active"
                challenges={active}
                selectedId={selectedChallenge?.id ?? null}
                onSelect={handleSelectChallenge}
                onDelete={(id) => {
                  deleteChallenge.mutate(id)
                  if (selectedChallenge?.id === id) setSelectedChallenge(null)
                }}
              />
              <ChallengeGroup
                label="Completed"
                challenges={completed}
                selectedId={selectedChallenge?.id ?? null}
                onSelect={handleSelectChallenge}
                onDelete={(id) => {
                  deleteChallenge.mutate(id)
                  if (selectedChallenge?.id === id) setSelectedChallenge(null)
                }}
              />
              <ChallengeGroup
                label="Other"
                challenges={others}
                selectedId={selectedChallenge?.id ?? null}
                onSelect={handleSelectChallenge}
                onDelete={(id) => {
                  deleteChallenge.mutate(id)
                  if (selectedChallenge?.id === id) setSelectedChallenge(null)
                }}
              />
            </div>

            {/* Right — desktop detail panel */}
            <AnimatePresence>
              {selectedChallenge && (
                <motion.div
                  key={selectedChallenge.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  className="hidden lg:block sticky top-4 self-start max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl"
                >
                  <ChallengeDetailPanel
                    challenge={selectedChallenge}
                    onClose={() => setSelectedChallenge(null)}
                    onIncrement={() => handleIncrement(selectedChallenge)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* New challenge dialog */}
      <NewChallengeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialTemplate={dialogInitialTemplate}
        onAdded={() => {}}
      />

      {/* Mobile — detail panel as dialog */}
      <Dialog
        open={showMobileDetail && !!selectedChallenge}
        onOpenChange={(v) => {
          if (!v) setShowMobileDetail(false)
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto max-w-sm lg:hidden p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {selectedChallenge?.title ?? 'Challenge detail'}
          </DialogTitle>
          {selectedChallenge && (
            <ChallengeDetailPanel
              challenge={selectedChallenge}
              onClose={() => setShowMobileDetail(false)}
              onIncrement={() => handleIncrement(selectedChallenge)}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
