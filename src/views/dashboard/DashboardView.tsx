import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  CheckSquare,
  BookOpen,
  ArrowRight,
  Star,
  CheckCircle2,
  Plus,
  Dumbbell,
  Target,
  TreePine,
  Moon,
  Timer,
  Circle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useChallenges } from '@/hooks/useChallenges'
import { useAdhkarLogs } from '@/hooks/useAdhkar'
import { useGardenTrees } from '@/hooks/useGarden'
import { useAllTasks, useCompleteTask } from '@/hooks/useTasks'
import { SPECIES_INFO } from '@/lib/api/garden'
import { PageShell } from '@/components/shared/PageShell'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getDailyQuote } from '@/data/quotes'
import { cn } from '@/lib/cn'

import { localDateString, daysAgo } from '@/lib/dates'
const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-destructive',
  high: 'bg-warn-500',
  medium: 'bg-noor-500',
  low: 'bg-muted-foreground/40',
}

function getGreeting(hour: number) {
  if (hour < 6) return { ar: 'بِسْمِ اللهِ', en: 'Bismillah — start your day' }
  if (hour < 12) return { ar: 'صَبَاحُ الْخَيْرِ', en: 'Good morning' }
  if (hour < 17) return { ar: 'مَرْحَبًا', en: 'Good afternoon' }
  if (hour < 20) return { ar: 'مَسَاءُ الْخَيْرِ', en: 'Good evening' }
  return { ar: 'لَيْلَةً مُبَارَكَةً', en: 'Blessed night' }
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  },
} as const

interface QuickAction {
  label: string
  icon: typeof Plus
  path: string
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Workouts', icon: Dumbbell, path: '/workouts', color: 'text-rose-500' },
  { label: 'Challenges', icon: Target, path: '/challenges', color: 'text-violet-500' },
  { label: 'Adhkar', icon: Moon, path: '/adhkar', color: 'text-indigo-500' },
  { label: 'Quran', icon: BookOpen, path: '/quran', color: 'text-gold-500 dark:text-gold-400' },
]

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}

