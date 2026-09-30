import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as Haptics from 'expo-haptics'
import { AtSign, Check, MapPin, BellRing, Sparkles, Moon, Timer, Sprout, X } from 'lucide-react-native'
import { Gradient, Button, Muted, SHADOW } from '~/components/ui'
import { useDeviceLocation } from '~/lib/location'
import { requestNotificationPermission } from '~/lib/notifications'
import { notifyPermissionChanged } from '~/lib/notificationSync'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { checkUsernameAvailable } from '@/lib/api/profile'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

// First run, after sign-in. A username is required (the web asks for one
// too); location and notifications are offered with a clear skip. Finishing
// marks the profile onboarded, which is what the route gate checks.

const HEADER = ['#023728', '#0b5c4c', '#0f766e'] as const
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

type Step = 'welcome' | 'username' | 'location' | 'notifications' | 'noor'

export default function OnboardingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const { coords, status: locationStatus, resolve } = useDeviceLocation()

  const needsUsername = !profile?.username
  const steps: Step[] = useMemo(
    () => ['welcome', ...(needsUsername ? (['username'] as Step[]) : []), 'location', 'notifications', 'noor'],
    // The list is fixed once shown, so saving the username does not skip a step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.id],
  )
  const [index, setIndex] = useState(0)
  const step = steps[Math.min(index, steps.length - 1)]
  const next = () => {
    void Haptics.selectionAsync()
    setIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  // Username
  const suggestion = (user?.email?.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (profile && !username) setUsername(profile.username ?? suggestion)
    if (profile && !displayName) setDisplayName(profile.display_name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Check availability as the user types, debounced.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    setAvailable(null)
    if (!USERNAME_RE.test(username)) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setChecking(true)
      checkUsernameAvailable(username)
        .then(setAvailable)
        .catch(() => setAvailable(null))
        .finally(() => setChecking(false))
    }, 400)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [username])

  const saveUsername = () => {
    setError(null)
    if (!USERNAME_RE.test(username)) return setError('3 to 20 characters: lowercase letters, numbers and _.')
    if (available === false) return setError('That username is taken. Try another.')
    update.mutate(
      { username, display_name: displayName.trim() || null },
      {
        onSuccess: next,
        onError: () => setError('That username may already be taken. Try another.'),
      },
    )
  }

  const finish = () => {
    update.mutate(
      { onboarded: true },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.replace('/')
        },
      },
    )
  }

  const hero: Record<Step, { icon: React.ReactNode; title: string; sub: string }> = {
    welcome: {
      icon: (
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border border-white/30" style={SHADOW.lg}>
          <Image source={require('../assets/icon.png')} style={{ width: 140, height: 140 }} />
        </View>
      ),
      title: 'Welcome to Salsabil',
      sub: 'Focus meets faith. Your prayers, Quran, tasks and focus in one calm place.',
    },
    username: { icon: <AtSign size={44} color="#ffffff" strokeWidth={1.5} />, title: 'Pick a username', sub: 'It is how people find you in study rooms.' },
    location: { icon: <MapPin size={44} color="#ffffff" strokeWidth={1.5} />, title: 'Prayer times', sub: 'Salsabil calculates them from where you are, on your phone.' },
    notifications: { icon: <BellRing size={44} color="#ffffff" strokeWidth={1.5} />, title: 'Gentle reminders', sub: 'For each prayer, your adhkar, focus sessions and tasks. You choose which.' },
    noor: { icon: <Sparkles size={44} color="#ffffff" strokeWidth={1.5} />, title: 'Meet Noor', sub: 'Your companion in the middle of the tab bar. Ask it anything, or tell it what to do.' },
  }
  const h = hero[step]

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <Gradient colors={HEADER} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} orbs style={{ flex: 1 }}>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              {/* Progress */}
              <View className="flex-row justify-center gap-1.5 pt-4">
                {steps.map((s, i) => (
                  <View key={s} className={cn('h-1.5 rounded-full', i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/35')} />
                ))}
              </View>

              <View className="flex-1 items-center justify-center gap-4 px-8 py-10">
                {h.icon}
                <Text className="text-center text-[28px] font-bold tracking-tight text-white">{h.title}</Text>
                <Text className="text-center text-[15px] leading-[22px] text-white/80">{h.sub}</Text>
              </View>

              <View className="mx-4 mb-4 gap-4 rounded-[28px] bg-card p-5" style={SHADOW.lg}>
                {step === 'welcome' ? (
                  <>
                    {[
                      { Icon: Moon, text: 'Log prayers, Quran and adhkar' },
                      { Icon: Timer, text: 'Focus sessions that grow a garden' },
                      { Icon: Sprout, text: 'Coins for every good habit' },
                    ].map(({ Icon, text }) => (
                      <View key={text} className="flex-row items-center gap-3">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-noor-500/10">
                          <Icon size={18} color="#0d9488" />
                        </View>
                        <Text className="flex-1 text-[15px] text-foreground">{text}</Text>
                      </View>
                    ))}
                    <Button onPress={next}>Get started</Button>
                  </>
                ) : step === 'username' ? (
                  <>
                    <View className="gap-1.5">
                      <Text className="text-sm font-medium text-foreground">Username</Text>
                      <View className="h-12 flex-row items-center gap-2 rounded-xl border border-input bg-card px-3">
                        <AtSign size={16} color="#8a9793" />
                        <TextInput
                          value={username}
                          onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder="yourname"
                          placeholderTextColor="#83938f"
                          accessibilityLabel="Username"
                          className="flex-1 text-base text-foreground"
                        />
                        {checking ? (
                          <ActivityIndicator size="small" />
                        ) : available === true ? (
                          <Check size={18} color="#10b981" />
                        ) : available === false ? (
                          <X size={18} color="#ef4444" />
                        ) : null}
                      </View>
                      <Muted className={cn('text-xs', available === false && 'text-danger-500')}>
                        {available === false ? 'Taken. Try another.' : 'Lowercase letters, numbers and _, 3 to 20 characters.'}
                      </Muted>
                    </View>
                    <View className="gap-1.5">
                      <Text className="text-sm font-medium text-foreground">Your name (optional)</Text>
                      <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="How should Noor greet you?"
                        placeholderTextColor="#83938f"
                        maxLength={50}
                        className="h-12 rounded-xl border border-input bg-card px-3 text-base text-foreground"
                      />
                    </View>
                    {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
                    <Button onPress={saveUsername} loading={update.isPending} disabled={!USERNAME_RE.test(username) || available === false}>
                      Continue
                    </Button>
                  </>
                ) : step === 'location' ? (
                  <>
                    {coords ? (
                      <View className="flex-row items-center gap-2 rounded-xl bg-accentGreen-500/10 px-3.5 py-3">
                        <Check size={16} color="#10b981" />
                        <Text className="flex-1 text-sm text-foreground">Location set. Prayer times are ready.</Text>
                      </View>
                    ) : (
                      <Muted className="text-sm">
                        Only the coordinates are used, to calculate the times. You can change this later on Deen.
                      </Muted>
                    )}
                    {locationStatus === 'denied' ? (
                      <Text className="text-xs text-destructive">Location was not allowed. You can enable it later in Settings.</Text>
                    ) : null}
                    {coords ? (
                      <Button onPress={next}>Continue</Button>
                    ) : (
                      <Button onPress={() => void resolve()} loading={locationStatus === 'loading'}>
                        Use my location
                      </Button>
                    )}
                    {!coords ? (
                      <Pressable onPress={next} className="items-center py-1">
                        <Text className="text-sm font-medium text-muted-foreground">Not now</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : step === 'notifications' ? (
                  <>
                    <Muted className="text-sm">Reminders are scheduled on your phone, so they arrive on time, even offline.</Muted>
                    <Button
                      onPress={async () => {
                        await requestNotificationPermission().catch(() => undefined)
                        notifyPermissionChanged()
                        next()
                      }}
                    >
                      Turn on reminders
                    </Button>
                    <Pressable onPress={next} className="items-center py-1">
                      <Text className="text-sm font-medium text-muted-foreground">Not now</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {['"What\'s left for today?"', '"I just prayed Asr"', '"Start a 45 minute focus session"'].map((q) => (
                      <View key={q} className="rounded-2xl bg-muted px-3.5 py-2.5">
                        <Text className="text-[14px] text-foreground">{q}</Text>
                      </View>
                    ))}
                    <Button onPress={finish} loading={update.isPending}>
                      Start using Salsabil
                    </Button>
                  </>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Gradient>
    </View>
  )
}
