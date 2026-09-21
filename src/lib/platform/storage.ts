// Key-value storage — web implementation (synchronous localStorage behind an
// async interface, so shared callers can await on both platforms).
//
// The mobile app resolves storage.native.ts, backed by AsyncStorage.
// Supabase's auth client accepts exactly this shape for session persistence.

import type { KeyValueStore } from './types'

export type { KeyValueStore }

export const storage: KeyValueStore = {
  async getItem(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      // Unavailable in private mode and when cookies are blocked.
      return null
    }
  },
  async setItem(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* quota exceeded or storage disabled — non-fatal */
    }
  },
  async removeItem(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* non-fatal */
    }
  },
}
