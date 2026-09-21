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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="rooms/[id]" options={{ headerShown: true, title: 'Study Room' }} />
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
