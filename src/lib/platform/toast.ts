// Toasts — web implementation.
//
// The shared hooks award coins and then tell the user about it, so they need to
// raise a toast. sonner is web-only (it renders DOM), and importing it from a
// shared hook breaks the Metro build outright. Both platforms go through this
// adapter instead.

import { toast as sonner } from 'sonner'

import type { Toaster } from './types'

export const toast: Toaster = {
  success: (message) => sonner.success(message),
  error: (message) => sonner.error(message),
  info: (message) => sonner.info(message),
}
