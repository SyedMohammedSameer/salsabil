// Environment configuration — web implementation.
//
// The mobile app resolves env.native.ts instead, via Metro's platform
// extension resolution. Vite ignores .native.ts entirely, so each platform
// gets the reader it can actually parse: `import.meta.env` is a Vite
// compile-time construct that Metro cannot handle, and expo-constants does
// not exist in the browser.
//
// Keep the two files' exports identical — that shared shape is what lets
// everything in src/lib/api be consumed unchanged by both platforms.

import type { AppEnv } from './types'

export type { AppEnv }

export const env: AppEnv = {
  isNative: false,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  apiBaseUrl: '',
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined,
}

export function assertEnv(): void {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.')
  }
}
