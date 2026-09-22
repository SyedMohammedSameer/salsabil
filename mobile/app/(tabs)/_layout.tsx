import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import { House, Moon, Timer, Sprout } from 'lucide-react-native'
import { FocusMiniBar } from '~/components/FocusMiniBar'
import { BAR_HEIGHT, DockTabBar, FloatingTabBar, GlassOrb } from '~/components/NavBar'
import { NOOR_PLACEMENT, FLOATING_BAR_HEIGHT } from '~/lib/noorPlacement'

// Four domain hubs, and Noor as a floating orb above every one of them.
//
// Home, Deen (prayers, Quran, adhkar), Focus (timer, tasks, rooms) and Grow
// (garden, challenges, workouts, analytics). Each hub shows its sections in
// a segmented control, so every feature is at most two taps away and the bar
// never needs a "More". Noor is not a destination among the four; it is a
// companion you can summon from anywhere, which is what the web's floating
// orb already says.

const ACTIVE = '#14b8a6' // noor-500

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={
          NOOR_PLACEMENT === 'dock'
            ? (props) => <DockTabBar {...props} />
            : NOOR_PLACEMENT === 'floating'
              ? (props) => <FloatingTabBar {...props} />
              : undefined
        }
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
      <FocusMiniBar
        bottom={
          NOOR_PLACEMENT === 'floating'
            ? insets.bottom + 10 + FLOATING_BAR_HEIGHT + 10
            : BAR_HEIGHT + insets.bottom + (NOOR_PLACEMENT === 'dock' ? 40 : 12)
        }
        rightInset={NOOR_PLACEMENT === 'glass' ? 48 + 12 : 0}
      />
      {NOOR_PLACEMENT === 'glass' ? <GlassOrb bottom={BAR_HEIGHT + insets.bottom + 14} /> : null}
    </View>
  )
}
