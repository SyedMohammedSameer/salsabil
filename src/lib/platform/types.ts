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

/**
 * Notification that the app has come back to the foreground.
 *
 * The focus timer computes its remaining time from the wall clock, so it stays
 * correct while suspended — but it still needs a nudge on return to notice it
 * crossed the finish line, because browsers throttle timers in background tabs
 * and React Native suspends them outright.
 */
export type ForegroundListener = (onForeground: () => void) => () => void

/**
 * Minimal toast surface used by the shared hooks.
 *
 * Only the methods the hooks actually call. Keeping it narrow means the web and
 * native implementations cannot drift in ways a caller could notice.
 */
export interface Toaster {
  success(message: string): void
  error(message: string): void
  info(message: string): void
}
