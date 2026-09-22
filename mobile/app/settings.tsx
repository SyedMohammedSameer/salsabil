import { useCallback, useState, type ReactNode } from 'react'
import { View, Text, Pressable, Platform, Alert } from 'react-native'
import { useFocusEffect, useRouter, type Href } from 'expo-router'
import { useColorScheme } from 'nativewind'
import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import {
  BellRing,
  Moon,
  Sun,
  Smartphone,
  LogOut,
  Trash2,
  Palette,
  MapPin,
  User,
  Shield,
  Info,
  ChevronRight,
} from 'lucide-react-native'
import { Screen, Muted, Card, FadeIn } from '~/components/ui'
import { useTheme, type Theme } from '~/lib/theme'
import { hubHref } from '~/lib/nav'
import {
  getNotificationPermission,
  listScheduled,
  type NotificationPermission,
} from '~/lib/notifications'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { deleteOwnAccount } from '@/lib/api/profile'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'

// Settings as grouped lists. Ported from src/views/settings/SettingsView.tsx
// with one substitution: the web manages a Web Push subscription; native
// schedules reminders on the device, so this exposes the OS permission and
// what is scheduled instead.

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Auto', Icon: Smartphone },
]

function Row({
  icon,
  tint,
  title,
  sub,
  onPress,
  trailing,
  first,
  danger,
}: {
  icon: ReactNode
  tint: string
  title: string
  sub?: string
  onPress?: () => void
  trailing?: ReactNode
  first?: boolean
  danger?: boolean
}) {
  const body = (
    <View className={cn('flex-row items-center gap-3 px-3.5 py-3', !first && 'border-t border-border')}>
      <View className={cn('h-[34px] w-[34px] items-center justify-center rounded-[10px]', tint)}>{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className={cn('text-[14px] font-medium', danger ? 'text-danger-500' : 'text-foreground')}>{title}</Text>
        {sub ? <Muted className="text-[11px]">{sub}</Muted> : null}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={18} color="#8a9793" /> : null)}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
    >
      {body}
    </Pressable>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { theme, setTheme } = useTheme()
  const { signOut, user } = useAuth()
  const { data: profile } = useProfile()

  const [permission, setPermission] = useState<NotificationPermission>('undetermined')
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const refresh = async () => {
    const p = await getNotificationPermission()
    setPermission(p)
    if (p === 'granted') {
      const scheduled = await listScheduled()
      setScheduledCount(scheduled.length)
    } else {
      setScheduledCount(null)
    }
  }

  // Re-read on every visit: permission and schedule change on the Reminders screen.
  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, []),
  )


  // App Store Review Guideline 5.1.1(v) requires in-app account deletion for any
  // app offering account creation. Two steps, because this cannot be undone.
  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account and everything in it: prayers, Quran and adhkar logs, tasks, focus sessions, your garden and your coins. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Really delete?', 'There is no way to recover this.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true)
                  try {
                    // Signs out on success, which drops the route gate back to
                    // the auth stack.
                    await deleteOwnAccount()
                  } catch (e) {
                    setDeleting(false)
                    toast.error(e instanceof Error ? e.message : 'Could not delete your account.')
                  }
                },
              },
            ])
          },
        },
      ],
    )
  }

  const version = Constants.expoConfig?.version ?? '1.0.0'
  const reminderSub =
    permission === 'granted'
      ? scheduledCount !== null
        ? `Prayers, adhkar, focus and tasks · ${scheduledCount} scheduled`
        : 'Prayers, adhkar, focus and tasks'
      : permission === 'denied'
        ? `Turned off. Open ${Platform.OS === 'ios' ? 'Settings' : 'app settings'} to allow`
        : 'Off. Tap to choose what reminds you'

  return (
    <Screen>
      <View className="gap-4 pb-8 pt-2">
        <FadeIn index={0}>
          <Card className="p-0">
            <Row
              first
              icon={<Palette size={17} color={dark ? '#818cf8' : '#6366f1'} />}
              tint="bg-indigo-500/10"
              title="Appearance"
              trailing={
                <View className="flex-row rounded-[10px] bg-muted p-[3px]" style={{ gap: 3 }}>
                  {THEMES.map(({ value, label, Icon }) => {
                    const active = theme === value
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${label} theme`}
                        onPress={() => {
                          void Haptics.selectionAsync()
                          setTheme(value)
                        }}
                        className={cn('flex-row items-center gap-1 rounded-lg px-2.5 py-1.5', active && 'bg-card')}
                        style={active ? { elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } } : undefined}
                      >
                        <Icon size={12} color={active ? (dark ? '#f5f5f5' : '#0a0a0a') : '#8a9793'} />
                        <Text className={cn('text-[11px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              }
            />
            <Row
              icon={<BellRing size={17} color={dark ? '#fbbf24' : '#f59e0b'} />}
              tint="bg-warn-500/10"
              title="Reminders"
              sub={reminderSub}
              onPress={() => router.push('/notification-settings' as Href)}
            />
            <Row
              icon={<MapPin size={17} color={dark ? '#2dd4bf' : '#0d9488'} />}
              tint="bg-noor-500/10"
              title="Prayer times"
              sub="From your location · ISNA calculation"
              onPress={() => router.push(hubHref('deen', 'prayers'))}
            />
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <Card className="p-0">
            <Row
              first
              icon={<User size={17} color={dark ? '#2dd4bf' : '#0d9488'} />}
              tint="bg-noor-500/10"
              title="Profile"
              sub={[profile?.display_name, profile?.username ? `@${profile.username}` : null].filter(Boolean).join(' · ') || user?.email}
              onPress={() => router.push('/profile')}
            />
            <Row
              icon={<Shield size={17} color={dark ? '#2dd4bf' : '#0d9488'} />}
              tint="bg-noor-500/10"
              title="Privacy policy"
              sub="What we store and why"
              onPress={() => router.push('/privacy')}
            />
            <Row
              icon={<Info size={17} color="#8a9793" />}
              tint="bg-muted"
              title="About Salsabil"
              sub={`Version ${version} · Focus meets faith`}
            />
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <Card className="p-0">
            <Row
              first
              icon={<LogOut size={17} color="#8a9793" />}
              tint="bg-muted"
              title="Sign out"
              sub="Your data stays in your account"
              onPress={() => {
                Alert.alert('Sign out?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', onPress: () => void signOut() },
                ])
              }}
              trailing={<View />}
            />
            <Row
              icon={<Trash2 size={17} color="#ef4444" />}
              tint="bg-danger-500/10"
              title={deleting ? 'Deleting…' : 'Delete account'}
              sub="Permanent. Cannot be undone."
              onPress={deleting ? undefined : confirmDelete}
              trailing={<View />}
              danger
            />
          </Card>
        </FadeIn>
      </View>
    </Screen>
  )
}
