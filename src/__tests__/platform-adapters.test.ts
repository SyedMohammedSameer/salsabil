import { describe, it, expect, vi, beforeEach } from 'vitest'

// The platform adapters are the seam between the shared business logic and the
// two runtimes. A mismatch between the web and native halves does not surface
// on web — it surfaces as a broken React Native bundle, or worse, as a silently
// dropped argument. These tests pin the contract from the web side.

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { toast as sonner } from 'sonner'
import { toast } from '@/lib/platform/toast'
import { storage } from '@/lib/platform/storage'
import { onAppForeground } from '@/lib/platform/appState'

describe('toast adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards each level to the underlying toaster', () => {
    toast.success('done')
    toast.error('nope')
    toast.info('fyi')

    expect(sonner.success).toHaveBeenCalledWith('done', undefined)
    expect(sonner.error).toHaveBeenCalledWith('nope', undefined)
    expect(sonner.info).toHaveBeenCalledWith('fyi', undefined)
  })

  // Regression: the adapter originally took only a message, which silently
  // dropped the longer duration the challenge-completion toast asks for.
  it('forwards options rather than dropping them', () => {
    toast.success('🏆 Challenge complete!', { duration: 6000 })
    expect(sonner.success).toHaveBeenCalledWith('🏆 Challenge complete!', { duration: 6000 })
  })
})

describe('storage adapter', () => {
  beforeEach(async () => {
    await storage.removeItem('adapter-test')
  })

  it('round-trips a value', async () => {
    await storage.setItem('adapter-test', 'hello')
    expect(await storage.getItem('adapter-test')).toBe('hello')
  })

  it('returns null for a missing key rather than throwing', async () => {
    expect(await storage.getItem('definitely-not-set')).toBeNull()
  })

  it('removes a value', async () => {
    await storage.setItem('adapter-test', 'hello')
    await storage.removeItem('adapter-test')
    expect(await storage.getItem('adapter-test')).toBeNull()
  })

  // Every method is async even on web, where localStorage is synchronous,
  // because AsyncStorage is not. Shared callers must be able to await all of
  // them on both platforms.
  it('presents an async interface on both platforms', () => {
    expect(storage.getItem('x')).toBeInstanceOf(Promise)
    expect(storage.setItem('x', 'y')).toBeInstanceOf(Promise)
    expect(storage.removeItem('x')).toBeInstanceOf(Promise)
  })

  it('survives storage being unavailable', async () => {
    const original = window.localStorage.getItem
    // Private mode and blocked cookies make these throw rather than return null.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    await expect(storage.getItem('anything')).resolves.toBeNull()

    vi.mocked(Storage.prototype.getItem).mockRestore()
    expect(typeof original).toBe('function')
  })
})

describe('appState adapter', () => {
  it('fires when the document becomes visible', () => {
    const cb = vi.fn()
    const unsubscribe = onAppForeground(cb)

    document.dispatchEvent(new Event('visibilitychange'))
    expect(cb).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('does not fire while hidden', () => {
    const cb = vi.fn()
    const unsubscribe = onAppForeground(cb)

    const spy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(cb).not.toHaveBeenCalled()

    spy.mockRestore()
    unsubscribe()
  })

  it('stops firing once unsubscribed, so the timer cannot leak listeners', () => {
    const cb = vi.fn()
    const unsubscribe = onAppForeground(cb)
    unsubscribe()

    document.dispatchEvent(new Event('visibilitychange'))
    expect(cb).not.toHaveBeenCalled()
  })

  it('returns an unsubscribe function', () => {
    const unsubscribe = onAppForeground(() => {})
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
  })
})
