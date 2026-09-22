import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Moon, Timer, Sprout } from 'lucide-react-native'
import { FocusMiniBar } from '~/components/FocusMiniBar'
import { BAR_HEIGHT, TabBar } from '~/components/NavBar'
import { useFocusCompletion } from '~/lib/focusControl'
import { useNotificationSync } from '~/lib/notificationSync'

// Four domain hubs, and Noor in the centre of the bar between them.
//
// Home, Deen (prayers, Quran, adhkar), Focus (timer, tasks, rooms) and Grow
// (garden, challenges, workouts, analytics). Each hub shows its sections in
// a segmented control, so every feature is at most two taps away and the bar
// never needs a "More". Noor is not a destination among the four: its centre
// button opens it as a modal over whichever hub you are in.

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  // A session that ends is saved from here, whichever tab is showing.
  useFocusCompletion()
  // Prayer, adhkar and task reminders stay scheduled from here.
  useNotificationSync()

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        // The bar is drawn by TabBar, which reads each screen's title and icon.
        screenOptions={{ headerShown: false }}
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
          tab, the way a mini player does, high enough to clear the raised
          Noor button. */}
      <FocusMiniBar bottom={BAR_HEIGHT + insets.bottom + 40} />
    </View>
  )
}
