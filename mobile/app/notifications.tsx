import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native'
import { Stack, useFocusEffect, useRouter, type Href } from 'expo-router'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { BellOff, CheckSquare, Moon, Settings2, Sunrise, Timer, Bell } from 'lucide-react-native'
import { Screen, Muted, Card, Button, SectionHeader, FadeIn } from '~/components/ui'
import { hubHref } from '~/lib/nav'
import { relativeDay } from '~/lib/format'
import {
  getNotificationPermission,
  requestNotificationPermission,
  listScheduled,
  type NotificationPermission,
  type SalsabilNotificationData,
} from '~/lib/notifications'
import { notifyPermissionChanged } from '~/lib/notificationSync'
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'

// The bell on Home. Two things live here: the reminders already scheduled on
// this phone (so you can see what will ping you and when), and the activity
// your account has recorded (sessions finished, tasks done). Preferences are
// one tap away in the header.

type Upcoming = { id: string; at: Date; title: string; body: string; data: SalsabilNotificationData }

const KIND_ICON = {
  prayer: { Icon: Moon, bg: 'bg-noor-500/10', color: '#0d9488', dark: '#2dd4bf' },
  adhkar: { Icon: Sunrise, bg: 'bg-indigo-500/10', color: '#4f46e5', dark: '#818cf8' },
  focus: { Icon: Timer, bg: 'bg-noor-500/10', color: '#0d9488', dark: '#2dd4bf' },
  task: { Icon: CheckSquare, bg: 'bg-accentGreen-500/10', color: '#059669', dark: '#34d399' },
} as const

function iconFor(kind: string) {
  if (kind === 'adhkar') return KIND_ICON.adhkar
  if (kind === 'task' || kind === 'task_complete') return KIND_ICON.task
  if (kind === 'focus' || kind === 'focus_complete' || kind === 'focus-running') return KIND_ICON.focus
  return KIND_ICON.prayer
}

/** Where a web-style action_url lands in the native app. */
function hrefFor(url: string | null): Href | null {
  if (!url) return null
  const path = url.split('?')[0]
  const map: Record<string, Href> = {
    '/focus': hubHref('focus', 'timer'),
    '/tasks': hubHref('focus', 'tasks'),
    '/rooms': hubHref('focus', 'rooms'),
    '/prayers': hubHref('deen', 'prayers'),
    '/quran': hubHref('deen', 'quran'),
    '/adhkar': hubHref('deen', 'adhkar'),
    '/garden': hubHref('grow', 'garden'),
    '/challenges': hubHref('grow', 'challenges'),
    '/workouts': hubHref('grow', 'workouts'),
    '/analytics': hubHref('grow', 'analytics'),
    '/profile': '/profile',
  }
  return map[path] ?? null
}

function triggerDate(req: Notifications.NotificationRequest): Date | null {
  const t = req.trigger as { type?: string; value?: number; date?: number | string } | null
  if (!t) return null
  const v = t.value ?? t.date
  if (typeof v === 'number') return new Date(v)
  if (typeof v === 'string') return new Date(v)
  return null
}

