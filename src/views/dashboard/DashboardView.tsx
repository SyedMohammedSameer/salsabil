import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  CheckSquare,
  BookOpen,
  Timer,
  HandMetal,
  Plus,
  ArrowRight,
  Star,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageShell } from '@/components/shared/PageShell'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PRAYER_META, type PrayerName } from '@/types'

// Static prayer list order for display
const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

// Arabic greetings by time of day
function getGreeting(hour: number) {
  if (hour < 6) return { ar: 'بِسْمِ اللهِ', en: 'Bismillah — start your day' }
  if (hour < 12) return { ar: 'صَبَاحُ الْخَيْرِ', en: 'Good morning' }
  if (hour < 17) return { ar: 'مَرْحَبًا', en: 'Good afternoon' }
  if (hour < 20) return { ar: 'مَسَاءُ الْخَيْرِ', en: 'Good evening' }
  return { ar: 'لَيْلَةً مُبَارَكَةً', en: 'Blessed night' }
}

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  },
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
  { label: 'Add task', icon: Plus, path: '/tasks', color: 'text-noor-600 dark:text-noor-400' },
  {
    label: 'Log prayer',
    icon: HandMetal,
    path: '/prayers',
    color: 'text-accent-600 dark:text-accent-400',
  },
  { label: 'Quran', icon: BookOpen, path: '/quran', color: 'text-gold-500 dark:text-gold-400' },
  { label: 'Focus', icon: Timer, path: '/focus', color: 'text-warn-600 dark:text-warn-400' },
]

export default function DashboardView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = useMemo(() => getGreeting(hour), [hour])

  const displayName =
    user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Friend'

  return (
    <PageShell maxWidth="4xl">
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ─── Header ────────────────────────────────────────────────────────── */}
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

        {/* ─── Stats ─────────────────────────────────────────────────────────── */}
        <motion.div variants={stagger.item}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Day streak"
              value="0"
              icon={Flame}
              iconColor="text-warn-500"
              iconBg="bg-warn-500/10"
            />
            <StatCard
              label="Tasks done"
              value="0"
              icon={CheckSquare}
              iconColor="text-accent-600 dark:text-accent-400"
              iconBg="bg-accent-500/10"
            />
            <StatCard
              label="Quran pages"
              value="0"
              icon={BookOpen}
              iconColor="text-gold-500"
              iconBg="bg-gold-500/10"
            />
            <StatCard
              label="Focus mins"
              value="0"
              icon={Timer}
              iconColor="text-noor-600 dark:text-noor-400"
              iconBg="bg-noor-500/10"
            />
          </div>
        </motion.div>

        {/* ─── Main grid ─────────────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Prayer tracker — takes 2 cols on large */}
          <motion.div variants={stagger.item} className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Today&apos;s Prayers</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-muted-foreground"
                    onClick={() => navigate('/prayers')}
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PRAYER_ORDER.map((name) => {
                    const meta = PRAYER_META[name]
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <HandMetal className="h-4 w-4 text-noor-500" strokeWidth={1.75} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{meta.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          —
                        </Badge>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Daily progress</span>
                    <span>0 / 5</span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick actions */}
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

            {/* Noor suggestion placeholder */}
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

        {/* ─── Today's tasks ──────────────────────────────────────────────────── */}
        <motion.div variants={stagger.item}>
          <SectionHeader
            title="Today's Tasks"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            }
          />
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <CheckSquare
              className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40"
              strokeWidth={1.5}
            />
            <p className="text-sm text-muted-foreground">No tasks yet — add your first one</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/tasks')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add task
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </PageShell>
  )
}
