import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import 'react-native-url-polyfill/auto'
import '../global.css'

import { Providers } from '~/lib/providers'
import { bindAuthRefreshToAppState, createSessionFromUrl } from '~/lib/auth'
import { useTheme } from '~/lib/theme'
import { useAuth } from '@/hooks/useAuth'

void SplashScreen.preventAutoHideAsync()

/**
 * Route gate. Equivalent to the web's ProtectedRoute, but expressed as a
 * redirect effect because expo-router has no element-level route guards.
 */
function AuthGate() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const { ready: themeReady } = useTheme()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/')
    }
  }, [session, loading, segments, router])

  useEffect(() => {
    if (!loading && themeReady) void SplashScreen.hideAsync()
  }, [loading, themeReady])

  return (
    <Stack
      screenOptions={{
        // Secondary screens are pushed onto this stack from the More sheet, so
        // they need a header to get a back affordance. Android's hardware back
        // works either way, but nothing on screen said so.
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: dark ? '#070c0b' : '#ffffff' },
        headerTintColor: '#14b8a6',
        headerTitleStyle: { color: dark ? '#f5f5f5' : '#0a0a0a' },
      }}
    >
      {/* These own their own chrome. */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="rooms/[id]" options={{ headerShown: false }} />

      <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Stack.Screen name="quran" options={{ title: 'Quran' }} />
      <Stack.Screen name="adhkar" options={{ title: 'Adhkar' }} />
      <Stack.Screen name="workouts" options={{ title: 'Workouts' }} />
      <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
      <Stack.Screen name="garden" options={{ title: 'Garden' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="rooms/index" options={{ title: 'Study Rooms' }} />
    </Stack>
  )
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme()

  useEffect(() => bindAuthRefreshToAppState(), [])

  // OAuth deep links. A cold start arrives via getInitialURL; a warm one via
  // the 'url' event. Both must be handled or sign-in silently does nothing.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url || !url.includes('auth-callback')) return
      void createSessionFromUrl(url).catch(() => {
        /* surfaced to the user by the sign-in screen's own error state */
      })
    }

    void Linking.getInitialURL().then(handle)
    const sub = Linking.addEventListener('url', ({ url }) => handle(url))
    return () => sub.remove()
  }, [])

  return (
    <Providers>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthGate />
    </Providers>
  )
}
