import { useCallback, useState, type ReactNode } from 'react'
import { View, Text, Pressable, Switch, Platform, Linking } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { BellRing, CheckSquare, Moon, Sunrise, Timer, Pin, MapPin, Send } from 'lucide-react-native'
import { Screen, Muted, Card, Button, FadeIn } from '~/components/ui'
import {
  useNotificationPrefs,
  PRAYER_LEADS,
  TASK_LEADS,
  leadLabel,
} from '~/lib/notificationPrefs'
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '~/lib/notifications'
import { notifyPermissionChanged } from '~/lib/notificationSync'
import { useDeviceLocation } from '~/lib/location'
import { hubHref } from '~/lib/nav'
import { FARD_ORDER, type FardName } from '@/lib/api/prayerTimes'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'

// Which reminders this phone gives you. Everything is scheduled on the device,
// so a change here takes effect straight away and needs no network.

const PRAYER_LABEL: Record<FardName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-[12px] font-semibold uppercase tracking-[1px] text-muted-foreground">{title}</Text>
      <Card className="p-0">{children}</Card>
    </View>
  )
}

function ToggleRow({
  icon,
  tint,
  title,
  sub,
  value,
  onChange,
  first,
  disabled,
}: {
  icon: ReactNode
  tint: string
  title: string
  sub?: string
  value: boolean
  onChange: (v: boolean) => void
  first?: boolean
  disabled?: boolean
}) {
  return (
    <View className={cn('flex-row items-center gap-3 px-3.5 py-3', !first && 'border-t border-border')} style={disabled ? { opacity: 0.5 } : undefined}>
      <View className={cn('h-[34px] w-[34px] items-center justify-center rounded-[10px]', tint)}>{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-medium text-foreground">{title}</Text>
        {sub ? <Muted className="text-[11px]">{sub}</Muted> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          void Haptics.selectionAsync()
          onChange(v)
        }}
        trackColor={{ true: '#14b8a6', false: '#c4cfcc' }}
      />
    </View>
  )
}

