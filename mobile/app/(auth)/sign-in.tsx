import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import Svg, { Defs, Pattern, Path, Circle, Rect } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native'
import { Gradient, Segmented, SHADOW } from '~/components/ui'
import { signInWithEmail, signUpWithEmail, signInWithProvider, sendPasswordReset } from '~/lib/auth'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'

// Sign in: a deep green header with a faint eight-point star lattice and the
// app icon, and a card overlapping it with a Sign in / Create account
// segment, icon-led fields, and Google. The auth gate in app/_layout.tsx
// redirects away once a session lands, so nothing navigates here on success.

type Mode = 'sign-in' | 'sign-up'

const HEADER = ['#023728', '#0b5c4c', '#0f766e'] as const

function StarLattice() {
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} width="100%" height="100%">
      <Defs>
        <Pattern id="star8" width={56} height={56} patternUnits="userSpaceOnUse">
          <Path
            d="M28 4l5.6 12.4L46 22l-12.4 5.6L28 40l-5.6-12.4L10 22l12.4-5.6z"
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.9}
            strokeOpacity={0.16}
          />
          <Circle cx={28} cy={22} r={2.2} fill="none" stroke="#ffffff" strokeWidth={0.7} strokeOpacity={0.16} />
          <Path d="M0 50h56M28 44v12" stroke="#ffffff" strokeWidth={0.5} strokeOpacity={0.1} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#star8)" />
    </Svg>
  )
}

function Field({
  icon,
  value,
  onChangeText,
  placeholder,
  secure,
  trailing,
  ...rest
}: {
  icon: React.ReactNode
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  secure?: boolean
  trailing?: React.ReactNode
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText' | 'placeholder'>) {
  return (
    <View className="h-[50px] flex-row items-center gap-2.5 rounded-[14px] border border-border bg-background px-3.5">
      {icon}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa8a4"
        secureTextEntry={secure}
        className="min-w-0 flex-1 text-[15px] text-foreground"
        {...rest}
      />
      {trailing}
    </View>
  )
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resetting, setResetting] = useState(false)

  const submit = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      if (mode === 'sign-in') await signInWithEmail(email.trim(), password)
      else await signUpWithEmail(email.trim(), password, displayName.trim() || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const oauth = async () => {
    setError(null)
    setBusy(true)
    try {
      await signInWithProvider('google')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in with Google.')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Reset.')
      return
    }
    setResetting(true)
    try {
      await sendPasswordReset(email.trim())
      toast.success('Check your inbox for a reset link.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.')
    } finally {
      setResetting(false)
    }
  }

  const muted = '#8a9793'

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <Gradient
            colors={HEADER}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 26, paddingHorizontal: 24, paddingBottom: 96 }}
          >
            <StarLattice />
            {/* The app icon. Its artwork has generous padding for the launcher
                masks, so it is shown enlarged inside a 64pt tile to keep the
                mark legible. */}
            <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-white/30" style={SHADOW.lg}>
              <Image
                source={require('../../assets/icon.png')}
                accessibilityLabel="Salsabil"
                style={{ width: 118, height: 118 }}
              />
            </View>
            <Text className="mt-4 text-[34px] font-bold leading-[38px] tracking-tight text-white">Salsabil</Text>
            <Text className="mt-1 text-[20px] text-white/90" style={{ fontFamily: 'Amiri', writingDirection: 'rtl', textAlign: 'left' }}>
              سَلْسَبِيل
            </Text>
            <Text className="mt-2.5 max-w-[300px] text-sm leading-5 text-white/85">
              A spring in Paradise. Prayers, Quran, focus and tasks, one garden.
            </Text>
          </Gradient>

          {/* Card */}
          <View className="px-5" style={{ marginTop: -72 }}>
            <View className="gap-3.5 rounded-3xl border border-border bg-card p-5" style={SHADOW.lg}>
              <Segmented
                options={[
                  { value: 'sign-in', label: 'Sign in' },
                  { value: 'sign-up', label: 'Create account' },
                ]}
                value={mode}
                onChange={(m) => {
                  setError(null)
                  setMode(m)
                }}
              />

              {mode === 'sign-up' ? (
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-muted-foreground">Name</Text>
                  <Field
                    icon={<User size={18} color={muted} />}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>
              ) : null}

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-muted-foreground">Email</Text>
                <Field
                  icon={<Mail size={18} color={muted} />}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-muted-foreground">Password</Text>
                <Field
                  icon={<Lock size={18} color={muted} />}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secure={!showPassword}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      hitSlop={8}
                      onPress={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <Eye size={18} color={muted} /> : <EyeOff size={18} color={muted} />}
                    </Pressable>
                  }
                />
              </View>

              {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={() => void submit()}
                className="h-[52px] items-center justify-center rounded-[14px] bg-primary"
                style={[
                  { shadowColor: '#00a188', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 4 },
                  busy ? { opacity: 0.6 } : null,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-semibold text-white">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</Text>
                )}
              </Pressable>

              <View className="flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text className="text-xs text-muted-foreground">or</Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                disabled={busy}
                onPress={() => void oauth()}
                className={cn('h-[50px] flex-row items-center justify-center gap-2.5 rounded-[14px] border border-border bg-card', busy && 'opacity-60')}
              >
                <GoogleMark />
                <Text className="text-[15px] font-semibold text-foreground">Continue with Google</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1" />
          <SafeAreaView edges={['bottom']} className="items-center px-6 pb-4 pt-6">
            {mode === 'sign-in' ? (
              <Pressable accessibilityRole="button" onPress={() => void reset()} disabled={resetting} className="flex-row items-center gap-1">
                <Text className="text-[13px] text-muted-foreground">Forgot your password?</Text>
                {resetting ? (
                  <ActivityIndicator size="small" color={dark ? '#2dd4bf' : '#0d9488'} />
                ) : (
                  <Text className="text-[13px] font-semibold text-noor-600 dark:text-noor-400">Reset it</Text>
                )}
              </Pressable>
            ) : (
              <Text className="text-center text-[12px] leading-[18px] text-muted-foreground">
                By creating an account you agree to our privacy policy, available in Settings once you are in.
              </Text>
            )}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  )
}
