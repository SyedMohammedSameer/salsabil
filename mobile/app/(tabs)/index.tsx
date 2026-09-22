import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, RefreshControl, ScrollView } from 'react-native'
import { useRouter, useIsFocused } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import {
  Bell,
  BookOpen,
  ChartColumn,
  Check,
  Coins,
  Droplets,
  Dumbbell,
  Flame,
  MapPin,
  Moon,
  Play,
  Sun,
  SunMedium,
  Sunrise,
  Sunset,
  CheckSquare,
  Target,
  Timer,
  TreePine,
  Users,
  X,
} from 'lucide-react-native'
import {
  Arabic,
  Button,
  Card,
  FadeIn,
  Gradient,
  IconBadge,
  Muted,
  PressableScale,
  Progress,
  SectionHeader,
  SHADOW,
} from '~/components/ui'
import { SvgTree } from '~/components/garden/SvgTree'
import { useDeviceLocation } from '~/lib/location'
import { hubHref } from '~/lib/nav'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAdhkarLogs } from '@/hooks/useAdhkar'
import { useGardenTrees, useWaterTree } from '@/hooks/useGarden'
import { useAllTasks } from '@/hooks/useTasks'
import { usePrayersForDate } from '@/hooks/usePrayers'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { useQuranLogsForDate } from '@/hooks/useQuranLogs'
import { SPECIES_INFO } from '@/lib/api/garden'
import { FARD_ORDER, nextPrayer, prayerTimeToDate, type FardName } from '@/lib/api/prayerTimes'
import { waterCost } from '@/lib/rewards'
import { getDailyQuote } from '@/data/quotes'
import { surahName } from '@/data/surahs'
import { AskNoorBar } from '~/components/NavBar'
import { NOOR_PLACEMENT, FLOATING_BAR_HEIGHT } from '~/lib/noorPlacement'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { PrayerStatus } from '@/lib/database.types'

// The native dashboard, "immersive header" layout:
//
//   header (greeting, date, next prayer) with the stats card floating over
//   its bottom edge → today's five prayers → bento tiles (focus, tasks,
//   quran, adhkar) that each open their screen → garden scene with a water
//   button → daily ayah → explore chips
//
// Every number is the shared React Query cache the web dashboard reads;
// nothing is computed twice or differently from src/views/dashboard.

// ─── Greeting & dates ────────────────────────────────────────────────────────

function getGreeting(hour: number) {
  if (hour < 6) return { ar: 'بِسْمِ اللهِ', en: 'Bismillah' }
  if (hour < 12) return { ar: 'صَبَاحُ الْخَيْرِ', en: 'Good morning' }
  if (hour < 17) return { ar: 'مَرْحَبًا', en: 'Good afternoon' }
  if (hour < 20) return { ar: 'مَسَاءُ الْخَيْرِ', en: 'Good evening' }
  return { ar: 'لَيْلَةً مُبَارَكَةً', en: 'Blessed night' }
}

/** "Tuesday, 22 September · 10 Rabiʿ II 1448" — Hijri part only where ICU has it. */
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
    return `${gregorian} · ${fmt.format(date).replace(/\s*AH$/, '')}`
  } catch {
    return gregorian
  }
}

/** "15:47" → "3:47" (and "3:47 PM" with `meridiem`). */
function clock(hhmm: string | undefined, meridiem = false): string {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const base = `${h % 12 || 12}:${String(m).padStart(2, '0')}`
  return meridiem ? `${base} ${h < 12 ? 'AM' : 'PM'}` : base
}

function untilLabel(at: Date, now: Date): string {
  const mins = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60_000))
  if (mins < 1) return 'now'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
}

/** A clock that ticks once a minute, so countdowns stay honest. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
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
} satisfies Record<string, Tint>

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-destructive',
  high: 'bg-warn-500',
  medium: 'bg-noor-500',
  low: 'bg-muted-foreground/40',
}

const PRAYER_LABEL: Record<FardName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

const PRAYER_ICON: Record<FardName, typeof Sun> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: SunMedium,
  maghrib: Sunset,
  isha: Moon,
}

/** A soft daily focus target the tile's bar fills against. */
const FOCUS_DAILY_TARGET_MIN = 90