/** A row of choice pills under a toggle, e.g. how early to remind. */
function PillRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
  multi,
}: {
  label: string
  options: readonly T[]
  value: T | Record<string, boolean>
  onChange: (v: T) => void
  format: (v: T) => string
  multi?: boolean
}) {
  return (
    <View className="gap-2 border-t border-border px-3.5 py-3">
      <Muted className="text-[11px] font-medium">{label}</Muted>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = multi ? (value as Record<string, boolean>)[String(o)] !== false : value === o
          return (
            <Pressable
              key={String(o)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                void Haptics.selectionAsync()
                onChange(o)
              }}
              className={cn(
                'rounded-full border px-3 py-1.5',
                active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted',
              )}
            >
              <Text className={cn('text-xs font-semibold', active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                {format(o)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function NotificationSettingsScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { prefs, update } = useNotificationPrefs()
  const { coords } = useDeviceLocation()
  const [permission, setPermission] = useState<NotificationPermission>('undetermined')

  useFocusEffect(
    useCallback(() => {
      void getNotificationPermission()
        .then(setPermission)
        .catch(() => undefined)
    }, []),
  )

  const enable = async () => {
    const p = await requestNotificationPermission()
    setPermission(p)
    notifyPermissionChanged()
    if (p === 'denied') void Linking.openSettings()
  }

  const sendTest = async () => {
    if (permission !== 'granted') {
      await enable()
      return
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Salsabil test notification',
        body: 'Notifications are working. You can lock your phone; this arrives in five seconds.',
        sound: 'default',
        data: { kind: 'test' },
        ...(Platform.OS === 'android' ? { channelId: 'focus' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        ...(Platform.OS === 'android' ? { channelId: 'focus' } : {}),
      },
    })
    toast.success('Test notification in five seconds')
  }

  const icon = (Icon: typeof Moon, light: string, darkC: string) => <Icon size={17} color={dark ? darkC : light} />
  const off = permission !== 'granted'

  return (
    <Screen>
      <View className="gap-5 pb-10 pt-2">
        <FadeIn index={0}>
          <Card variant={off ? 'glass-noor' : 'default'} className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-noor-500/15">
                <BellRing size={19} color={dark ? '#2dd4bf' : '#0d9488'} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14px] font-semibold text-foreground">
                  {off ? 'Notifications are off' : 'Notifications are on'}
                </Text>
                <Muted className="text-xs">
                  {off
                    ? permission === 'denied'
                      ? `Allow them for Salsabil in your phone's ${Platform.OS === 'ios' ? 'Settings' : 'app settings'}.`
                      : 'Allow notifications to get the reminders below.'
                    : 'Scheduled on this phone. They arrive on time, even offline.'}
                </Muted>
              </View>
            </View>
            {off ? (
              <Button onPress={() => void enable()}>{permission === 'denied' ? 'Open settings' : 'Turn on notifications'}</Button>
            ) : (
              <Button variant="outline" size="sm" icon={<Send size={14} color={dark ? '#2dd4bf' : '#0d9488'} />} onPress={() => void sendTest()}>
                Send a test notification
              </Button>
            )}
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <Group title="Prayers">
            <ToggleRow
              first
              icon={icon(Moon, '#0d9488', '#2dd4bf')}
              tint="bg-noor-500/10"
              title="Prayer reminders"
              sub={coords ? 'At each prayer time, from your location' : 'Needs your location to know the times'}
              value={prefs.prayers}
              onChange={(v) => update({ prayers: v })}
              disabled={off}
            />
            {prefs.prayers && !off ? (
              <>
                <PillRow
                  label="Which prayers"
                  options={FARD_ORDER}
                  value={prefs.prayerOn}
                  multi
                  format={(p) => PRAYER_LABEL[p]}
                  onChange={(p) => update({ prayerOn: { ...prefs.prayerOn, [p]: !prefs.prayerOn[p] } })}
                />
                <PillRow
                  label="When"
                  options={PRAYER_LEADS}
                  value={prefs.prayerLead}
                  format={leadLabel}
                  onChange={(m) => update({ prayerLead: m })}
                />
              </>
            ) : null}
            <ToggleRow
              icon={icon(Sunrise, '#4f46e5', '#818cf8')}
              tint="bg-indigo-500/10"
              title="Adhkar reminders"
              sub="Morning after Fajr, evening after Asr"
              value={prefs.adhkar}
              onChange={(v) => update({ adhkar: v })}
              disabled={off}
            />
            {!coords && !off ? (
              <Pressable
                onPress={() => router.push(hubHref('deen', 'prayers'))}
                className="flex-row items-center gap-2 border-t border-border px-3.5 py-3"
              >
                <MapPin size={14} color={dark ? '#2dd4bf' : '#0d9488'} />
                <Text className="text-xs font-semibold text-noor-600 dark:text-noor-400">Set your location on Deen</Text>
              </Pressable>
            ) : null}
          </Group>
        </FadeIn>

        <FadeIn index={2}>
          <Group title="Focus">
            <ToggleRow
              first
              icon={icon(Timer, '#0d9488', '#2dd4bf')}
              tint="bg-noor-500/10"
              title="Session finished"
              sub="A chime and a notification when time is up"
              value={prefs.focusEnd}
              onChange={(v) => update({ focusEnd: v })}
              disabled={off}
            />
            {Platform.OS === 'android' ? (
              <ToggleRow
                icon={icon(Pin, '#0d9488', '#2dd4bf')}
                tint="bg-noor-500/10"
                title="Show while running"
                sub="Keeps the session in your notification tray"
                value={prefs.focusOngoing}
                onChange={(v) => update({ focusOngoing: v })}
                disabled={off}
              />
            ) : null}
          </Group>
        </FadeIn>

        <FadeIn index={3}>
          <Group title="Tasks">
            <ToggleRow
              first
              icon={icon(CheckSquare, '#059669', '#34d399')}
              tint="bg-accentGreen-500/10"
              title="Task reminders"
              sub="For tasks that have a due time"
              value={prefs.tasks}
              onChange={(v) => update({ tasks: v })}
              disabled={off}
            />
            {prefs.tasks && !off ? (
              <PillRow
                label="When"
                options={TASK_LEADS}
                value={prefs.taskLead}
                format={(m) => (m === 0 ? 'At due time' : leadLabel(m))}
                onChange={(m) => update({ taskLead: m })}
              />
            ) : null}
          </Group>
        </FadeIn>
      </View>
    </Screen>
  )
}
