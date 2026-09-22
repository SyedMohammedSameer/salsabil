import { useMemo } from 'react'
import { View, Text, Pressable, RefreshControl, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import Svg, { Circle } from 'react-native-svg'
import {
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Circle as CircleIcon,
  Coins,
  Dumbbell,
  Flame,
  Moon,
  Plus,
  Sparkles,
  Target,
  Timer,
  TreePine,
} from 'lucide-react-native'
import {
  Arabic,
  Button,
  Card,
  FadeIn,
  Gradient,
  HERO_GRADIENT,
  IconBadge,
  Muted,
  NOOR_GRADIENT,
  PressableScale,
  Progress,
  SectionHeader,
  Skeleton,
} from '~/components/ui'
import { SvgTree } from '~/components/garden/SvgTree'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useChallenges } from '@/hooks/useChallenges'
import { useAdhkarLogs } from '@/hooks/useAdhkar'
import { useGardenTrees } from '@/hooks/useGarden'
import { useAllTasks, useCompleteTask } from '@/hooks/useTasks'
import { getDailyQuote } from '@/data/quotes'
import { localDateString, daysAgo } from '@/lib/dates'
import { cn } from '@/lib/cn'

// The native dashboard. Same sections, same order and same data hooks as
// src/views/dashboard/DashboardView.tsx, laid out for one hand on a phone:
//
//   greeting → hero (coins, streak, today's prayers) → daily ayah →
//   stats grid → garden → quick actions → Noor → today's tasks → challenges
//
// Everything a number here is the shared React Query cache; nothing is
// computed twice or differently from the web.

// ─── Greeting ────────────────────────────────────────────────────────────────

function getGreeting(hour: number) {
  if (hour < 6) return { ar: 'بِسْمِ اللهِ', en: 'Bismillah — start your day' }
  if (hour < 12) return { ar: 'صَبَاحُ الْخَيْرِ', en: 'Good morning' }
  if (hour < 17) return { ar: 'مَرْحَبًا', en: 'Good afternoon' }
  if (hour < 20) return { ar: 'مَسَاءُ الْخَيْرِ', en: 'Good evening' }
  return { ar: 'لَيْلَةً مُبَارَكَةً', en: 'Blessed night' }
}

/** "Monday, 22 September · 10 Rabi' II 1448" — Hijri part only where ICU has it. */
function formatToday(date: Date): string {
  const gregorian = date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    // An ICU build without the Islamic calendar silently falls back to
    // Gregorian, which would print the same date twice.
    if (!fmt.resolvedOptions().calendar.startsWith('islamic')) return gregorian
    return `${gregorian}  ·  ${fmt.format(date).replace(/\s*AH$/, '')}`
  } catch {
    return gregorian
  }
}

// ─── Colour ──────────────────────────────────────────────────────────────────
// Lucide icons take a literal colour, so each tint carries its own dark-mode
// value rather than a class. Tints mirror the web StatCard palette.

type Tint = { icon: string; iconDark: string; bg: string }

const TINT = {
  warn: { icon: '#f59e0b', iconDark: '#fbbf24', bg: 'bg-warn-500/10' },
  accent: { icon: '#059669', iconDark: '#34d399', bg: 'bg-accentGreen-500/10' },
  gold: { icon: '#d97706', iconDark: '#fbbf24', bg: 'bg-gold-500/10' },
  noor: { icon: '#0d9488', iconDark: '#2dd4bf', bg: 'bg-noor-500/10' },
  rose: { icon: '#f43f5e', iconDark: '#fb7185', bg: 'bg-rose-500/10' },
  violet: { icon: '#8b5cf6', iconDark: '#a78bfa', bg: 'bg-violet-500/10' },
  indigo: { icon: '#6366f1', iconDark: '#818cf8', bg: 'bg-indigo-500/10' },
  emerald: { icon: '#059669', iconDark: '#34d399', bg: 'bg-emerald-500/10' },
} satisfies Record<string, Tint>

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-destructive',
  high: 'bg-warn-500',
  medium: 'bg-noor-500',
  low: 'bg-muted-foreground/40',
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function PrayerRing({ prayed, total }: { prayed: number; total: number }) {
  const size = 72
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, prayed / total) : 0
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#ffffff" strokeOpacity={0.2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text className="text-lg font-bold text-white">
        {prayed}
        <Text className="text-xs font-medium text-white/70">/{total}</Text>
      </Text>
    </View>
  )
}

function HeroPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
      {icon}
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </View>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  tint,
  dark,
}: {
  label: string
  value: string
  icon: typeof Flame
  tint: Tint
  dark: boolean
}) {
  return (
    <Card className="flex-1 flex-row items-start justify-between gap-3 p-4">
      <View className="min-w-0 flex-1">
        <Muted className="text-xs">{label}</Muted>
        <Text className="mt-1 text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <IconBadge className={tint.bg}>
        <Icon size={20} strokeWidth={1.75} color={dark ? tint.iconDark : tint.icon} />
      </IconBadge>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <View className="gap-3">
      {[0, 1].map((row) => (
        <View key={row} className="flex-row gap-3">
          <Skeleton className="h-[88px]" style={{ flex: 1 }} />
          <Skeleton className="h-[88px]" style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { user } = useAuth()
  const { data: profile } = useProfile()

  const now = useMemo(() => new Date(), [])
  const greeting = useMemo(() => getGreeting(now.getHours()), [now])
  const dateLine = useMemo(() => formatToday(now), [now])
  const today = useMemo(() => localDateString(now), [now])
  const weekAgo = useMemo(() => localDateString(daysAgo(7)), [])
  const quote = useMemo(() => getDailyQuote(), [])

  const { data: stats, isLoading: statsLoading, isRefetching, refetch } = useDashboardStats(today)
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
    profile?.display_name ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'Friend'

  const coins = stats?.coins ?? profile?.coins ?? 0
  const streak = stats?.streak ?? profile?.streak ?? 0
  const prayed = stats?.prayers?.prayed ?? 0
  const prayerTotal = stats?.prayers?.total ?? 5

  const quickActions = [
    { label: 'Workouts', icon: Dumbbell, path: '/workouts', tint: TINT.rose },
    { label: 'Challenges', icon: Target, path: '/challenges', tint: TINT.violet },
    { label: 'Adhkar', icon: Moon, path: '/adhkar', tint: TINT.indigo },
    { label: 'Quran', icon: BookOpen, path: '/quran', tint: TINT.gold },
  ] as const

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#14b8a6"
            colors={['#14b8a6']}
          />
        }
      >
        {/* ─── Greeting ─────────────────────────────────────────────────────── */}
        <FadeIn index={0}>
          <View className="flex-row items-end justify-between gap-3 pt-2">
            <View className="flex-1 gap-0.5">
              <Text className="text-xl text-noor-600 dark:text-noor-400" style={{ writingDirection: 'rtl', textAlign: 'left' }}>
                {greeting.ar}
              </Text>
              <Text className="text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
                {greeting.en}, {displayName}
              </Text>
              <Muted className="text-xs">{dateLine}</Muted>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={() => router.push('/profile')}
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
            >
              <Text className="text-base font-bold text-noor-600 dark:text-noor-400">
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </FadeIn>

        {/* ─── Hero: the progress that matters ──────────────────────────────── */}
        <FadeIn index={1}>
          <PressableScale onPress={() => router.push('/garden')} accessibilityLabel="Open your garden">
            <Gradient colors={HERO_GRADIENT} radius={24} orbs style={{ ...shadowLg }}>
              <View className="gap-4 p-5">
                <View className="flex-row items-center justify-between">
                  <View className="gap-1">
                    <View className="flex-row items-center gap-1.5">
                      <Coins size={14} color="#fde68a" />
                      <Text className="text-xs font-semibold uppercase tracking-wider text-white/80">
                        Coins
                      </Text>
                    </View>
                    <Text className="text-4xl font-bold tracking-tight text-white">
                      {statsLoading && !profile ? '—' : coins.toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-center gap-1">
                    <PrayerRing prayed={prayed} total={prayerTotal} />
                    <Text className="text-[11px] font-medium text-white/80">prayers today</Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <HeroPill icon={<Flame size={13} color="#fdba74" />} label={`${streak} day streak`} />
                  <HeroPill icon={<Timer size={13} color="#99f6e4" />} label={`${stats?.focusMinutes ?? 0} min focused`} />
                  <HeroPill icon={<TreePine size={13} color="#bbf7d0" />} label={`${treesPlanted} ${treesPlanted === 1 ? 'tree' : 'trees'}`} />
                </View>
              </View>
            </Gradient>
          </PressableScale>
        </FadeIn>

        {/* ─── Daily ayah ───────────────────────────────────────────────────── */}
        <FadeIn index={2}>
          <Card variant="glass-noor" className="gap-2 p-5">
            <Arabic>{quote.arabic}</Arabic>
            <Text className="text-sm leading-6 text-foreground/80">{quote.translation}</Text>
            <Muted className="text-xs">{quote.source}</Muted>
          </Card>
        </FadeIn>

        {/* ─── Stats ────────────────────────────────────────────────────────── */}
        <FadeIn index={3}>
          {statsLoading ? (
            <StatsSkeleton />
          ) : (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatTile label="Day streak" value={String(streak)} icon={Flame} tint={TINT.warn} dark={dark} />
                <StatTile label="Tasks done" value={String(stats?.tasks?.completed ?? 0)} icon={CheckSquare} tint={TINT.accent} dark={dark} />
              </View>
              <View className="flex-row gap-3">
                <StatTile label="Quran pages" value={String(stats?.quranPages ?? 0)} icon={BookOpen} tint={TINT.gold} dark={dark} />
                <StatTile label="Focus mins" value={String(stats?.focusMinutes ?? 0)} icon={Timer} tint={TINT.noor} dark={dark} />
              </View>
              <View className="flex-row gap-3">
                <StatTile label="Workouts (week)" value={String(workoutsThisWeek)} icon={Dumbbell} tint={TINT.rose} dark={dark} />
                <StatTile label="Challenges" value={String(activeChallenges.length)} icon={Target} tint={TINT.violet} dark={dark} />
              </View>
              <View className="flex-row gap-3">
                <StatTile label="Adhkar today" value={`${adhkarDone}/3`} icon={Moon} tint={TINT.indigo} dark={dark} />
                <StatTile label="Trees planted" value={String(treesPlanted)} icon={TreePine} tint={TINT.emerald} dark={dark} />
              </View>
            </View>
          )}
        </FadeIn>

        {/* ─── Garden ───────────────────────────────────────────────────────── */}
        <FadeIn index={4}>
          <Card className="gap-3 p-0">
            <View className="px-4 pt-4">
              <SectionHeader title="My Garden" action="Visit" onAction={() => router.push('/garden')} />
            </View>
            {treesPlanted === 0 ? (
              <View className="items-center gap-2 px-4 pb-5 pt-2">
                <TreePine size={36} strokeWidth={1.25} color={dark ? '#3f4f4a' : '#c4cfcc'} />
                <Muted className="text-center">
                  No trees yet — complete a focus session to plant your first
                </Muted>
                <Button variant="outline" size="sm" onPress={() => router.push('/focus')}>
                  Start focusing
                </Button>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                >
                  {trees!.slice(0, 9).map((tree) => (
                    <View
                      key={tree.id}
                      className="items-center gap-1 rounded-xl border border-border bg-muted/30 px-2 pb-2 pt-1"
                      style={{ minWidth: 72 }}
                    >
                      <SvgTree species={tree.species} stage={tree.stage} seed={tree.id} size={56} />
                      <Text className="text-[10px] capitalize text-muted-foreground">{tree.stage}</Text>
                    </View>
                  ))}
                  {treesPlanted > 9 ? (
                    <Pressable
                      onPress={() => router.push('/garden')}
                      className="items-center justify-center rounded-xl border border-dashed border-border px-3"
                      style={{ minWidth: 72 }}
                    >
                      <Muted className="text-xs">+{treesPlanted - 9}</Muted>
                    </Pressable>
                  ) : null}
                </ScrollView>
                <View className="px-4 pb-4">
                  <Muted className="text-xs">
                    {treesPlanted} tree{treesPlanted !== 1 ? 's' : ''} in your garden ·{' '}
                    <Text className="text-noor-600 dark:text-noor-400" onPress={() => router.push('/garden')}>
                      Plant more
                    </Text>
                  </Muted>
                </View>
              </>
            )}
          </Card>
        </FadeIn>

        {/* ─── Quick actions ────────────────────────────────────────────────── */}
        <FadeIn index={5}>
          <View className="gap-3">
            <SectionHeader title="Quick Actions" />
            <View className="flex-row gap-3">
              {quickActions.map(({ label, icon: Icon, path, tint }) => (
                <PressableScale
                  key={path}
                  onPress={() => router.push(path)}
                  style={{ flex: 1 }}
                  className="items-center gap-2 rounded-2xl border border-border bg-card py-4"
                >
                  <IconBadge className={tint.bg} size={44}>
                    <Icon size={22} strokeWidth={1.75} color={dark ? tint.iconDark : tint.icon} />
                  </IconBadge>
                  <Text className="text-xs font-medium text-foreground">{label}</Text>
                </PressableScale>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* ─── Noor ─────────────────────────────────────────────────────────── */}
        <FadeIn index={6}>
          <PressableScale onPress={() => router.push('/noor')} accessibilityLabel="Open Noor AI">
            <Card variant="glass-noor" className="flex-row items-center gap-3 p-4">
              <Gradient colors={NOOR_GRADIENT} radius={20} style={{ width: 40, height: 40, ...shadowNoor }}>
                <View className="flex-1 items-center justify-center">
                  <Sparkles size={18} color="#ffffff" />
                </View>
              </Gradient>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-noor-700 dark:text-noor-300">Noor AI</Text>
                <Muted className="mt-0.5 text-xs">
                  Ask me anything about your day, Quran, or productivity.
                </Muted>
              </View>
              <Text className="text-lg text-noor-600 dark:text-noor-400">›</Text>
            </Card>
          </PressableScale>
        </FadeIn>

        {/* ─── Today's tasks ────────────────────────────────────────────────── */}
        <FadeIn index={7}>
          <View className="gap-3">
            <SectionHeader title="Today's Tasks" action="View all" onAction={() => router.push('/tasks')} />
            {tasksLoading ? (
              <View className="gap-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </View>
            ) : todayTasks.length === 0 ? (
              <Card variant="outline-dashed" className="items-center gap-2 py-8">
                <CheckSquare size={30} strokeWidth={1.5} color={dark ? '#3f4f4a' : '#c4cfcc'} />
                <Muted>No tasks for today</Muted>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/tasks')}
                  icon={<Plus size={14} color={dark ? '#f5f5f5' : '#0a0a0a'} />}
                >
                  Add task
                </Button>
              </Card>
            ) : (
              <Card className="gap-0 p-0">
                {todayPending.slice(0, 5).map((task, i) => (
                  <View
                    key={task.id}
                    className={cn(
                      'flex-row items-center gap-3 px-4 py-3',
                      i > 0 && 'border-t border-border',
                    )}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: false }}
                      accessibilityLabel={`Complete ${task.title}`}
                      hitSlop={10}
                      onPress={() => completeTask.mutate({ id: task.id, completed: true })}
                    >
                      <CircleIcon size={20} strokeWidth={1.75} color={dark ? '#5a6a66' : '#a9b6b2'} />
                    </Pressable>
                    <View className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[task.priority ?? 'medium'])} />
                    <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                      {task.title}
                    </Text>
                  </View>
                ))}
                {todayPending.length > 5 ? (
                  <Pressable
                    onPress={() => router.push('/tasks')}
                    className="border-t border-border px-4 py-2.5"
                  >
                    <Muted className="text-xs">+{todayPending.length - 5} more — view all</Muted>
                  </Pressable>
                ) : null}
                {todayDone.length > 0 ? (
                  <View
                    className={cn(
                      'flex-row items-center gap-2 bg-muted/30 px-4 py-2.5',
                      todayPending.length > 0 && 'border-t border-border',
                    )}
                  >
                    <CheckCircle2 size={14} color="#10b981" />
                    <Muted className="text-xs">{todayDone.length} completed today</Muted>
                  </View>
                ) : null}
              </Card>
            )}
          </View>
        </FadeIn>

        {/* ─── Active challenges ────────────────────────────────────────────── */}
        {activeChallenges.length > 0 ? (
          <FadeIn index={8}>
            <View className="gap-3">
              <SectionHeader title="Active Challenges" action="View all" onAction={() => router.push('/challenges')} />
              <View className="gap-2">
                {activeChallenges.slice(0, 3).map((challenge) => {
                  const pct = Math.min(100, Math.round((challenge.current_days / challenge.target_days) * 100))
                  return (
                    <Card key={challenge.id} className="flex-row items-center gap-3 px-4 py-3">
                      <IconBadge className={TINT.violet.bg} size={36}>
                        <Target size={16} strokeWidth={1.75} color={dark ? TINT.violet.iconDark : TINT.violet.icon} />
                      </IconBadge>
                      <View className="min-w-0 flex-1 gap-1.5">
                        <View className="flex-row items-center justify-between gap-2">
                          <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                            {challenge.title}
                          </Text>
                          <Muted className="text-xs">
                            {challenge.current_days}/{challenge.target_days}d
                          </Muted>
                        </View>
                        <Progress value={pct} className="h-1" indicatorClassName="bg-violet-500" />
                      </View>
                    </Card>
                  )
                })}
              </View>
            </View>
          </FadeIn>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

// Shadows for the two gradient surfaces. Elevation on Android needs an opaque
// background on the same view; the SVG fill provides it visually but not to
// the shadow engine, so a matching solid colour is set underneath.
const shadowLg = {
  backgroundColor: '#0f766e',
  shadowColor: '#0f766e',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 8,
} as const

const shadowNoor = {
  backgroundColor: '#14b8a6',
  shadowColor: '#14b8a6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 8,
  elevation: 4,
} as const
