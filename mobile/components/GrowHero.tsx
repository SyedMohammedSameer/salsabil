import type { ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Gradient } from '~/components/ui'

// The one hero card every Grow section opens with. Same gradient, same
// height, same slots — eyebrow, headline, sub-line, an optional element on
// the right, an optional footer row — so the four sections read as one hub.
// Each section's own colour is confined to small pills and icons below.

export const GROW_HERO = ['#0d9488', '#0f766e', '#023728'] as const

export function GrowHero({
  eyebrow,
  title,
  sub,
  right,
  footer,
}: {
  eyebrow: string
  title: string
  sub?: string
  right?: ReactNode
  footer?: ReactNode
}) {
  return (
    <Gradient
      colors={GROW_HERO}
      radius={24}
      orbs
      style={{
        minHeight: 132,
        backgroundColor: '#0f766e',
        shadowColor: '#0f766e',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
        elevation: 6,
      }}
    >
      <View className="gap-3.5 px-5 pb-4 pt-[18px]">
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/80">{eyebrow}</Text>
            <Text className="mt-1 text-[24px] font-bold leading-7 tracking-tight text-white" numberOfLines={1}>
              {title}
            </Text>
            {sub ? (
              <Text className="mt-1 text-xs text-white/85" numberOfLines={2}>
                {sub}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
        {footer}
      </View>
    </Gradient>
  )
}

/** The white pill action used inside a hero (e.g. Water, Mark today done). */
export function HeroAction({
  children,
  icon,
  onPress,
  disabled,
}: {
  children: ReactNode
  icon?: ReactNode
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onPress()
      }}
      className="h-10 flex-row items-center justify-center gap-1.5 self-start rounded-xl bg-white px-3.5"
      style={disabled ? { opacity: 0.55 } : undefined}
    >
      {icon}
      <Text className="text-[13px] font-bold text-noor-800">{children}</Text>
    </Pressable>
  )
}

/** A large stat inside the hero's right slot. */
export function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-end">
      <Text className="text-[22px] font-bold leading-7 tracking-tight text-white">{value}</Text>
      <Text className="text-[11px] text-white/80">{label}</Text>
    </View>
  )
}
