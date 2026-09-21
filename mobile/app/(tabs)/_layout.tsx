import { Tabs } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { Home, Timer, Sparkles, Moon, Menu } from 'lucide-react-native'

// Mirrors the web's primary navigation (src/components/layout/Navigation.tsx):
// Home, Focus, Noor, Prayers, and a More sheet for everything else.

const ACTIVE = '#14b8a6' // noor-500

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: dark ? '#83938f' : '#677773',
        tabBarStyle: {
          backgroundColor: dark ? '#070c0b' : '#ffffff',
          borderTopColor: dark ? '#192320' : '#e2e6e5',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="focus"
        options={{ title: 'Focus', tabBarIcon: ({ color, size }) => <Timer color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="noor"
        options={{ title: 'Noor', tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="prayers"
        options={{ title: 'Prayers', tabBarIcon: ({ color, size }) => <Moon color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }}
      />
    </Tabs>
  )
}
