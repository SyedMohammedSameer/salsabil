import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { Home, Timer, Sparkles, Moon, Menu } from 'lucide-react-native'
import { Gradient, NOOR_GRADIENT } from '~/components/ui'

// Mirrors the web's primary navigation (src/components/layout/Navigation.tsx):
// Home, Focus, Noor, Prayers, and a More sheet for everything else. Noor sits
// in the middle as the gradient orb the web bottom bar uses, so the assistant
// reads as the centre of the app rather than one tab among five.

const ACTIVE = '#14b8a6' // noor-500

function NoorOrb({ focused }: { focused: boolean }) {
  return (
    <Gradient
      colors={NOOR_GRADIENT}
      radius={16}
      style={{
        width: 32,
        height: 32,
        backgroundColor: '#14b8a6',
        shadowColor: '#14b8a6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: focused ? 0.5 : 0.25,
        shadowRadius: 6,
        elevation: focused ? 5 : 2,
        opacity: focused ? 1 : 0.85,
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={16} color="#ffffff" />
      </View>
    </Gradient>
  )
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: dark ? '#83938f' : '#677773',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: dark ? '#070c0b' : '#ffffff',
          borderTopColor: dark ? '#192320' : '#e2e6e5',
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.75} />,
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
        name="noor"
        options={{
          title: 'Noor',
          tabBarIcon: ({ focused }) => <NoorOrb focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: 'Prayers',
          tabBarIcon: ({ color, size }) => <Moon color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  )
}
