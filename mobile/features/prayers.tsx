import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'
import { useRouter, type Href } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { useNotificationPrefs } from '~/lib/notificationPrefs'
import * as Haptics from 'expo-haptics'
import { Bell, BellRing, Check, Clock, MapPin, RotateCcw, Sparkle, X } from 'lucide-react-native'
import { HubContent, Muted, Card, Button, Gradient, FadeIn } from '~/components/ui'
import { useDeviceLocation } from '~/lib/location'
import {
  requestNotificationPermission,
  getNotificationPermission,
  type NotificationPermission,
} from '~/lib/notifications'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { usePrayersForDate, useUpsertPrayer } from '@/hooks/usePrayers'
import { localDateString } from '@/lib/dates'
import {
  FARD_ORDER,
  nextPrayer,
  prayerTimeToDate,
  type DailyPrayerTimes,
  type FardName,
} from '@/lib/api/prayerTimes'
import { coinsFor } from '@/lib/rewards'
import type { PrayerName, PrayerStatus } from '@/lib/database.types'

// The Prayers section of the Deen hub.
//
// A sky hero plots the five prayers on the sun's arc and counts down to the
// next one; every prayer below has four one-tap status buttons. The data
// layer — usePrayersForDate, useUpsertPrayer and the coin rewards they
// trigger — is shared unchanged with the web; on-device adhan reminders are
// what native adds on top.

const LABEL: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  tahajjud: 'Tahajjud',
}

const STATUS: Record<PrayerStatus, { label: string; Icon: typeof Check; color: string }> = {
  prayed: { label: 'Prayed', Icon: Check, color: '#10b981' },
  late: { label: 'Late', Icon: Clock, color: '#f59e0b' },
  qada: { label: 'Qada', Icon: RotateCcw, color: '#14b8a6' },
  missed: { label: 'Missed', Icon: X, color: '#ef4444' },
}
const STATUSES = Object.keys(STATUS) as PrayerStatus[]

const SKY_LIGHT = ['#0f766e', '#1a8f83', '#d9b46a'] as const
const SKY_DARK = ['#042f2e', '#0f766e', '#6b5a2a'] as const

/** "15:47" → "3:47 PM". */
function clock(hhmm: string | undefined): string {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function untilLabel(at: Date, now: Date): string {
  const mins = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60_000))
  if (mins < 1) return 'now'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ─── Sky arc ─────────────────────────────────────────────────────────────────
// A quadratic from bottom-left to bottom-right. Stops sit at even intervals;
// the solid stroke covers the fraction of the day between Fajr and Isha that
// has passed, so the sun's position reads at a glance.

const ARC_H = 150
const ARC_INSET = 28
const ARC_PEAK = -40
const ARC_BASE = 140

function arcPoint(t: number, w: number) {
  const x0 = ARC_INSET
  const x1 = w - ARC_INSET
  const cx = w / 2
  const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1
  const y = (1 - t) * (1 - t) * ARC_BASE + 2 * (1 - t) * t * ARC_PEAK + t * t * ARC_BASE
  return { x, y }
}

function arcLength(w: number, upTo = 1): number {
  let len = 0
  let prev = arcPoint(0, w)
  const steps = 120
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * upTo
    const p = arcPoint(t, w)
    len += Math.hypot(p.x - prev.x, p.y - prev.y)
    prev = p
  }
  return len
}

