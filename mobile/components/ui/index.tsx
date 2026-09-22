// Core UI primitives for the native app.
//
// The web app builds on Radix + shadcn, neither of which exists in React
// Native. These are the native equivalents of the primitives the ported views
// lean on most, styled with the same NativeWind tokens so the two platforms
// stay visually identical.

import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { cn } from '@/lib/cn'

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
    <Text className={cn('text-2xl font-semibold text-foreground', className)}>{children}</Text>
  )
}

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('rounded-xl border border-border bg-card p-4', className)}>{children}</View>
  )
}

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive'

const VARIANT: Record<ButtonVariant, { container: string; label: string }> = {
  primary: { container: 'bg-primary', label: 'text-primary-foreground' },
  outline: { container: 'border border-border bg-transparent', label: 'text-foreground' },
  ghost: { container: 'bg-transparent', label: 'text-foreground' },
  destructive: { container: 'bg-destructive', label: 'text-destructive-foreground' },
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className,
}: {
  children: ReactNode
  onPress?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  const styles = VARIANT[variant]
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
        'h-12 flex-row items-center justify-center rounded-lg px-4',
        styles.container,
        inert && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text className={cn('text-base font-semibold', styles.label)}>{children}</Text>
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
          'h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground',
          error && 'border-destructive',
          className,
        )}
        {...props}
      />
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  )
}
