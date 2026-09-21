// Environment configuration — React Native implementation.
//
// Values come from app.config.ts `extra`, which Expo populates from the
// EXPO_PUBLIC_* environment variables at build time. See mobile/app.config.ts.

import Constants from 'expo-constants'

import type { AppEnv } from './types'

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>

export const env: AppEnv = {
  isNative: true,
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
  // Native builds have no same-origin server, so serverless functions must be
  // addressed absolutely. Without this, fetch('/.netlify/functions/...')
  // resolves against the bundle origin and fails.
  apiBaseUrl: extra.apiBaseUrl ?? '',
  vapidPublicKey: undefined, // native uses APNs/FCM, not Web Push
}

export function assertEnv(): void {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY before building.',
    )
  }
}
