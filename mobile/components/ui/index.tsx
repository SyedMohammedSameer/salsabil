// Core UI primitives for the native app.
//
// The web app builds on Radix + shadcn, neither of which exists in React
// Native. These are the native equivalents of the primitives the ported views
// lean on most, styled with the same NativeWind tokens so the two platforms
// read as one product: the same 2xl card radius, the same tinted icon badges,
// the same glass-noor surface for spiritual content, the same section headers.

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { cn } from '@/lib/cn'

import { Gradient } from './Gradient'
export { Gradient, HERO_GRADIENT, NOOR_GRADIENT } from './Gradient'
export { FadeIn, PressableScale } from './motion'

// ─── Elevation ───────────────────────────────────────────────────────────────
//
// NativeWind's shadow classes map unevenly between iOS (shadow*) and Android
// (elevation), so elevation is expressed once here as plain styles. Values
// track the web's shadow-sm / shadow-md / shadow-lg.

export const SHADOW: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function Screen({
  children,
  scroll = true,
  className,
}: {
  children: ReactNode
  scroll?: boolean
  className?: string
}) {
  const body = (
    <View className={cn('flex-1 px-4 pt-2', className)}>{children}</View>
  )
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  )
}

// ─── Typography ──────────────────────────────────────────────────────────────

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn('text-2xl font-bold tracking-tight text-foreground', className)}>
      {children}
    </Text>
  )
}

export function Muted({
  children,
  className,
  ...rest
}: TextProps & { children: ReactNode; className?: string }) {
  return (
    <Text className={cn('text-sm text-muted-foreground', className)} {...rest}>
      {children}
    </Text>
  )
}

/** Arabic scripture. Right-aligned, generous leading, brand-tinted as on web. */
export function Arabic({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      className={cn(
        'text-right text-xl leading-9 text-noor-700 dark:text-noor-300',
        className,
      )}
      style={{ writingDirection: 'rtl', fontFamily: 'Amiri' }}
    >
      {children}
    </Text>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  description,
  action,
  onAction,
  className,
}: {
  title: string
  description?: string
  /** Text for the trailing link, e.g. "View all". */
  action?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <View className={cn('flex-row items-end justify-between gap-4', className)}>
      <View className="flex-1 gap-0.5">
        <Text className="text-lg font-semibold tracking-tight text-foreground">{title}</Text>
        {description ? <Muted>{description}</Muted> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          className="flex-row items-center gap-1 py-1"
        >
          <Text className="text-sm font-medium text-noor-600 dark:text-noor-400">{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

export type CardVariant = 'default' | 'elevated' | 'flat' | 'glass-noor' | 'outline-dashed'

const CARD_VARIANT: Record<CardVariant, { className: string; shadow?: ViewStyle }> = {
  default: { className: 'border border-border bg-card', shadow: SHADOW.sm },
  elevated: { className: 'border border-border bg-card', shadow: SHADOW.md },
  flat: { className: 'bg-muted/50' },
  // The web's translucent teal surface. Backdrop blur is not available in RN
  // without a native module, so the tint is carried by the fill alone.
  'glass-noor': {
    className: 'border border-noor-200/60 bg-noor-50 dark:border-noor-800/40 dark:bg-noor-950/40',
    shadow: SHADOW.sm,
  },
  'outline-dashed': { className: 'border border-dashed border-border bg-muted/20' },
}

export function Card({
  children,
  className,
  variant = 'default',
  style,
}: {
  children: ReactNode
  className?: string
  variant?: CardVariant
  style?: StyleProp<ViewStyle>
}) {
  const v = CARD_VARIANT[variant]
  return (
    <View className={cn('rounded-2xl p-4', v.className, className)} style={[v.shadow, style]}>
      {children}
    </View>
  )
}

// ─── Icon badge ──────────────────────────────────────────────────────────────
// The tinted rounded square behind an icon, as on the web StatCard.

export function IconBadge({
  children,
  className,
  size = 40,
}: {
  children: ReactNode
  className?: string
  size?: number
}) {
  return (
    <View
      className={cn('items-center justify-center rounded-xl bg-noor-500/10', className)}
      style={{ width: size, height: size }}
    >
      {children}
    </View>
  )
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  /** 0..100 */
  value: number
  className?: string
  indicatorClassName?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <View
        className={cn('h-full rounded-full bg-primary', indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </View>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className, style }: { className?: string; style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true)
  }, [opacity])
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View style={[animated, style]} accessibilityElementsHidden>
      <View className={cn('rounded-2xl bg-muted', className)} />
    </Animated.View>
  )
}

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md'

const VARIANT: Record<ButtonVariant, { container: string; label: string }> = {
  primary: { container: 'bg-primary', label: 'text-primary-foreground' },
  outline: { container: 'border border-border bg-card', label: 'text-foreground' },
  ghost: { container: 'bg-transparent', label: 'text-foreground' },
  destructive: { container: 'bg-destructive', label: 'text-destructive-foreground' },
}

const SIZE: Record<ButtonSize, { container: string; label: string }> = {
  sm: { container: 'h-9 px-3 rounded-lg', label: 'text-sm' },
  md: { container: 'h-12 px-4 rounded-xl', label: 'text-base' },
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  icon,
}: {
  children: ReactNode
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  className?: string
  /** Leading icon element. */
  icon?: ReactNode
}) {
  const styles = VARIANT[variant]
  const dims = SIZE[size]
  const inert = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={() => {
        // Native apps are expected to acknowledge a tap physically; this is
        // one of the affordances a PWA simply cannot offer.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress?.()
      }}
      className={cn(
        'flex-row items-center justify-center gap-2',
        dims.container,
        styles.container,
        inert && 'opacity-50',
        className,
      )}
      style={({ pressed }) => [
        variant === 'primary' && !inert ? SHADOW.sm : null,
        pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <>
          {icon}
          <Text className={cn('font-semibold', dims.label, styles.label)}>{children}</Text>
        </>
      )}
    </Pressable>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────

export function Input({
  label,
  error,
  className,
  ...props
}: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-foreground">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#83938f"
        className={cn(
          'h-12 rounded-xl border border-input bg-card px-3 text-base text-foreground',
          error && 'border-destructive',
          className,
        )}
        {...props}
      />
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  )
}

// ─── Hub content ─────────────────────────────────────────────────────────────
// The body of a hub segment. The hub itself owns the safe area, the title and
// the segmented control; a feature only decides whether it scrolls.

export function HubContent({
  children,
  scroll = true,
  className,
}: {
  children: ReactNode
  scroll?: boolean
  className?: string
}) {
  if (!scroll) return <View className={cn('flex-1 px-4', className)}>{children}</View>
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 120, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className={cn('flex-1', className)}>{children}</View>
    </ScrollView>
  )
}