export default function DashboardView() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = useMemo(() => getGreeting(hour), [hour])
  const today = useMemo(() => localDateString(), [])
  const quote = useMemo(() => getDailyQuote(), [])
  const weekAgo = useMemo(() => localDateString(daysAgo(7)), [])

  const { data: stats, isLoading: statsLoading } = useDashboardStats(today)
  const { data: workouts } = useWorkouts()
  const { data: challenges } = useChallenges()
  const { data: adhkarLogs } = useAdhkarLogs(today)
  const { data: trees } = useGardenTrees()
  const { data: allTasks, isLoading: tasksLoading } = useAllTasks()
  const completeTask = useCompleteTask()

  const todayTasks = useMemo(
    () => (allTasks ?? []).filter((t) => t.due_date === today),
    [allTasks, today],
  )
  const todayPending = todayTasks.filter((t) => !t.completed)
  const todayDone = todayTasks.filter((t) => t.completed)

  const workoutsThisWeek = useMemo(
    () => workouts?.filter((w) => w.date >= weekAgo).length ?? 0,
    [workouts, weekAgo],
  )
  const activeChallenges = useMemo(
    () => challenges?.filter((c) => c.status === 'active') ?? [],
    [challenges],
  )
  const adhkarDone = adhkarLogs?.filter((a) => a.completed).length ?? 0
  const treesPlanted = trees?.length ?? 0

  const displayName =
    profile?.username ??
    user?.user_metadata?.full_name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'Friend'

  return (
    <PageShell maxWidth="full">
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ─── Header ──────────────────────────────────────────────────────────── */}
        <motion.div variants={stagger.item} className="space-y-1">
          <p className="font-arabic text-xl text-noor-600 dark:text-noor-400">{greeting.ar}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting.en}, {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </motion.div>

        {/* ─── Daily quote ─────────────────────────────────────────────────────── */}
        <motion.div variants={stagger.item}>
          <Card variant="glass-noor" className="overflow-hidden">
            <CardContent className="p-4">
              <p className="font-arabic text-lg leading-relaxed text-noor-700 dark:text-noor-300 text-right">
                {quote.arabic}
              </p>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{quote.translation}</p>
              <p className="mt-1 text-xs text-muted-foreground">{quote.source}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Stats row 1: spiritual + productivity ───────────────────────────── */}
        <motion.div variants={stagger.item}>
          {statsLoading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Day streak"
                value={String(stats?.streak ?? 0)}
                icon={Flame}
                iconColor="text-warn-500"
                iconBg="bg-warn-500/10"
              />
              <StatCard
                label="Tasks done"
                value={String(stats?.tasks.completed ?? 0)}
                icon={CheckSquare}
                iconColor="text-accent-600 dark:text-accent-400"
                iconBg="bg-accent-500/10"
              />
              <StatCard
                label="Quran pages"
                value={String(stats?.quranPages ?? 0)}
                icon={BookOpen}
                iconColor="text-gold-500"
                iconBg="bg-gold-500/10"
              />
              <StatCard
                label="Focus mins"
                value={String(stats?.focusMinutes ?? 0)}
                icon={Timer}
                iconColor="text-noor-600 dark:text-noor-400"
                iconBg="bg-noor-500/10"
              />
            </div>
          )}
        </motion.div>

        {/* ─── Stats row 2: body + garden ──────────────────────────────────────── */}
        <motion.div variants={stagger.item}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Workouts (week)"
              value={String(workoutsThisWeek)}
              icon={Dumbbell}
              iconColor="text-rose-500"
              iconBg="bg-rose-500/10"
            />
            <StatCard
              label="Challenges"
              value={String(activeChallenges.length)}
              icon={Target}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/10"
            />
            <StatCard
              label="Adhkar today"
              value={`${adhkarDone}/3`}
              icon={Moon}
              iconColor="text-indigo-500"
              iconBg="bg-indigo-500/10"
            />
            <StatCard
              label="Trees planted"
              value={String(treesPlanted)}
              icon={TreePine}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-500/10"
            />
          </div>
        </motion.div>

        {/* ─── Garden + Quick actions ───────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Garden widget */}
          <motion.div variants={stagger.item} className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">My Garden</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-muted-foreground"
                    onClick={() => navigate('/garden')}
                  >
                    Visit <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {treesPlanted === 0 ? (
                  <div className="py-10 text-center">
                    <TreePine
                      className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30"
                      strokeWidth={1.25}
                    />
                    <p className="text-sm text-muted-foreground">
                      No trees yet — complete a focus session to plant your first
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate('/focus')}
                    >
                      Start focusing
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {trees?.slice(0, 9).map((tree) => (
                        <div
                          key={tree.id}
                          className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl border border-border p-2"
                        >
                          <span className="text-2xl leading-none">
                            {SPECIES_INFO[tree.species].emoji}
                          </span>
                          <span className="text-[10px] capitalize text-muted-foreground">
                            {tree.stage}
                          </span>
                        </div>
                      ))}
                      {treesPlanted > 9 && (
                        <div className="flex min-w-[56px] items-center justify-center rounded-xl border border-dashed border-border p-2">
                          <span className="text-xs text-muted-foreground">+{treesPlanted - 9}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {treesPlanted} tree{treesPlanted !== 1 ? 's' : ''} in your garden •{' '}
                      <button
                        onClick={() => navigate('/garden')}
                        className="text-noor-600 hover:underline dark:text-noor-400"
                      >
                        Plant more
                      </button>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick actions + Noor shortcut */}
          <motion.div variants={stagger.item} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(({ label, icon: Icon, path, color }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border p-3 text-center transition-all hover:bg-muted/50 hover:border-border/80 active:scale-[0.97]"
                  >
                    <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card variant="glass-noor" className="cursor-pointer" onClick={() => navigate('/ai')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-noor-500 to-noor-600 shadow-sm">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-noor-700 dark:text-noor-300">Noor AI</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Ask me anything about your day, Quran, or productivity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── Today's tasks ────────────────────────────────────────────────────── */}
        <motion.div variants={stagger.item}>
          <SectionHeader
            title="Today's Tasks"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          />
          <div className="mt-3">
            {tasksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-10 text-center">
                <CheckSquare
                  className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">No tasks for today</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/tasks')}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add task
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden">
                {todayPending.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <button
                      onClick={() => completeTask.mutate({ id: task.id, completed: true })}
                      className="shrink-0 text-muted-foreground/40 hover:text-accent-500 transition-colors"
                    >
                      <Circle className="h-4 w-4" />
                    </button>
                    <div
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        PRIORITY_DOT[task.priority ?? 'medium'],
                      )}
                    />
                    <p className="text-sm text-foreground flex-1 min-w-0 truncate">{task.title}</p>
                  </div>
                ))}
                {todayPending.length > 5 && (
                  <button
                    onClick={() => navigate('/tasks')}
                    className="w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground border-t border-border text-left transition-colors"
                  >
                    +{todayPending.length - 5} more — view all
                  </button>
                )}
                {todayDone.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-500" />
                    <span className="text-xs text-muted-foreground">
                      {todayDone.length} completed today
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── Active challenges ────────────────────────────────────────────────── */}
        {activeChallenges.length > 0 && (
          <motion.div variants={stagger.item}>
            <SectionHeader
              title="Active Challenges"
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate('/challenges')}>
                  View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              }
            />
            <div className="mt-3 space-y-2">
              {activeChallenges.slice(0, 3).map((challenge) => {
                const pct = Math.min(
                  100,
                  Math.round((challenge.current_days / challenge.target_days) * 100),
                )
                return (
                  <div
                    key={challenge.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <Target className="h-4 w-4 shrink-0 text-violet-500" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {challenge.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {challenge.current_days}/{challenge.target_days}d
                        </span>
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </PageShell>
  )
}
