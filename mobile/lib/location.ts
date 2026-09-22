// Device location, for prayer times.
//
// Prayer times are astronomical, so they need coordinates. The last known
// location is cached so the app can compute times offline and on a cold start
// before the OS has a fresh fix — the times for a given day and place never
// change, so a slightly stale location is far better than no prayer times.

import { useCallback, useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { storage } from '@/lib/platform/storage'
import type { Coordinates } from '@/lib/api/prayerTimes'

const CACHE_KEY = 'salsabil-last-location'

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error'

async function readCached(): Promise<Coordinates | null> {
  try {
    const raw = await storage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Coordinates>
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null
    return { latitude: parsed.latitude, longitude: parsed.longitude }
  } catch {
    return null
  }
}

export function useDeviceLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')

  const resolve = useCallback(async () => {
    setStatus('loading')
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const position = await Location.getLastKnownPositionAsync()
      const fresh = position ?? (await Location.getCurrentPositionAsync({}))

      const next: Coordinates = {
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
      }
      setCoords(next)
      setStatus('granted')
      void storage.setItem(CACHE_KEY, JSON.stringify(next))
    } catch {
      setStatus('error')
    }
  }, [])

  // Show cached coordinates immediately, then refresh in the background.
  useEffect(() => {
    let cancelled = false
    void readCached().then((cached) => {
      if (cancelled || !cached) return
      setCoords(cached)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { coords, status, resolve }
}
