import { Timer, Coffee, Zap } from 'lucide-react-native'
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

export function presetFor(type: SessionType): Preset {
  return PRESETS.find((p) => p.type === type) ?? PRESETS[0]
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}
