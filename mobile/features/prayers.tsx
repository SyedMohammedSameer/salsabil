import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import {
  CheckCircle2, Clock, RotateCcw, XCircle, BellRing, MapPin,
} from 'lucide-react-native'
import { HubContent, Muted, Card, Button } from '~/components/ui'
import { useDeviceLocation } from '~/lib/location'
import {
  requestNotificationPermission,
  getNotificationPermission,
  schedulePrayerReminders,
  type NotificationPermission,
} from '~/lib/notifications'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { usePrayersForDate, useUpsertPrayer } from '@/hooks/usePrayers'
import { localDateString } from '@/lib/dates'
import { nextPrayer, type FardName } from '@/lib/api/prayerTimes'
import type { PrayerName, PrayerStatus } from '@/lib/database.types'

// Ported from src/views/prayer/PrayerView.tsx. The data layer — usePrayersForDate,
// useUpsertPrayer, and the coin rewards they trigger — is shared unchanged; only
// the presentation is rewritten for React Native.

const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'tahajjud']

const LABEL: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  tahajjud: 'Tahajjud',
}

const STATUS_CONFIG: Record<
  PrayerStatus,
  { label: string; Icon: typeof CheckCircle2; color: string }
> = {
  prayed: { label: 'Prayed', Icon: CheckCircle2, color: '#10b981' },
  late: { label: 'Late', Icon: Clock, color: '#f59e0b' },
  qada: { label: 'Qada', Icon: RotateCcw, color: '#14b8a6' },
  missed: { label: 'Missed', Icon: XCircle, color: '#ef4444' },
}

const STATUSES = Object.keys(STATUS_CONFIG) as PrayerStatus[]

function PrayerRow({
  prayer,
  time,
  current,
  onChange,
  busy,
}: {
  prayer: PrayerName
  time?: string
  current: PrayerStatus | null
  onChange: (status: PrayerStatus) => void
  busy: boolean
}) {
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">{LABEL[prayer]}</Text>
        {time ? <Text className="text-sm text-muted-foreground">{time}</Text> : null}
      </View>

      <View className="flex-row gap-2">
        {STATUSES.map((status) => {
          // Tahajjud is voluntary: it is either offered or it is not, so the
          // late/qada/missed states make no sense for it.
          if (prayer === 'tahajjud' && status !== 'prayed') return null

          const cfg = STATUS_CONFIG[status]
          const active = current === status

          return (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${LABEL[prayer]}: ${cfg.label}`}
              disabled={busy || active}
              onPress={() => onChange(status)}
              className="flex-1 items-center gap-1 rounded-lg border px-2 py-2.5"
              style={{
                borderColor: active ? cfg.color : 'transparent',
                backgroundColor: active ? `${cfg.color}1a` : 'rgba(127,127,127,0.08)',
                opacity: busy ? 0.6 : 1,
              }}
            >
              <cfg.Icon size={16} color={active ? cfg.color : '#83938f'} />
              <Text
                className="text-[11px]"
                style={{ color: active ? cfg.color : '#83938f' }}
              >
                {cfg.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </Card>
  )
}

export default function PrayersScreen() {
  const today = localDateString()
  const { coords, status: locationStatus, resolve } = useDeviceLocation()
  const { data: times, isLoading: timesLoading } = usePrayerTimes(coords)
  const { data: logged } = usePrayersForDate(today)
  const upsert = useUpsertPrayer()

  const [permission, setPermission] = useState<NotificationPermission>('undetermined')
  const [scheduled, setScheduled] = useState<number | null>(null)

  useEffect(() => {
    void getNotificationPermission().then(setPermission)
  }, [])

  const statusByPrayer = useMemo(() => {
    const map: Partial<Record<PrayerName, PrayerStatus | null>> = {}
    for (const row of logged ?? []) map[row.prayer] = row.status
    return map
  }, [logged])

  // Reschedule whenever the day's times change. Keyed on the times themselves
  // so a re-render cannot stack duplicate notifications.
  const scheduledForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!times || permission !== 'granted') return
    const key = `${today}:${JSON.stringify(times.prayers)}`
    if (scheduledForRef.current === key) return
    scheduledForRef.current = key

    void schedulePrayerReminders(times.prayers).then(setScheduled)
  }, [times, permission, today])

  const upcoming = times ? nextPrayer(times.prayers) : null

  const enableReminders = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  return (
    <HubContent>

      {/* Location gate — prayer times are astronomical, so they need coordinates. */}
      {!coords ? (
        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <MapPin size={18} color="#14b8a6" />
            <Text className="flex-1 text-sm font-medium text-foreground">
              Set your location
            </Text>
          </View>
          <Muted>Prayer times depend on where you are. Nothing leaves your device except the coordinates used to calculate them.</Muted>
          <Button onPress={resolve} loading={locationStatus === 'loading'}>
            Use my location
          </Button>
          {locationStatus === 'denied' ? (
            <Text className="text-xs text-destructive">
              Location permission was denied. Enable it in Settings to get prayer times.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {/* Next prayer */}
      {upcoming ? (
        <Card className="mt-3 gap-1 border-primary/30 bg-primary/5">
          <Muted className="text-xs">Next prayer</Muted>
          <Text className="text-xl font-semibold text-foreground">
            {LABEL[upcoming.name as PrayerName]} at {times?.prayers[upcoming.name as FardName]}
          </Text>
        </Card>
      ) : null}

      {/* Notification opt-in — the reason this is a native app. */}
      {coords && permission !== 'granted' ? (
        <Card className="mt-3 gap-3">
          <View className="flex-row items-center gap-2">
            <BellRing size={18} color="#f59e0b" />
            <Text className="flex-1 text-sm font-medium text-foreground">Adhan reminders</Text>
          </View>
          <Muted>
            Scheduled on your device, so they arrive exactly on time — even offline.
          </Muted>
          <Button onPress={enableReminders}>Enable reminders</Button>
        </Card>
      ) : null}

      {coords && permission === 'granted' && scheduled !== null ? (
        <View className="mt-3 flex-row items-center gap-2 px-1">
          <BellRing size={14} color="#10b981" />
          <Muted className="text-xs">
            {scheduled} reminder{scheduled === 1 ? '' : 's'} scheduled for today
          </Muted>
        </View>
      ) : null}

      {timesLoading ? (
        <View className="py-6">
          <ActivityIndicator />
        </View>
      ) : null}

      <View className="gap-3 pt-4">
        {PRAYERS.map((prayer) => (
          <PrayerRow
            key={prayer}
            prayer={prayer}
            time={
              prayer === 'tahajjud' ? undefined : times?.prayers[prayer as FardName]
            }
            current={statusByPrayer[prayer] ?? null}
            busy={upsert.isPending && upsert.variables?.prayer === prayer}
            // There is no "unset" — the web view ignores a cleared status too,
            // and writing 'missed' instead would tell the user they missed a
            // prayer they were only trying to re-tap.
            onChange={(status) => upsert.mutate({ date: today, prayer, status })}
          />
        ))}
      </View>
    </HubContent>
  )
}
