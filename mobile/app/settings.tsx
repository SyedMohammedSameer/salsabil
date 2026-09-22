import { useEffect, useState } from 'react'
import { View, Text, Pressable, Switch, Linking, Platform, Alert } from 'react-native'
import { BellRing, Moon, Sun, Smartphone, LogOut, ExternalLink, Trash2 } from 'lucide-react-native'
import { Screen, Heading, Muted, Card, Button } from '~/components/ui'
import { useTheme, type Theme } from '~/lib/theme'
import {
  getNotificationPermission,
  requestNotificationPermission,
  listScheduled,
  type NotificationPermission,
} from '~/lib/notifications'
import { useAuth } from '@/hooks/useAuth'
import { deleteOwnAccount } from '@/lib/api/profile'
import { toast } from '@/lib/platform/toast'

// Ported from src/views/settings/SettingsView.tsx, with one deliberate
// substitution: the web screen manages a Web Push subscription (VAPID key,
// service worker, push_subscriptions row). None of that exists on native, where
// reminders are scheduled on-device, so this exposes the OS permission and what
// is currently scheduled instead.

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Smartphone },
]

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme()
  const { signOut, user } = useAuth()

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

  useEffect(() => {
    void refresh()
  }, [])

  const enable = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    await refresh()
  }

  // App Store Review Guideline 5.1.1(v) requires in-app account deletion for any
  // app offering account creation — an email address to write to is explicitly
  // not sufficient. Two steps, because this cannot be undone.
  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account and everything in it — prayers, ' +
        'Quran and adhkar logs, tasks, focus sessions, your garden and your coins. ' +
        'It cannot be undone.',
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
                    toast.error(
                      e instanceof Error ? e.message : 'Could not delete your account.',
                    )
                  }
                },
              },
            ])
          },
        },
      ],
    )
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Heading>Settings</Heading>
        <Muted>{user?.email}</Muted>
      </View>

      {/* Appearance */}
      <Card className="gap-3">
        <Text className="text-sm font-medium text-foreground">Appearance</Text>
        <View className="flex-row gap-2">
          {THEMES.map(({ value, label, Icon }) => {
            const active = theme === value
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTheme(value)}
                className="flex-1 items-center gap-1.5 rounded-lg border py-3"
                style={{
                  borderColor: active ? '#14b8a6' : 'transparent',
                  backgroundColor: active ? 'rgba(20,184,166,0.1)' : 'rgba(127,127,127,0.08)',
                }}
              >
                <Icon size={16} color={active ? '#14b8a6' : '#83938f'} />
                <Text
                  className="text-[11px]"
                  style={{ color: active ? '#14b8a6' : '#83938f' }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      {/* Notifications */}
      <Card className="mt-3 gap-3">
        <View className="flex-row items-center gap-2">
          <BellRing size={16} color="#f59e0b" />
          <Text className="flex-1 text-sm font-medium text-foreground">Reminders</Text>
          <Switch
            value={permission === 'granted'}
            // Once the OS has been answered the app cannot revoke or re-ask;
            // that is a Settings trip, so do not pretend the switch can undo it.
            disabled={permission === 'granted' || permission === 'denied'}
            onValueChange={() => void enable()}
            trackColor={{ true: '#14b8a6', false: '#83938f' }}
          />
        </View>

        <Muted className="text-xs">
          Prayer times and focus sessions are scheduled on this device, so they arrive exactly on
          time — even with no connection.
        </Muted>

        {permission === 'granted' && scheduledCount !== null ? (
          <Muted className="text-xs">
            {scheduledCount} notification{scheduledCount === 1 ? '' : 's'} scheduled.
          </Muted>
        ) : null}

        {permission === 'denied' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Linking.openSettings()
            }}
            className="flex-row items-center gap-1.5"
          >
            <Text className="text-xs text-primary">
              Notifications are turned off. Open {Platform.OS === 'ios' ? 'Settings' : 'app settings'}
            </Text>
            <ExternalLink size={12} color="#14b8a6" />
          </Pressable>
        ) : null}
      </Card>

      {/* About */}
      <Card className="mt-3 gap-1">
        <Text className="text-sm font-medium text-foreground">Salsabil</Text>
        <Muted className="text-xs">
          Focus meets faith. Prayers, Quran, adhkar, focus and tasks all grow the same garden.
        </Muted>
      </Card>

      <View className="pt-6">
        <Button variant="outline" onPress={signOut}>
          Sign out
        </Button>
      </View>

      <View className="flex-row items-center justify-center gap-1.5 pt-4">
        <LogOut size={12} color="#83938f" />
        <Muted className="text-[10px]">Your data stays in your account.</Muted>
      </View>

      {/* Danger zone */}
      <Card className="mt-8 gap-3 border-destructive/30">
        <View className="flex-row items-center gap-2">
          <Trash2 size={16} color="#ef4444" />
          <Text className="flex-1 text-sm font-medium text-foreground">Delete account</Text>
        </View>
        <Muted className="text-xs">
          Permanently removes your account and everything in it. This cannot be undone.
        </Muted>
        <Button variant="destructive" onPress={confirmDelete} loading={deleting}>
          Delete my account
        </Button>
      </Card>
    </Screen>
  )
}
