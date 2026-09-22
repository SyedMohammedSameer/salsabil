import { Timer, Coffee, Zap, SlidersHorizontal } from 'lucide-react-native'
import type { FocusPresetInfo } from '@/hooks/useFocusTimer'
import type { SessionType } from '@/lib/database.types'

// The focus presets, shared by the timer screen and the pinned mini-timer.
// Same presets and semantics as src/views/focus/FocusView.tsx.

export interface Preset extends FocusPresetInfo {
  Icon: typeof Timer
  short: string
}

export const PRESETS: Preset[] = [
  { type: 'pomodoro', label: 'Pomodoro', short: 'Pomodoro', minutes: 25, Icon: Timer, color: '#14b8a6', ringColor: '#5eead4' },
  { type: 'short_break', label: 'Short Break', short: 'Short', minutes: 5, Icon: Coffee, color: '#10b981', ringColor: '#6ee7b7' },
  { type: 'long_break', label: 'Long Break', short: 'Long', minutes: 15, Icon: Coffee, color: '#f59e0b', ringColor: '#fcd34d' },
  { type: 'flow', label: 'Flow State', short: 'Flow', minutes: 50, Icon: Zap, color: '#ef4444', ringColor: '#fca5a5' },
]

/**
 * A focus session of any length. It is recorded as a pomodoro (focus work);
 * the label is what tells it apart, and coins follow the minutes either way.
 */
export const CUSTOM_LABEL = 'Custom'
export const CUSTOM_MIN = 5
export const CUSTOM_MAX = 180
export const CUSTOM_QUICK = [10, 20, 30, 45, 60, 90, 120]

export function customPreset(minutes: number): Preset {
  const m = Math.min(CUSTOM_MAX, Math.max(1, Math.round(minutes)))
  return { type: 'pomodoro', label: CUSTOM_LABEL, short: 'Custom', minutes: m, Icon: SlidersHorizontal, color: '#8b5cf6', ringColor: '#c4b5fd' }
}

/** Stable key for the preset picker: a preset's type, or 'custom'. */
export type PresetKey = SessionType | 'custom'
export function presetKey(p: Pick<FocusPresetInfo, 'type' | 'label'>): PresetKey {
  return p.label === CUSTOM_LABEL ? 'custom' : p.type
}

/** The full preset for whatever the timer holds, including a custom length. */
export function describePreset(p: FocusPresetInfo): Preset {
  return p.label === CUSTOM_LABEL ? customPreset(p.minutes) : presetFor(p.type)
}

export function presetFor(type: SessionType): Preset {
  return PRESETS.find((p) => p.type === type) ?? PRESETS[0]
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}
