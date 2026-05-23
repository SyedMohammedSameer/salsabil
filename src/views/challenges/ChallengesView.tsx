import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

// ─── Shared constants ─────────────────────────────────────────────────────────

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

// ─── Step 1 — Template Picker ─────────────────────────────────────────────────

function TemplatePicker({ onSelect }: { onSelect: (template: ChallengeTemplate | null) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          Pick a template or build your own from scratch
        </p>
      </div>

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
            <span
              className={cn(
                'inline-block mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                template.bgClass,
                template.colorClass,
              )}
            >
              {template.category}
            </span>
          </button>
        ))}

        {/* Custom option */}
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

// ─── Difficulty card (used in Step 2) ────────────────────────────────────────

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

// ─── Step 2a — Configure template challenge ───────────────────────────────────

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
  const [showAllTasks, setShowAllTasks] = useState(false)

  const level = template.levels[difficulty]

  // Reset days when difficulty changes
  useEffect(() => {
    setSelectedDays(level.defaultDays)
    setUseCustomDays(false)
    setCustomDaysRaw('')
  }, [difficulty, level.defaultDays])

  const effectiveDays = useCustomDays
    ? Math.max(1, Math.min(365, Number(customDaysRaw) || level.defaultDays))
    : selectedDays

  const totalCoins = level.coinsPerDay * effectiveDays + level.completionBonus
  const visibleTasks = showAllTasks ? level.tasks : level.tasks.slice(0, 3)

  const handleCreate = () => {
    if (!title.trim() || effectiveDays < 1) return
    onSubmit({
      title: title.trim(),
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

      {/* Tasks preview */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Daily tasks ({level.tasks.length})</Label>
        <div className="space-y-1.5">
          {visibleTasks.map((task, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground">
              <div className="h-4 w-4 rounded border border-muted-foreground/30 shrink-0 mt-0.5 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              </div>
              <span className="leading-snug">{task}</span>
            </div>
          ))}
        </div>
        {level.tasks.length > 3 && (
          <button
            onClick={() => setShowAllTasks((p) => !p)}
            className="text-[11px] text-noor-500 hover:underline flex items-center gap-0.5"
          >
            {showAllTasks ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> +{level.tasks.length - 3} more tasks
              </>
            )}
          </button>
        )}
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
      <div className="rounded-xl bg-gradient-to-br from-noor-500/10 via-accent-500/5 to-transparent border border-noor-500/20 p-3 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-noor-500" />
          <p className="text-xs text-muted-foreground">Total reward</p>
        </div>
        <p className="text-xl font-bold text-foreground tracking-tight">
          🪙 {totalCoins.toLocaleString()} coins
        </p>
        <p className="text-[11px] text-muted-foreground">
          {level.coinsPerDay} × {effectiveDays} days + {level.completionBonus.toLocaleString()}{' '}
          completion bonus
        </p>
      </div>

      <Button
        onClick={handleCreate}
        className="w-full gap-1.5"
        disabled={isLoading || !title.trim() || effectiveDays < 1}
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

// ─── Step 2b — Custom challenge form ─────────────────────────────────────────

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
  const { coinsPerDay, completionBonus } = getChallengeRewards(null)
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

      {/* Reward preview */}
      <div className="rounded-xl bg-gradient-to-br from-noor-500/10 via-accent-500/5 to-transparent border border-noor-500/20 p-3 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-noor-500" />
          <p className="text-xs text-muted-foreground">Total reward</p>
        </div>
        <p className="text-xl font-bold text-foreground">🪙 {totalCoins.toLocaleString()} coins</p>
        <p className="text-[11px] text-muted-foreground">
          {coinsPerDay} × {Number(targetDays) || 0} days + {completionBonus} completion bonus
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

// ─── Combined new-challenge dialog ────────────────────────────────────────────

type DialogStep = 'pick' | 'configure-template' | 'configure-custom'

function NewChallengeDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<DialogStep>('pick')
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null)
  const create = useCreateChallenge()

  const resetDialog = () => {
    setStep('pick')
    setSelectedTemplate(null)
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) resetDialog()
  }

  const handleTemplateSelect = (template: ChallengeTemplate | null) => {
    if (template) {
      setSelectedTemplate(template)
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
    setOpen(false)
    resetDialog()
    onAdded()
  }

  const dialogTitle =
    step === 'pick'
      ? 'New Challenge'
      : step === 'configure-template' && selectedTemplate
        ? `${selectedTemplate.emoji} ${selectedTemplate.name}`
        : 'Custom Challenge'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New challenge
        </Button>
      </DialogTrigger>

      <DialogContent
        className={cn('max-h-[88vh] overflow-y-auto', step === 'pick' ? 'max-w-md' : 'max-w-sm')}
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

// ─── Progress bar ─────────────────────────────────────────────────────────────

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

// ─── Challenge card ───────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onIncrement,
  onDelete,
}: {
  challenge: Challenge
  onIncrement: () => void
  onDelete: () => void
}) {
  const [tasksExpanded, setTasksExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[challenge.status]
  const isActive = challenge.status === 'active'
  const isCompleted = challenge.status === 'completed'
  const pct = Math.round((challenge.current_days / challenge.target_days) * 100)

  // Decode template + difficulty from category
  const { template, level, difficulty } = parseChallengeCategory(challenge.category)
  const diffMeta = difficulty ? DIFFICULTY_META[difficulty] : null
  const { coinsPerDay, completionBonus } = getChallengeRewards(challenge.category)

  const remainingDays = challenge.target_days - challenge.current_days
  const projectedCoins = coinsPerDay * remainingDays + (isActive ? completionBonus : 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <Card className={cn(isCompleted && 'border-accent-500/30 bg-accent-500/5')}>
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

              {/* Difficulty + category badges */}
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
                {challenge.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {challenge.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={statusCfg.variant} className="text-[10px] h-4 px-1.5">
                {statusCfg.label}
              </Badge>
              <button
                onClick={onDelete}
                className="rounded-lg p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
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

          {/* Tasks expandable list (template challenges only) */}
          {level && level.tasks.length > 0 && (
            <div className="space-y-1.5">
              <button
                onClick={() => setTasksExpanded((p) => !p)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {tasksExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {tasksExpanded ? 'Hide' : 'Show'} {level.tasks.length} daily tasks
              </button>

              <AnimatePresence>
                {tasksExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pt-0.5">
                      {level.tasks.map((task, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[11px] text-muted-foreground"
                        >
                          <div className="h-3.5 w-3.5 rounded border border-muted-foreground/30 shrink-0 mt-0.5 flex items-center justify-center">
                            <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          </div>
                          <span className="leading-snug">{task}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mark done button */}
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={onIncrement}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark today as done (+{coinsPerDay} 🪙)
            </Button>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Started{' '}
              {new Date(challenge.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>

            {isActive && remainingDays > 0 ? (
              <span className="text-noor-500 font-medium">
                🪙 {projectedCoins.toLocaleString()} left to earn
              </span>
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

// ─── Main view ────────────────────────────────────────────────────────────────

export default function ChallengesView() {
  const { data: challenges, isLoading } = useChallenges()
  const increment = useIncrementChallenge()
  const deleteChallenge = useDeleteChallenge()

  const active = challenges?.filter((c) => c.status === 'active') ?? []
  const completed = challenges?.filter((c) => c.status === 'completed') ?? []
  const others = challenges?.filter((c) => c.status !== 'active' && c.status !== 'completed') ?? []

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Challenges</h1>
            <p className="text-sm text-muted-foreground">
              {active.length > 0
                ? `${active.length} active · ${completed.length} completed`
                : 'Start a challenge to build lasting habits'}
            </p>
          </div>
          <NewChallengeDialog onAdded={() => {}} />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : !challenges || challenges.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Trophy className="h-14 w-14 text-muted-foreground/20 mb-3" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">No challenges yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Pick a challenge template and start earning massive coin rewards.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active */}
            {active.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Active ({active.length})
                </p>
                <AnimatePresence>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {active.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={() =>
                          increment.mutate({
                            id: c.id,
                            currentDays: c.current_days,
                            targetDays: c.target_days,
                            category: c.category,
                          })
                        }
                        onDelete={() => deleteChallenge.mutate(c.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Completed ({completed.length})
                </p>
                <AnimatePresence>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {completed.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={() => {}}
                        onDelete={() => deleteChallenge.mutate(c.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}

            {/* Others (paused / failed) */}
            {others.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Other ({others.length})
                </p>
                <AnimatePresence>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {others.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={() => {}}
                        onDelete={() => deleteChallenge.mutate(c.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </PageShell>
  )
}
