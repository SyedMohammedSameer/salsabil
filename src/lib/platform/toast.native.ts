// Toasts — React Native implementation.
//
// sonner-native mirrors sonner's API. The <Toaster /> it needs is mounted in
// mobile/lib/providers.tsx.

import { toast as sonnerNative } from 'sonner-native'

import type { Toaster } from './types'

export const toast: Toaster = {
  success: (message, options) => sonnerNative.success(message, options),
  error: (message, options) => sonnerNative.error(message, options),
  info: (message, options) => sonnerNative.info(message, options),
}