function timeLabel(at: Date, today: string): string {
  const day = relativeDay(localDateString(at), today)
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()

  const [permission, setPermission] = useState<NotificationPermission>('undetermined')
  const [upcoming, setUpcoming] = useState<Upcoming[] | null>(null)
  const { data: feed, isLoading } = useNotifications()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  const load = useCallback(async () => {
    const p = await getNotificationPermission().catch(() => 'undetermined' as const)
    setPermission(p)
    if (p !== 'granted') {
      setUpcoming([])
      return
    }
    const scheduled = await listScheduled().catch(() => [])
    const rows = scheduled
      .map((req) => ({
        id: req.identifier,
        at: triggerDate(req),
        title: req.content.title ?? '',
        body: req.content.body ?? '',
        data: (req.content.data ?? {}) as SalsabilNotificationData,
      }))
      .filter((r): r is Upcoming => !!r.at && r.at.getTime() > Date.now())
      .sort((a, b) => a.at.getTime() - b.at.getTime())
    setUpcoming(rows)
  }, [])

  // Refresh whenever the screen is shown: reminders change as you use the app.
  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )
  useEffect(() => {
    void load()
  }, [load])

  const enable = async () => {
    const p = await requestNotificationPermission()
    setPermission(p)
    notifyPermissionChanged()
    if (p === 'denied') void Linking.openSettings()
    // Give the scheduler a moment to write the reminders before listing them.
    setTimeout(() => void load(), 800)
  }

  const unread = (feed ?? []).filter((n) => !n.read).length

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notification settings"
              hitSlop={8}
              onPress={() => router.push('/notification-settings' as Href)}
            >
              <Settings2 size={20} color="#14b8a6" />
            </Pressable>
          ),
        }}
      />
      <View className="gap-5 pb-8 pt-2">
        {permission !== 'granted' ? (
          <FadeIn index={0}>
            <Card variant="glass-noor" className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-noor-500/15">
                  <BellOff size={19} color={dark ? '#2dd4bf' : '#0d9488'} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground">Notifications are off</Text>
                  <Muted className="text-xs">Turn them on for prayer times, adhkar, focus sessions and task reminders.</Muted>
                </View>
              </View>
              <Button onPress={() => void enable()}>{permission === 'denied' ? 'Open settings' : 'Turn on notifications'}</Button>
            </Card>
          </FadeIn>
        ) : null}

        {/* Coming up on this phone */}
        <FadeIn index={1}>
          <View className="gap-3">
            <SectionHeader
              title="Coming up"
              action="Settings"
              onAction={() => router.push('/notification-settings' as Href)}
            />
            {upcoming === null ? (
              <ActivityIndicator />
            ) : upcoming.length === 0 ? (
              <Card variant="outline-dashed" className="items-center gap-1 py-6">
                <Bell size={18} color="#8a9793" />
                <Muted className="text-center text-xs">
                  {permission === 'granted'
                    ? 'Nothing scheduled. Set your location for prayer reminders, or give a task a time.'
                    : 'Reminders appear here once notifications are on.'}
                </Muted>
              </Card>
            ) : (
              <Card className="p-0">
                {upcoming.slice(0, 8).map((n, i) => {
                  const meta = iconFor(n.data.kind)
                  return (
                    <View key={n.id} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border')}>
                      <View className={cn('h-[34px] w-[34px] items-center justify-center rounded-[10px]', meta.bg)}>
                        <meta.Icon size={16} strokeWidth={1.75} color={dark ? meta.dark : meta.color} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Muted className="text-[11px]">{timeLabel(n.at, today)}</Muted>
                      </View>
                    </View>
                  )
                })}
                {upcoming.length > 8 ? (
                  <View className="border-t border-border px-4 py-2.5">
                    <Muted className="text-xs">and {upcoming.length - 8} more</Muted>
                  </View>
                ) : null}
              </Card>
            )}
          </View>
        </FadeIn>

        {/* Account activity */}
        <FadeIn index={2}>
          <View className="gap-3">
            <SectionHeader
              title="Activity"
              count={unread > 0 ? unread : undefined}
              action={unread > 0 ? 'Mark all read' : undefined}
              onAction={() => markAll.mutate()}
            />
            {isLoading ? (
              <ActivityIndicator />
            ) : (feed ?? []).length === 0 ? (
              <Card variant="outline-dashed" className="items-center py-6">
                <Muted className="text-xs">Finished sessions and completed tasks show up here.</Muted>
              </Card>
            ) : (
              <Card className="p-0">
                {(feed ?? []).slice(0, 20).map((n, i) => {
                  const meta = iconFor(n.type)
                  const href = hrefFor(n.action_url)
                  return (
                    <Pressable
                      key={n.id}
                      accessibilityRole="button"
                      onPress={() => {
                        void Haptics.selectionAsync()
                        if (!n.read) markRead.mutate(n.id)
                        if (href) router.push(href)
                      }}
                      className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 && 'border-t border-border')}
                    >
                      <View className={cn('mt-0.5 h-[34px] w-[34px] items-center justify-center rounded-[10px]', meta.bg)}>
                        <meta.Icon size={16} strokeWidth={1.75} color={dark ? meta.dark : meta.color} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className={cn('text-sm text-foreground', n.read ? 'font-medium' : 'font-semibold')} numberOfLines={1}>
                          {n.title}
                        </Text>
                        {n.body ? (
                          <Muted className="text-xs" numberOfLines={2}>
                            {n.body}
                          </Muted>
                        ) : null}
                        <Muted className="mt-0.5 text-[11px]">{timeLabel(new Date(n.created_at), today)}</Muted>
                      </View>
                      {!n.read ? <View className="mt-2 h-2 w-2 rounded-full bg-noor-500" /> : null}
                    </Pressable>
                  )
                })}
              </Card>
            )}
          </View>
        </FadeIn>
      </View>
    </Screen>
  )
}
