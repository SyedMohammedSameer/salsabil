// Shared contracts for the platform adapters.
//
// These live in their own file, with no platform-specific variant, because
// env.ts and env.native.ts both need them. If the interfaces lived in env.ts,
// TypeScript's moduleSuffixes resolution (see mobile/tsconfig.json) would make
// env.native.ts's `import './env'` resolve to itself.

export interface AppEnv {
  /** True in the Expo app. Lets shared code branch on platform explicitly. */
  isNative: boolean
  supabaseUrl: string
  supabaseAnonKey: string
  /** Absolute base for serverless functions. Empty on web: same origin. */
  apiBaseUrl: string
  vapidPublicKey: string | undefined
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}