// ─── Segmented control ───────────────────────────────────────────────────────
// iOS-style segments with a sliding thumb, used by every hub for its sections.

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (next: T) => void
}) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const [width, setWidth] = useState(0)
  const PAD = 4
  const GAP = 4
  const n = options.length
  const slot = width > 0 ? (width - PAD * 2 - GAP * (n - 1)) / n : 0
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const x = useSharedValue(0)

  useEffect(() => {
    x.value = withSpring(PAD + index * (slot + GAP), { damping: 20, stiffness: 220 })
  }, [index, slot, x])

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View
      className="flex-row rounded-xl bg-muted"
      style={{ padding: PAD, gap: GAP }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {slot > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: 0,
              width: slot,
              borderRadius: 9,
              backgroundColor: dark ? '#070c0b' : '#ffffff',
            },
            SHADOW.sm,
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return
              void Haptics.selectionAsync()
              onChange(o.value)
            }}
            className="flex-1 items-center justify-center py-2"
          >
            <Text
              className={cn(
                'text-[13px] font-semibold',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Gradient button ─────────────────────────────────────────────────────────
// The primary action on hero surfaces (log a reading, complete adhkar).

export const GRADIENT_BUTTON = {
  noor: ['#14b8a6', '#0f766e'],
  gold: ['#d97706', '#b8860b'],
} as const

export function GradientButton({
  children,
  onPress,
  colors = GRADIENT_BUTTON.noor,
  disabled = false,
  loading = false,
  icon,
  className,
}: {
  children: ReactNode
  onPress?: () => void
  colors?: readonly string[]
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  className?: string
}) {
  const inert = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onPress?.()
      }}
      style={({ pressed }) => [
        { opacity: inert ? 0.45 : pressed ? 0.9 : 1 },
        !inert && {
          shadowColor: colors[0],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 14,
          elevation: 4,
        },
      ]}
    >
      <Gradient colors={colors} radius={14} style={{ backgroundColor: colors[0] }}>
        <View className={cn('h-12 flex-row items-center justify-center gap-2 px-4', className)}>
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              {icon}
              <Text className="text-[15px] font-semibold text-white">{children}</Text>
            </>
          )}
        </View>
      </Gradient>
    </Pressable>
  )
}

/** Small uppercase label above a block, e.g. "NEXT PRAYER". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      className={cn('text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground', className)}
    >
      {children}
    </Text>
  )
}
