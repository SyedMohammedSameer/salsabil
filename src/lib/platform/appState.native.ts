// Foreground detection — React Native implementation.

import { AppState } from 'react-native'

import type { ForegroundListener } from './types'

export const onAppForeground: ForegroundListener = (cb) => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') cb()
  })
  return () => sub.remove()
}
