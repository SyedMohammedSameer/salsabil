import { useState } from 'react'
import { View, Text } from 'react-native'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { Screen, Heading, Muted, Button, Input, Card } from '~/components/ui'
import { signInWithEmail, signUpWithEmail, signInWithProvider } from '~/lib/auth'

type Mode = 'sign-in' | 'sign-up'

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The auth gate in app/_layout.tsx redirects away once a session lands, so
  // there is nothing to navigate to here on success.
  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email.trim(), password)
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim() || undefined)
      }
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

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center"
      >
        <View className="gap-2 pb-8">
          <Heading className="text-3xl">Salsabil</Heading>
          <Muted>Focus meets faith. Grow your garden, one session at a time.</Muted>
        </View>

        <Card className="gap-4">
          {mode === 'sign-up' ? (
            <Input
              label="Name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Your name"
            />
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            error={error}
          />

          <Button onPress={submit} loading={busy}>
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </Button>

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs text-muted-foreground">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <Button variant="outline" onPress={oauth} disabled={busy}>
            Continue with Google
          </Button>
        </Card>

        <View className="items-center pt-6">
          <Button
            variant="ghost"
            onPress={() => {
              setError(null)
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            }}
          >
            {mode === 'sign-in' ? 'No account? Sign up' : 'Already have an account? Sign in'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}
