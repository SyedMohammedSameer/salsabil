// Key-value storage — React Native implementation.
//
// AsyncStorage is what keeps a signed-in session alive across app launches.
// Without it Supabase falls back to in-memory storage and the user is signed
// out every cold start.

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { KeyValueStore } from './types'

export const storage: KeyValueStore = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      /* non-fatal */
    }
  },
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      /* non-fatal */
    }
  },
}
