// Native authentication helpers.
//
// The AuthProvider / useAuth contract itself is shared with the web app
// (@/hooks/useAuth) — it is written with createElement rather than JSX and
// touches no DOM, so it runs unchanged here. What differs on native is:
//
//   * OAuth has no page redirect. The provider opens in a system browser and
//     returns through the salsabil:// deep link, which we exchange for a
//     session by hand.
//   * Token auto-refresh must follow app foreground/background state. Without
//     this the refresh timer keeps firing while the app is suspended, and the
//     session can silently expire.

import { AppState, type AppStateStatus } from 'react-native'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'
import type { Provider } from '@supabase/supabase-js'

// Required so the system browser hands control back to the app on iOS.
WebBrowser.maybeCompleteAuthSession()

const redirectTo =
  (Constants.expoConfig?.extra?.authCallbackUrl as string | undefined) ??
  Linking.createURL('auth-callback')

/**
 * Start Supabase's auto-refresh loop and keep it tied to app state.
 *
 * Call once from the root layout. Returns an unsubscribe function.
 */
export function bindAuthRefreshToAppState(): () => void {
  const handle = (state: AppStateStatus) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh()
    } else {
      void supabase.auth.stopAutoRefresh()
    }
  }

  handle(AppState.currentState)
  const sub = AppState.addEventListener('change', handle)
  return () => sub.remove()
}

/**
 * Exchange an OAuth callback deep link for a session.
 *
 * Supabase returns the tokens in the URL fragment for the implicit flow and as
 * a `code` query parameter for PKCE; handle both so this keeps working if the
 * project's flow type changes.
 */
export async function createSessionFromUrl(url: string) {
  const { queryParams } = Linking.parse(url)

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

  // Supabase reports failures as ?error=...&error_description=...
  const errorDescription = first(queryParams?.error_description)
  const errorCode = first(queryParams?.error)
  if (errorCode) throw new Error(errorDescription ?? errorCode)

  // PKCE
  const code = first(queryParams?.code)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return data.session
  }

  // Implicit — tokens arrive in the fragment, which Linking.parse leaves alone.
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
  const parsed = new URLSearchParams(fragment)
  const access_token = parsed.get('access_token')
  const refresh_token = parsed.get('refresh_token')
  if (!access_token || !refresh_token) return null

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) throw error
  return data.session
}

/** Sign in with an OAuth provider through the system browser. */
export async function signInWithProvider(provider: Provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // The native app drives the browser itself; Supabase must not try to.
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data.url) throw new Error('No authorization URL returned')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success') return null

  return createSessionFromUrl(result.url)
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: displayName ? { display_name: displayName } : undefined,
    },
  })
  if (error) throw error
  return data.session
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export { redirectTo }
