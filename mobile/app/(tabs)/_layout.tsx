import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { House, Moon, Timer, Sprout, Sparkles } from 'lucide-react-native'
import { Gradient, NOOR_GRADIENT } from '~/components/ui'
import { FocusMiniBar } from '~/components/FocusMiniBar'

// Four domain hubs, and Noor as a floating orb above every one of them.
//
// Home, Deen (prayers, Quran, adhkar), Focus (timer, tasks, rooms) and Grow
// (garden, challenges, workouts, analytics). Each hub shows its sections in
// a segmented control, so every feature is at most two taps away and the bar
// never needs a "More". Noor is not a destination among the four; it is a
// companion you can summon from anywhere, which is what the web's floating
// orb already says.

const ACTIVE = '#14b8a6' // noor-500
const BAR_HEIGHT = 58

function NoorOrb({ bottom }: { bottom: number }) {
  const router = useRouter()
  const scale = useSharedValue(1)
  useEffect(() => {
    // The same slow breath as the web orb (scale 1 → 1.06 over ~3s, forever).
    scale.value = withRepeat(withTiming(1.06, { duration: 1600 }), -1, true)
  }, [scale])
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom }}>
      <Animated.View style={breathe}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Noor"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            router.push('/noor')
          }}
        >
          <Gradient
            colors={NOOR_GRADIENT}
            radius={28}
            style={{
              width: 56,
              height: 56,
              backgroundColor: '#14b8a6',
              shadowColor: '#14b8a6',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 14,
              elevation: 8,
            }}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} color="#ffffff" />
            </View>
          </Gradient>
        </Pressable>
      </Animated.View>
    </View>
  )
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE,
          tabBarInactiveTintColor: dark ? '#83938f' : '#677773',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
          tabBarStyle: {
            backgroundColor: dark ? '#070c0b' : '#ffffff',
            borderTopColor: dark ? '#192320' : '#e2e6e5',
            height: BAR_HEIGHT + insets.bottom,
            paddingTop: 6,
            paddingBottom: insets.bottom + 6,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.75} />,
          }}
        />
        <Tabs.Screen
          name="deen"
          options={{
            title: 'Deen',
            tabBarIcon: ({ color, size }) => <Moon color={color} size={size} strokeWidth={1.75} />,
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: 'Focus',
            tabBarIcon: ({ color, size }) => <Timer color={color} size={size} strokeWidth={1.75} />,
          }}
        />
        <Tabs.Screen
          name="grow"
          options={{
            title: 'Grow',
            tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} strokeWidth={1.75} />,
          }}
        />
      </Tabs>
      {/* A running focus session stays pinned above the bar on every other
          tab, the way a mini player does. */}
      <FocusMiniBar bottom={BAR_HEIGHT + insets.bottom + 16} />
      <NoorOrb bottom={BAR_HEIGHT + insets.bottom + 16} />
    </View>
  )
}
