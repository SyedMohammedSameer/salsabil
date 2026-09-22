// Toasts — React Native implementation.
//
// sonner-native mirrors sonner's API. The <Toaster /> it needs is mounted in
// mobile/lib/providers.tsx.

import { toast as sonnerNative } from 'sonner-native'

import type { Toaster } from './types'

export const toast: Toaster = {
  success: (message) => sonnerNative.success(message),
  error: (message) => sonnerNative.error(message),
  info: (message) => sonnerNative.info(message),
}
