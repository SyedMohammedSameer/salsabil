import type { ComponentProps } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Sparkles } from 'lucide-react-native'

// The app's tab bar: the four hubs, with Noor in the centre slot.

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
function TabItem({ props, index }: { props: TabBarProps; index: number }) {
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
      <View className="items-center gap-1">
        {options.tabBarIcon?.({ focused, color, size: 24 })}
        <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      </View>
    </Pressable>
  )
}

// Noor takes the middle slot as a raised, outlined button. It belongs to the
// navigation instead of hovering over the content, and the colour stays on
// the icon and a thin rim so it never shouts over the screen above it.

export function TabBar(props: TabBarProps) {
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
          <Text style={{ color: c.inactive, fontSize: 11, fontWeight: '600', marginTop: -2 }}>Noor</Text>
        </View>
      </Pressable>
      {props.state.routes.slice(half).map((r, i) => (
        <TabItem key={r.key} props={props} index={half + i} />
      ))}
    </View>
  )
}