const HEADER_GRADIENT = ['#023728', '#0b5c4c', '#0f766e'] as const

// ─── Pieces ──────────────────────────────────────────────────────────────────

type ChipState = 'done' | 'missed' | 'next' | 'todo'

function PrayerChip({
  name,
  time,
  state,
  dark,
  onPress,
}: {
  name: FardName
  time?: string
  state: ChipState
  dark: boolean
  onPress: () => void
}) {
  const Icon = PRAYER_ICON[name]
  const muted = dark ? '#83938f' : '#677773'
  const noor = dark ? '#2dd4bf' : '#0d9488'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${PRAYER_LABEL[name]} ${state}`}
      onPress={onPress}
      className="items-center gap-1.5"
      style={{ width: 60 }}
    >
      <View
        className={cn(
          'h-[46px] w-[46px] items-center justify-center rounded-full',
          state === 'done' && 'bg-noor-500',
          state === 'missed' && 'bg-danger-500/15',
          state === 'next' && 'border-2 border-noor-500 bg-noor-500/10',
          state === 'todo' && 'bg-muted',
        )}
      >
        {state === 'done' ? (
          <Check size={20} strokeWidth={2.5} color="#ffffff" />
        ) : state === 'missed' ? (
          <X size={18} strokeWidth={2.25} color="#ef4444" />
        ) : (
          <Icon size={20} strokeWidth={1.75} color={state === 'next' ? noor : muted} />
        )}
      </View>
      <Text
        className={cn('text-xs font-semibold text-foreground', state === 'next' && 'text-noor-600 dark:text-noor-400')}
      >
        {PRAYER_LABEL[name]}
      </Text>
      {/* Without a location there is no time to show; the row stays the same
          height either way so the chips line up. */}
      <Text className="text-[10px] text-muted-foreground">
        {time ? clock(time) : state === 'done' ? 'Prayed' : state === 'missed' ? 'Missed' : ' '}
      </Text>
    </Pressable>
  )
}

function Tile({
  title,
  icon: Icon,
  tint,
  dark,
  onPress,
  children,
}: {
  title: string
  icon: typeof Sun
  tint: Tint
  dark: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }} fill accessibilityLabel={`Open ${title}`}>
      <Card className="flex-1 gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-muted-foreground">{title}</Text>
          <IconBadge className={cn(tint.bg, 'rounded-[10px]')} size={36}>
            <Icon size={18} strokeWidth={1.75} color={dark ? tint.iconDark : tint.icon} />
          </IconBadge>
        </View>
        {children}
      </Card>
    </PressableScale>
  )
}

function Big({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <Text className="text-[26px] font-bold leading-7 tracking-tight text-foreground">
      {value}
      {unit ? <Text className="text-[13px] font-medium tracking-normal text-muted-foreground"> {unit}</Text> : null}
    </Text>
  )
}

function Chip({
  label,
  icon: Icon,
  tint,
  dark,
  onPress,
}: {
  label: string
  icon: typeof Sun
  tint: Tint
  dark: boolean
  onPress: () => void
}) {
  return (
    <PressableScale
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full border border-border bg-card py-2.5 pl-3.5 pr-4"
      accessibilityLabel={label}
    >
      <Icon size={16} strokeWidth={1.75} color={dark ? tint.iconDark : tint.icon} />
      <Text className="text-[13px] font-medium text-foreground">{label}</Text>
    </PressableScale>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { user } = useAuth()
  const { data: profile } = useProfile()

  const now = useNow()
  const today = useMemo(() => localDateString(now), [now])
  const greeting = useMemo(() => getGreeting(now.getHours()), [now])
  const dateLine = useMemo(() => formatToday(now), [now])
  const quote = useMemo(() => getDailyQuote(), [])

  const { data: stats, isLoading: statsLoading, isRefetching, refetch } = useDashboardStats(today)
  const { coords } = useDeviceLocation()
  const { data: times } = usePrayerTimes(coords)
  const { data: prayerLogs } = usePrayersForDate(today)
  const { data: adhkarLogs } = useAdhkarLogs(today)
  const { data: quranLogs } = useQuranLogsForDate(today)
  const { data: trees } = useGardenTrees()
  const { data: allTasks } = useAllTasks()
  const waterTree = useWaterTree()

  // ── Derived ────────────────────────────────────────────────────────────────

  const displayName =
    profile?.display_name?.split(' ')[0] ??
    profile?.username ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'Friend'

  const coins = stats?.coins ?? profile?.coins ?? 0
  const streak = stats?.streak ?? profile?.streak ?? 0
  const prayed = stats?.prayers?.prayed ?? 0
  const prayerTotal = stats?.prayers?.total ?? 5

  const upcoming = times ? nextPrayer(times.prayers, now) : null
  const lastPassed = useMemo(() => {
    if (!times) return null
    let last: { name: FardName; at: Date } | null = null
    for (const name of FARD_ORDER) {
      const at = prayerTimeToDate(now, times.prayers[name])
      if (at && at.getTime() <= now.getTime()) last = { name, at }
    }
    return last
  }, [times, now])

  const statusOf = (name: FardName): PrayerStatus | null =>
    prayerLogs?.find((p) => p.prayer === name)?.status ?? null

  const chipState = (name: FardName): ChipState => {
    const s = statusOf(name)
    if (s === 'prayed' || s === 'late' || s === 'qada') return 'done'
    if (s === 'missed') return 'missed'
    if (upcoming?.name === name) return 'next'
    return 'todo'
  }

  const todayTasks = useMemo(
    () => (allTasks ?? []).filter((t) => t.due_date === today),
    [allTasks, today],
  )
  const pending = todayTasks.filter((t) => !t.completed)
  const doneCount = todayTasks.length - pending.length

  const focusMins = stats?.focusMinutes ?? 0
  const quranPages = stats?.quranPages ?? 0
  const latestQuran = quranLogs?.[0]

  const adhkarDone = adhkarLogs?.filter((a) => a.completed).length ?? 0
  const adhkarHint = (() => {
    const done = new Set(adhkarLogs?.filter((a) => a.completed).map((a) => a.time))
    if (!done.has('morning') && now.getHours() < 12) return 'Morning adhkar after Fajr'
    if (!done.has('evening')) return 'Evening adhkar after Maghrib'
    if (!done.has('morning')) return 'Morning adhkar after Fajr'
    if (!done.has('after_prayer')) return 'Adhkar after prayer'
    return 'All done for today'
  })()

  const treesPlanted = trees?.length ?? 0
  const newestActive = useMemo(
    () =>
      [...(trees ?? [])]
        .filter((t) => t.stage !== 'ancient')
        .sort((a, b) => (a.planted_at < b.planted_at ? 1 : -1))[0] ?? null,
    [trees],
  )
  const waterPrice = newestActive ? waterCost(newestActive.stage) : 0
  const canWater = !!newestActive && coins >= waterPrice

  const white = '#ffffff'

  return (
    <View className="flex-1 bg-background">
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView
        contentContainerStyle={{ paddingBottom: NOOR_PLACEMENT === 'floating' ? FLOATING_BAR_HEIGHT + 40 : 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={white}
            colors={['#14b8a6']}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        {/* ─── Header ───────────────────────────────────────────────────────── */}
        <Gradient
          colors={HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          orbs
          dots
          style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 64 }}
        >
          <FadeIn index={0}>
            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile"
                onPress={() => router.push('/profile')}
                className="flex-row items-center gap-3"
              >
                <View className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/25 bg-white/20">
                  <Text className="text-base font-bold text-white">
                    {displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-white/75">Assalamu alaikum</Text>
                  <Text className="text-[21px] font-bold tracking-tight text-white" numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Prayer reminders"
                onPress={() => router.push(hubHref('deen', 'prayers'))}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
              >
                <Bell size={20} strokeWidth={1.75} color={white} />
              </Pressable>
            </View>

            <Arabic className="mt-4 text-left text-[30px] leading-[42px] text-white dark:text-white">
              {greeting.ar}
            </Arabic>
            <Text className="mt-1 text-xs text-white/75">
              {greeting.en} · {dateLine}
            </Text>
            {NOOR_PLACEMENT === 'header' ? <AskNoorBar /> : null}
          </FadeIn>

          <FadeIn index={1}>
            <PressableScale
              onPress={() => router.push(hubHref('deen', 'prayers'))}
              className="mt-4 flex-row items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3"
              accessibilityLabel="Open prayers"
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-white/15">
                {!coords ? (
                  <MapPin size={18} color={white} />
                ) : upcoming ? (
                  (() => {
                    const Icon = PRAYER_ICON[upcoming.name]
                    return <Icon size={18} color={white} />
                  })()
                ) : (
                  <Moon size={18} color={white} />
                )}
              </View>
              <View className="flex-1">
                {!coords ? (
                  <>
                    <Text className="text-[13px] font-semibold text-white">Set your location</Text>
                    <Text className="text-xs text-white/75">Prayer times and adhan reminders need it</Text>
                  </>
                ) : !times ? (
                  <>
                    <Text className="text-[13px] font-semibold text-white">Fetching prayer times…</Text>
                    <Text className="text-xs text-white/75">{prayed} of {prayerTotal} prayed today</Text>
                  </>
                ) : upcoming ? (
                  <>
                    <Text className="text-[13px] font-semibold text-white">
                      {PRAYER_LABEL[upcoming.name]} {untilLabel(upcoming.at, now)}
                    </Text>
                    <Text className="text-xs text-white/75">
                      {clock(times.prayers[upcoming.name], true)} · {prayed} of {prayerTotal} prayed
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-[13px] font-semibold text-white">All of today's prayers have passed</Text>
                    <Text className="text-xs text-white/75">
                      {lastPassed ? `${PRAYER_LABEL[lastPassed.name]} was at ${clock(times.prayers[lastPassed.name], true)}` : ''}
                      {' · '}{prayed} of {prayerTotal} prayed
                    </Text>
                  </>
                )}
              </View>
              <Text className="text-lg text-white/80">›</Text>
            </PressableScale>
          </FadeIn>
        </Gradient>

        <View className="gap-5 px-4">
          {/* ─── Floating stats ────────────────────────────────────────────── */}
          <FadeIn index={2} style={{ marginTop: -48 }}>
            <Card className="flex-row p-0" style={SHADOW.lg}>
              {[
                { k: 'Coins', v: statsLoading && !profile ? '—' : coins.toLocaleString(), Icon: Coins, tint: TINT.gold, to: () => hubHref('grow', 'garden') },
                { k: 'Day streak', v: String(streak), Icon: Flame, tint: TINT.warn, to: () => hubHref('grow', 'analytics') },
                { k: 'Prayers', v: `${prayed}`, suffix: `/${prayerTotal}`, Icon: Moon, tint: TINT.noor, to: () => hubHref('deen', 'prayers') },
              ].map((cell, i) => (
                <Pressable
                  key={cell.k}
                  accessibilityRole="button"
                  onPress={() => router.push(cell.to())}
                  className={cn('flex-1 items-center gap-1 px-2 py-4', i > 0 && 'border-l border-border')}
                >
                  <cell.Icon size={18} strokeWidth={1.75} color={dark ? cell.tint.iconDark : cell.tint.icon} />
                  <Text className="text-[22px] font-bold leading-7 tracking-tight text-foreground">
                    {cell.v}
                    {cell.suffix ? (
                      <Text className="text-sm font-medium tracking-normal text-muted-foreground">{cell.suffix}</Text>
                    ) : null}
                  </Text>
                  <Text className="text-[11px] font-medium text-muted-foreground">{cell.k}</Text>
                </Pressable>
              ))}
            </Card>
          </FadeIn>

          {/* ─── Today's prayers ───────────────────────────────────────────── */}
          <FadeIn index={3}>
            <View className="gap-3">
              <SectionHeader title="Today's prayers" action="Log" onAction={() => router.push(hubHref('deen', 'prayers'))} />
              <View className="flex-row justify-between">
                {FARD_ORDER.map((name) => (
                  <PrayerChip
                    key={name}
                    name={name}
                    time={times?.prayers[name]}
                    state={chipState(name)}
                    dark={dark}
                    onPress={() => router.push(hubHref('deen', 'prayers'))}
                  />
                ))}
              </View>
            </View>
          </FadeIn>

          {/* ─── Bento ─────────────────────────────────────────────────────── */}
          <FadeIn index={4}>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Tile title="Focus" icon={Timer} tint={TINT.noor} dark={dark} onPress={() => router.push(hubHref('focus', 'timer'))}>
                  <Big value={focusMins} unit={`/ ${FOCUS_DAILY_TARGET_MIN} min`} />
                  <Progress value={(focusMins / FOCUS_DAILY_TARGET_MIN) * 100} className="h-[5px]" />
                  <Button
                    size="sm"
                    onPress={() => router.push(hubHref('focus', 'timer'))}
                    icon={<Play size={14} color="#ffffff" />}
                    className="mt-0.5"
                  >
                    Start session
                  </Button>
                </Tile>
                <Tile title="Tasks" icon={CheckSquare} tint={TINT.accent} dark={dark} onPress={() => router.push(hubHref('focus', 'tasks'))}>
                  <Big value={doneCount} unit={`/ ${todayTasks.length} done`} />
                  <Progress
                    value={todayTasks.length ? (doneCount / todayTasks.length) * 100 : 0}
                    className="h-[5px]"
                    indicatorClassName="bg-accentGreen-500"
                  />
                  <View className="gap-1.5 pt-0.5">
                    {pending.slice(0, 2).map((t) => (
                      <View key={t.id} className="flex-row items-center gap-2">
                        <View className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[t.priority ?? 'medium'])} />
                        <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>{t.title}</Text>
                      </View>
                    ))}
                    {pending.length === 0 ? (
                      <Muted className="text-xs">{todayTasks.length ? 'All done for today' : 'Nothing due today'}</Muted>
                    ) : null}
                  </View>
                </Tile>
              </View>
              <View className="flex-row gap-3">
                <Tile title="Quran" icon={BookOpen} tint={TINT.gold} dark={dark} onPress={() => router.push(hubHref('deen', 'quran'))}>
                  <Big value={quranPages} unit={quranPages === 1 ? 'page' : 'pages'} />
                  <Muted className="text-xs" numberOfLines={2}>
                    {latestQuran
                      ? `Last: ${surahName(latestQuran.surah_to)} ${latestQuran.surah_to}:${latestQuran.ayah_to}`
                      : 'Log today’s reading'}
                  </Muted>
                </Tile>
                <Tile title="Adhkar" icon={Moon} tint={TINT.indigo} dark={dark} onPress={() => router.push(hubHref('deen', 'adhkar'))}>
                  <Big value={adhkarDone} unit="/ 3" />
                  <Muted className="text-xs" numberOfLines={2}>
                    {adhkarHint}
                  </Muted>
                </Tile>
              </View>
            </View>
          </FadeIn>

          {/* ─── Garden ────────────────────────────────────────────────────── */}
          <FadeIn index={5}>
            <Card className="p-0">
              <Pressable accessibilityRole="button" accessibilityLabel="Open your garden" onPress={() => router.push(hubHref('grow', 'garden'))}>
                <Gradient
                  colors={dark ? ['#062a27', '#070c0b'] : ['#f0fdfa', '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  radius={20}
                  style={{ height: 150, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: '-10%',
                      right: '-10%',
                      bottom: -70,
                      height: 110,
                      borderRadius: 999,
                      backgroundColor: dark ? '#123d2c' : '#cfe8d2',
                    }}
                  />
                  {treesPlanted === 0 ? (
                    <View className="flex-1 items-center justify-center gap-1 px-6">
                      <TreePine size={30} strokeWidth={1.25} color={dark ? '#3f4f4a' : '#9fb8b1'} />
                      <Muted className="text-center text-xs">
                        No trees yet. Finish a focus session to plant your first.
                      </Muted>
                    </View>
                  ) : (
                    <View
                      className="flex-row items-end justify-evenly"
                      style={{ position: 'absolute', left: 0, right: 0, bottom: 18 }}
                    >
                      {trees!.slice(0, 5).map((tree, i) => (
                        <SvgTree
                          key={tree.id}
                          species={tree.species}
                          stage={tree.stage}
                          seed={tree.id}
                          // One tree stands alone and large; several step
                          // down so the tallest sits in the middle.
                          size={trees!.length === 1 ? 128 : i === 1 ? 96 : i === 2 ? 84 : i === 3 ? 80 : 66}
                        />
                      ))}
                    </View>
                  )}
                </Gradient>
              </Pressable>
              <View className="flex-row items-center justify-between gap-3 px-4 pb-3.5 pt-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-semibold text-foreground">My Garden</Text>
                  <Muted className="text-xs" numberOfLines={1}>
                    {treesPlanted === 0
                      ? 'Plant your first tree'
                      : `${treesPlanted} ${treesPlanted === 1 ? 'tree' : 'trees'}${
                          newestActive ? ` · ${SPECIES_INFO[newestActive.species].name} is ${newestActive.stage}` : ''
                        }`}
                  </Muted>
                </View>
                {newestActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canWater}
                    loading={waterTree.isPending}
                    onPress={() => waterTree.mutate(newestActive)}
                    icon={<Droplets size={14} color={dark ? TINT.noor.iconDark : TINT.noor.icon} />}
                  >
                    Water · {waterPrice}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onPress={() => router.push(hubHref('grow', 'garden'))}>
                    Visit
                  </Button>
                )}
              </View>
            </Card>
          </FadeIn>

          {/* ─── Daily ayah ────────────────────────────────────────────────── */}
          <FadeIn index={6}>
            <Card variant="glass-noor" className="gap-2 px-5 pb-4 pt-5">
              <Text
                className="absolute left-3.5 top-1 text-[56px] leading-[56px] text-noor-300 dark:text-noor-800"
                style={{ fontFamily: 'Amiri' }}
              >
                ”
              </Text>
              <Arabic className="text-[22px] leading-[42px]">{quote.arabic}</Arabic>
              <Text className="text-[13px] leading-5 text-foreground/85">{quote.translation}</Text>
              <Muted className="text-xs">{quote.source}</Muted>
            </Card>
          </FadeIn>

          {/* ─── Explore ───────────────────────────────────────────────────── */}
          <FadeIn index={7}>
            <View className="gap-3">
              <SectionHeader title="Explore" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
              >
                <Chip label="Workouts" icon={Dumbbell} tint={TINT.rose} dark={dark} onPress={() => router.push(hubHref('grow', 'workouts'))} />
                <Chip label="Challenges" icon={Target} tint={TINT.violet} dark={dark} onPress={() => router.push(hubHref('grow', 'challenges'))} />
                <Chip label="Study rooms" icon={Users} tint={TINT.noor} dark={dark} onPress={() => router.push(hubHref('focus', 'rooms'))} />
                <Chip label="Analytics" icon={ChartColumn} tint={TINT.accent} dark={dark} onPress={() => router.push(hubHref('grow', 'analytics'))} />
                <View style={{ width: 8 }} />
              </ScrollView>
            </View>
          </FadeIn>
        </View>
      </ScrollView>
    </View>
  )
}
