import type { ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, X } from 'lucide-react-native'

// The top bar of a stack or modal screen: a round back/close button, a title
// with an optional sub-line, and room for trailing controls. Used instead of
// the native header so these screens match the hubs' typography.

export function StackBar({
  title,
  sub,
  close = false,
  leading,
  trailing,
}: {
  title: string
  sub?: string
  /** Show an X (modal) instead of a back chevron. */
  close?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}) {
  const router = useRouter()
  return (
    <View className="flex-row items-center gap-2.5 px-4 pb-3 pt-1.5">
      {leading ?? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={close ? 'Close' : 'Back'}
          onPress={() => {
            void Haptics.selectionAsync()
            router.back()
          }}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-muted"
        >
          {close ? <X size={18} color="#8a9793" /> : <ChevronLeft size={20} color="#8a9793" />}
        </Pressable>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] font-bold tracking-tight text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  )
}

export function BarButton({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full bg-muted"
    >
      {icon}
    </Pressable>
  )
}
