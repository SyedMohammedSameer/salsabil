import type { ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

// Motion primitives.
//
// The web app leans on framer-motion for two things: a staggered entrance on
// every page, and a scale-down on press. These are the Reanimated equivalents,
// running on the UI thread so they stay smooth while React Query is busy.
//
// className is never placed on an Animated component. NativeWind's interop
// covers React Native's own views; the animated wrappers here carry only
// plain styles, and the styled View sits inside them.

const STAGGER_MS = 60
const ENTER_MS = 320

/**
 * Staggered entrance, matching the web's `stagger.item` variant
 * (opacity 0 → 1, y 16 → 0, ~300ms ease-out). `index` sets the delay slot.
 */
export function FadeIn({
  index = 0,
  children,
  style,
}: {
  index?: number
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * STAGGER_MS).duration(ENTER_MS)}
      style={style}
    >
      {children}
    </Animated.View>
  )
}

/**
 * A pressable that shrinks to 97% while held, as the web's
 * `active:scale-[0.97]` does, with a light haptic on release.
 *
 * `style` shapes the outer pressable (flex, width); `className` styles the
 * inner surface.
 */
export function PressableScale({
  onPress,
  children,
  className,
  style,
  haptic = true,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
  haptic?: boolean
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={style}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 })
      }}
      onPress={() => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress?.()
      }}
    >
      <Animated.View style={animated}>
        <View className={className}>{children}</View>
      </Animated.View>
    </Pressable>
  )
}
