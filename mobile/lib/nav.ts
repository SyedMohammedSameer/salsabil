// Hub navigation.
//
// The tab bar has four domain hubs; each hub shows one of its sections via a
// segmented control. Deep links into a section carry `tab`, plus a nonce so
// that pushing the same section twice in a row still re-selects it (a plain
// `?tab=quran` would be a no-op the second time because the param is
// unchanged).

import type { Href } from 'expo-router'

export type Hub = 'deen' | 'focus' | 'grow'

export const HUB_TABS = {
  deen: ['prayers', 'quran', 'adhkar'],
  focus: ['timer', 'tasks', 'rooms'],
  grow: ['garden', 'challenges', 'workouts', 'analytics'],
} as const

export type HubTab<H extends Hub> = (typeof HUB_TABS)[H][number]

let nonce = 0

export function hubHref<H extends Hub>(hub: H, tab?: HubTab<H>): Href {
  if (!tab) return `/${hub}` as Href
  nonce += 1
  return `/${hub}?tab=${tab}&k=${nonce}` as Href
}
