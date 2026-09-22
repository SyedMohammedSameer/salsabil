import type { UseFocusTimer } from '@/hooks/useFocusTimer'
import {
  scheduleFocusSessionEnd,
  cancelFocusSessionEnd,
  presentFocusRunning,
  dismissFocusRunning,
} from '~/lib/notifications'

// The notification side-effects of a focus session, in one place, so the
// timer screen and the pinned mini-timer cannot drift apart:
//
//   running  → an end-of-session alarm is scheduled and a pinned "in
//              progress" card is shown (Android)
//   paused / reset / skipped / done → both are withdrawn

export function afterStart(timer: Pick<UseFocusTimer, 'preset' | 'remaining'>) {
  const endsAt = new Date(Date.now() + timer.remaining * 1000)
  void scheduleFocusSessionEnd(endsAt, timer.preset.minutes)
  void presentFocusRunning(endsAt, timer.preset.label)
}

export function pauseSession(timer: Pick<UseFocusTimer, 'pause'>) {
  timer.pause()
  void cancelFocusSessionEnd()
  void dismissFocusRunning()
}

export function resumeSession(timer: Pick<UseFocusTimer, 'resume' | 'preset' | 'remaining'>) {
  timer.resume()
  afterStart(timer)
}

export function clearSessionEffects() {
  void cancelFocusSessionEnd()
  void dismissFocusRunning()
}
