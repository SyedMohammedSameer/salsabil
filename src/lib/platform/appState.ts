// Foreground detection — web implementation.

import type { ForegroundListener } from './types'

export const onAppForeground: ForegroundListener = (cb) => {
  const handler = () => {
    if (!document.hidden) cb()
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