function SkyArc({
  width,
  progress,
  nextIndex,
}: {
  width: number
  /** 0..1 of the way from Fajr to Isha. */
  progress: number
  /** Index of the next prayer in FARD_ORDER, or 5 when all have passed. */
  nextIndex: number
}) {
  if (width === 0) return null
  const d = `M ${ARC_INSET} ${ARC_BASE} Q ${width / 2} ${ARC_PEAK} ${width - ARC_INSET} ${ARC_BASE}`
  const total = arcLength(width)
  const done = arcLength(width, progress)
  const stops = FARD_ORDER.map((name, i) => ({ name, ...arcPoint(0.08 + (0.84 * i) / 4, width) }))

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: ARC_H }}>
      <Svg width={width} height={ARC_H}>
        <Ellipse cx={width / 2} cy={ARC_H + 16} rx={width * 0.72} ry={44} fill="#ffffff" fillOpacity={0.1} />
        <Path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.32} strokeWidth={2} strokeDasharray="4 5" />
        <Path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.92}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${done} ${total + 10}`}
        />
        {stops.map((s, i) => {
          if (i === nextIndex) {
            return (
              <Circle key={s.name} cx={s.x} cy={s.y} r={9} fill="#fde68a" stroke="#ffffff" strokeWidth={2} />
            )
          }
          const passed = i < nextIndex
          return (
            <Circle
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={passed ? 6 : 5}
              fill={passed ? '#ffffff' : '#ffffff'}
              fillOpacity={passed ? 1 : 0.45}
              stroke="#ffffff"
              strokeOpacity={0.9}
              strokeWidth={2}
            />
          )
        })}
        {nextIndex < 5 ? (
          <Circle cx={stops[nextIndex].x} cy={stops[nextIndex].y} r={15} fill="#fde68a" fillOpacity={0.3} />
        ) : null}
      </Svg>
      {stops.map((s, i) => (
        <Text
          key={s.name}
          style={{
            position: 'absolute',
            left: s.x - 30,
            top: s.y + 13,
            width: 60,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: '600',
            color: '#ffffff',
            opacity: i === nextIndex ? 1 : i < nextIndex ? 0.9 : 0.7,
          }}
        >
          {LABEL[s.name]}
        </Text>
      ))}
    </View>
  )
}

// ─── Sky hero ────────────────────────────────────────────────────────────────

function SkyHero({
  times,
  loading,
  now,
  permission,
  remindersOn,
  onEnableReminders,
}: {
  times: DailyPrayerTimes | undefined
  loading: boolean
  now: Date
  permission: NotificationPermission
  remindersOn: boolean
  onEnableReminders: () => void
}) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const [width, setWidth] = useState(0)

  const upcoming = times ? nextPrayer(times, now) : null
  const nextIndex = upcoming ? FARD_ORDER.indexOf(upcoming.name) : 5

  const progress = useMemo(() => {
    if (!times) return 0
    const fajr = prayerTimeToDate(now, times.fajr)
    const isha = prayerTimeToDate(now, times.isha)
    if (!fajr || !isha || isha <= fajr) return 0
    return Math.min(1, Math.max(0, (now.getTime() - fajr.getTime()) / (isha.getTime() - fajr.getTime())))
  }, [times, now])

  const router = useRouter()
  const reminders =
    permission === 'granted'
      ? remindersOn
        ? 'adhan reminders on'
        : 'adhan reminders off'
      : 'tap the bell for adhan reminders'

  return (
    <Gradient
      colors={dark ? SKY_DARK : SKY_LIGHT}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1.4 }}
      radius={24}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height: 236,
        backgroundColor: '#0f766e',
        shadowColor: '#0f766e',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
        elevation: 6,
      }}
    >
      <SkyArc width={width} progress={progress} nextIndex={nextIndex} />

      <View style={{ padding: 20, paddingTop: 18 }}>
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/80">
          {upcoming ? 'Next prayer' : times ? 'Today' : 'Prayer times'}
        </Text>
        {loading && !times ? (
          <View className="mt-3 flex-row items-center gap-2">
            <ActivityIndicator color="#ffffff" />
            <Text className="text-base font-medium text-white/90">Fetching prayer times…</Text>
          </View>
        ) : upcoming && times ? (
          <>
            <Text className="mt-1.5 text-[30px] font-bold leading-9 tracking-tight text-white">
              {LABEL[upcoming.name]}{' '}
              <Text className="text-[22px] font-medium text-white/85">{untilLabel(upcoming.at, now)}</Text>
            </Text>
            <Text className="mt-1.5 text-xs text-white/85">
              {clock(times[upcoming.name])} · {reminders}
            </Text>
          </>
        ) : times ? (
          <>
            <Text className="mt-1.5 text-[24px] font-bold leading-8 tracking-tight text-white">
              All five prayers have passed
            </Text>
            <Text className="mt-1.5 text-xs text-white/85">Isha was at {clock(times.isha)} · {reminders}</Text>
          </>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={permission === 'granted' ? 'Reminder settings' : 'Enable adhan reminders'}
        onPress={permission === 'granted' ? () => router.push('/notification-settings' as Href) : onEnableReminders}
        className="absolute right-4 top-4 h-[38px] w-[38px] items-center justify-center rounded-full bg-white/15"
      >
        {permission === 'granted' && remindersOn ? (
          <BellRing size={18} color="#ffffff" />
        ) : (
          <Bell size={18} color="#ffffff" />
        )}
      </Pressable>
    </Gradient>
  )
}

// ─── Status buttons ──────────────────────────────────────────────────────────

function StatusButtons({
  prayer,
  current,
  onChange,
  busy,
}: {
  prayer: PrayerName
  current: PrayerStatus | null
  onChange: (status: PrayerStatus) => void
  busy: boolean
}) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const idle = dark ? '#83938f' : '#8a9793'
  return (
    <View className="flex-row gap-1.5">
      {STATUSES.map((status) => {
        // Tahajjud is voluntary: it is either offered or it is not.
        if (prayer === 'tahajjud' && status !== 'prayed') return null
        const cfg = STATUS[status]
        const active = current === status
        return (
          <Pressable
            key={status}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${LABEL[prayer]}: ${cfg.label}`}
            disabled={busy || active}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onChange(status)
            }}
            className="h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-muted"
            style={
              active
                ? { backgroundColor: `${cfg.color}22`, borderWidth: 1.5, borderColor: cfg.color }
                : busy
                  ? { opacity: 0.5 }
                  : undefined
            }
          >
            <cfg.Icon size={16} strokeWidth={active ? 2.5 : 1.75} color={active ? cfg.color : idle} />
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PrayersScreen() {
  const now = useNow()
  const today = localDateString(now)
  const { coords, status: locationStatus, resolve } = useDeviceLocation()
  const { data: times, isLoading: timesLoading } = usePrayerTimes(coords)
  const { data: logged } = usePrayersForDate(today)
  const upsert = useUpsertPrayer()

  const [permission, setPermission] = useState<NotificationPermission>('undetermined')
  const remindersOn = useNotificationPrefs((st) => st.prefs.prayers)

  useEffect(() => {
    void getNotificationPermission().then(setPermission)
  }, [])

  const statusByPrayer = useMemo(() => {
    const map: Partial<Record<PrayerName, PrayerStatus | null>> = {}
    for (const row of logged ?? []) map[row.prayer] = row.status
    return map
  }, [logged])

  // Reminders are scheduled app-wide by useNotificationSync in the tab layout.

  const upcoming = times ? nextPrayer(times.prayers, now) : null

  const enableReminders = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  const earned = (prayer: PrayerName): number | null => {
    const s = statusByPrayer[prayer]
    if (!s) return null
    return coinsFor({ kind: 'prayer', prayer, status: s }).coins
  }

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Location gate — prayer times are astronomical, so they need coordinates. */}
        {!coords ? (
          <FadeIn index={0}>
            <Card variant="glass-noor" className="gap-3">
              <View className="flex-row items-center gap-2">
                <MapPin size={18} color="#14b8a6" />
                <Text className="flex-1 text-sm font-semibold text-foreground">Set your location</Text>
              </View>
              <Muted>
                Prayer times depend on where you are. Nothing leaves your device except the
                coordinates used to calculate them.
              </Muted>
              <Button onPress={resolve} loading={locationStatus === 'loading'}>
                Use my location
              </Button>
              {locationStatus === 'denied' ? (
                <Text className="text-xs text-destructive">
                  Location permission was denied. Enable it in Settings to get prayer times.
                </Text>
              ) : null}
            </Card>
          </FadeIn>
        ) : (
          <FadeIn index={0}>
            <SkyHero
              times={times?.prayers}
              loading={timesLoading}
              now={now}
              permission={permission}
              remindersOn={remindersOn}
              onEnableReminders={() => void enableReminders()}
            />
          </FadeIn>
        )}

        {/* The five fard prayers */}
        <FadeIn index={1}>
          <Card className="p-0">
            {FARD_ORDER.map((prayer, i) => {
              const isNext = upcoming?.name === prayer
              const coins = earned(prayer)
              const status = statusByPrayer[prayer] ?? null
              return (
                <View
                  key={prayer}
                  className={[
                    'flex-row items-center gap-3 px-3.5 py-3',
                    i > 0 ? 'border-t border-border' : '',
                    isNext ? 'bg-noor-500/10' : '',
                  ].join(' ')}
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      className={
                        isNext
                          ? 'text-[15px] font-semibold text-noor-600 dark:text-noor-400'
                          : 'text-[15px] font-semibold text-foreground'
                      }
                    >
                      {LABEL[prayer]}
                    </Text>
                    <Muted className="text-xs" numberOfLines={1}>
                      {[
                        times ? clock(times.prayers[prayer as FardName]) : null,
                        status
                          ? coins
                            ? `+${coins} earned`
                            : STATUS[status].label
                          : isNext
                            ? 'Up next'
                            : times
                              ? null
                              : 'Not logged yet',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Muted>
                  </View>
                  <StatusButtons
                    prayer={prayer}
                    current={status}
                    busy={upsert.isPending && upsert.variables?.prayer === prayer}
                    // There is no "unset" — the web view ignores a cleared status too.
                    onChange={(s) => upsert.mutate({ date: today, prayer, status: s })}
                  />
                </View>
              )
            })}
          </Card>
        </FadeIn>

        {/* Tahajjud */}
        <FadeIn index={2}>
          <Card variant="glass-noor" className="flex-row items-center gap-3 px-3.5 py-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Sparkle size={18} color="#8b5cf6" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-semibold text-foreground">Tahajjud</Text>
              <Muted className="text-xs" numberOfLines={1}>
                {statusByPrayer.tahajjud === 'prayed'
                  ? `Offered tonight · +${coinsFor({ kind: 'prayer', prayer: 'tahajjud', status: 'prayed' }).coins} earned`
                  : `Voluntary · the night is yours · +${coinsFor({ kind: 'prayer', prayer: 'tahajjud', status: 'prayed' }).coins}`}
              </Muted>
            </View>
            <StatusButtons
              prayer="tahajjud"
              current={statusByPrayer.tahajjud ?? null}
              busy={upsert.isPending && upsert.variables?.prayer === 'tahajjud'}
              onChange={(s) => upsert.mutate({ date: today, prayer: 'tahajjud', status: s })}
            />
          </Card>
        </FadeIn>
      </View>
    </HubContent>
  )
}
