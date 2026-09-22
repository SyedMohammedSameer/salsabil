import { View, Text, Pressable } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Pause, Play } from 'lucide-react-native'
import { Gradient } from '~/components/ui'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { PRESETS, formatClock } from '~/lib/focusPresets'
import { pauseSession, resumeSession } from '~/lib/focusSession'
import { hubHref } from '~/lib/nav'

// The pinned mini-timer. While a focus session is running or paused and the
// user is anywhere other than the Focus hub, this sits above the tab bar like
// a mini player: live countdown, preset, and a pause/resume button. Tapping
// it opens the full timer.

export function FocusMiniBar({ bottom }: { bottom: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const timer = useFocusTimer(PRESETS[0])
  const { state, remaining, preset, hydrated } = timer

  const onFocusHub = pathname.startsWith('/focus')
  const active = state === 'running' || state === 'paused'
  if (!hydrated || !active || onFocusHub) return null

  const total = preset.minutes * 60
  const fraction = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const size = 30
  const stroke = 3.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={{ position: 'absolute', left: 16, right: 16, bottom }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Focus session, ${formatClock(remaining)} remaining. Open timer.`}
        onPress={() => router.push(hubHref('focus', 'timer'))}
      >
        <Gradient
          colors={['#023728', '#0f766e']}
          radius={26}
          style={{
            height: 52,
            backgroundColor: '#0b5c4c',
            shadowColor: '#023728',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <View className="h-full flex-row items-center gap-3 pl-3 pr-2">
            <View style={{ width: size, height: size }} className="items-center justify-center">
              <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke="#ffffff" strokeOpacity={0.2} strokeWidth={stroke} fill="none" />
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={preset.ringColor}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${c} ${c}`}
                  strokeDashoffset={c * (1 - fraction)}
                  rotation={-90}
                  origin={`${size / 2}, ${size / 2}`}
                />
              </Svg>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-bold leading-5 text-white" style={{ fontVariant: ['tabular-nums'] }}>
                {formatClock(remaining)}
              </Text>
              <Text className="text-[11px] text-white/75" numberOfLines={1}>
                {preset.label === 'Custom' ? `${preset.minutes} min session` : preset.label}
                {state === 'paused' ? ' · paused' : ' · focusing'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={state === 'running' ? 'Pause session' : 'Resume session'}
              hitSlop={6}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                if (state === 'running') pauseSession(timer)
                else resumeSession(timer)
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/15"
            >
              {state === 'running' ? (
                <Pause size={16} color="#ffffff" fill="#ffffff" />
              ) : (
                <Play size={16} color="#ffffff" fill="#ffffff" />
              )}
            </Pressable>
          </View>
        </Gradient>
      </Pressable>
    </Animated.View>
  )
}
