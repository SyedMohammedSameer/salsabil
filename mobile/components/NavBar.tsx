import type { ComponentProps, ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Sparkles } from 'lucide-react-native'
import { FLOATING_BAR_HEIGHT } from '~/lib/noorPlacement'

// The app's bottom chrome and every way of reaching Noor from it. Which one
// is used is decided by NOOR_PLACEMENT in ~/lib/noorPlacement.ts.

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

export const BAR_HEIGHT = 58

function palette(dark: boolean) {
  return {
    bar: dark ? '#070c0b' : '#ffffff',
    border: dark ? '#192320' : '#e2e6e5',
    active: dark ? '#2dd4bf' : '#0d9488',
    inactive: dark ? '#83938f' : '#677773',
    raised: dark ? '#0d1714' : '#f4fbf9',
    ring: dark ? 'rgba(45,212,191,0.45)' : 'rgba(13,148,136,0.35)',
  }
}

function useOpenNoor() {
  const router = useRouter()
  return () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/noor')
  }
}

/** One tab: icon over label, coloured by focus. */
function TabItem({
  props,
  index,
  pill,
}: {
  props: TabBarProps
  index: number
  /** Draw a soft pill behind the focused tab (floating bar). */
  pill?: boolean
}) {
  const { colorScheme } = useColorScheme()
  const c = palette(colorScheme === 'dark')
  const { state, descriptors, navigation } = props
  const route = state.routes[index]
  const { options } = descriptors[route.key]
  const focused = state.index === index
  const color = focused ? c.active : c.inactive
  const label = typeof options.title === 'string' ? options.title : route.name

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
    if (!focused && !event.defaultPrevented) {
      void Haptics.selectionAsync()
      navigation.navigate(route.name)
    }
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-1 items-center justify-center"
    >
      <View
        className="items-center gap-1 rounded-[22px] px-3.5 py-1.5"
        style={pill && focused ? { backgroundColor: colorScheme === 'dark' ? 'rgba(45,212,191,0.12)' : 'rgba(13,148,136,0.09)' } : undefined}
      >
        {options.tabBarIcon?.({ focused, color, size: pill ? 22 : 24 })}
        <Text style={{ color, fontSize: pill ? 10 : 11, fontWeight: '600' }}>{label}</Text>
      </View>
    </Pressable>
  )
}

// ─── A · Centre dock ─────────────────────────────────────────────────────────
// Noor takes the middle slot of the bar as a raised, outlined button. It
// belongs to the navigation instead of hovering over the content.

export function DockTabBar(props: TabBarProps) {
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const c = palette(colorScheme === 'dark')
  const openNoor = useOpenNoor()
  const count = props.state.routes.length
  const half = Math.ceil(count / 2)

  return (
    <View
      style={{
        height: BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: c.bar,
        borderTopWidth: 1,
        borderTopColor: c.border,
        flexDirection: 'row',
      }}
    >
      {props.state.routes.slice(0, half).map((r, i) => (
        <TabItem key={r.key} props={props} index={i} />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Noor"
        onPress={openNoor}
        className="flex-1 items-center justify-center"
      >
        <View className="items-center gap-1">
          {/* A ring in the bar's own colour cuts the button out of the edge. */}
          <View
            style={{
              marginTop: -30,
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: c.bar,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: c.raised,
                borderWidth: 1.5,
                borderColor: c.ring,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={21} strokeWidth={1.75} color={c.active} />
            </View>
          </View>
          <Text style={{ color: c.active, fontSize: 11, fontWeight: '600', marginTop: -2 }}>Noor</Text>
        </View>
      </Pressable>
      {props.state.routes.slice(half).map((r, i) => (
        <TabItem key={r.key} props={props} index={half + i} />
      ))}
    </View>
  )
}

// ─── B · Glass orb ───────────────────────────────────────────────────────────
// Still floating, but small, translucent and quiet: a dark glass disc with a
// thin teal rim, the colour kept to the icon.

export function GlassOrb({ bottom }: { bottom: number }) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const c = palette(dark)
  const openNoor = useOpenNoor()
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 18, bottom }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Noor"
        onPress={openNoor}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: dark ? 'rgba(13,23,20,0.78)' : 'rgba(255,255,255,0.82)',
          borderWidth: 1,
          borderColor: c.ring,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: dark ? 0.4 : 0.12,
          shadowRadius: 10,
          elevation: 4,
        })}
      >
        <Sparkles size={20} strokeWidth={1.75} color={c.active} />
      </Pressable>
    </View>
  )
}

// ─── C · In the header ───────────────────────────────────────────────────────
// Nothing floats. Home carries an "Ask Noor" bar under the greeting, and every
// hub has a small Noor button beside its title.

export function NoorHeaderButton() {
  const { colorScheme } = useColorScheme()
  const c = palette(colorScheme === 'dark')
  const openNoor = useOpenNoor()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Noor"
      onPress={openNoor}
      hitSlop={6}
      className="mb-0.5 h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
    >
      <Sparkles size={17} strokeWidth={1.75} color={c.active} />
    </Pressable>
  )
}

export function AskNoorBar({ children }: { children?: ReactNode }) {
  const openNoor = useOpenNoor()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ask Noor"
      onPress={openNoor}
      className="mt-4 h-11 flex-row items-center gap-2.5 rounded-full border border-white/15 bg-white/10 pl-4 pr-1.5"
    >
      <Sparkles size={16} strokeWidth={1.75} color="#99f6e4" />
      <Text className="flex-1 text-[13px] text-white/75" numberOfLines={1}>
        {children ?? 'Ask Noor to plan your day…'}
      </Text>
      <View className="h-8 items-center justify-center rounded-full bg-white/15 px-3">
        <Text className="text-xs font-semibold text-white">Ask</Text>
      </View>
    </Pressable>
  )
}

// ─── D · Floating dock ───────────────────────────────────────────────────────
// The bar lifts off the edge into a capsule, and Noor sits beside it as a
// matching round button: part of the same chrome, set apart as a companion.

export function FloatingTabBar(props: TabBarProps) {
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const c = palette(dark)
  const openNoor = useOpenNoor()
  const surface = {
    backgroundColor: dark ? 'rgba(11,19,17,0.96)' : 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.5 : 0.12,
    shadowRadius: 18,
    elevation: 10,
  } as const

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 10,
        flexDirection: 'row',
        gap: 10,
      }}
    >
      <View
        style={[
          surface,
          { flex: 1, height: FLOATING_BAR_HEIGHT, borderRadius: FLOATING_BAR_HEIGHT / 2, flexDirection: 'row', paddingHorizontal: 4 },
        ]}
      >
        {props.state.routes.map((r, i) => (
          <TabItem key={r.key} props={props} index={i} pill />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Noor"
        onPress={openNoor}
        style={[
          surface,
          {
            width: FLOATING_BAR_HEIGHT,
            height: FLOATING_BAR_HEIGHT,
            borderRadius: FLOATING_BAR_HEIGHT / 2,
            borderColor: c.ring,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Sparkles size={22} strokeWidth={1.75} color={c.active} />
      </Pressable>
    </View>
  )
}
