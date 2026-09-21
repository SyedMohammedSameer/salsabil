import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import {
  ListTodo, BookOpen, Sunrise, Dumbbell, Trophy,
  Users, Trees, BarChart3, User, Settings, ChevronRight,
} from 'lucide-react-native'
import { Screen, Heading, Card } from '~/components/ui'

// Mirrors the web's MoreSheet (src/components/layout/MoreSheet.tsx), in the
// same order, so the two platforms have one information architecture.

const ITEMS = [
  { href: '/tasks', label: 'Tasks', Icon: ListTodo },
  { href: '/quran', label: 'Quran', Icon: BookOpen },
  { href: '/adhkar', label: 'Adhkar', Icon: Sunrise },
  { href: '/workouts', label: 'Workouts', Icon: Dumbbell },
  { href: '/challenges', label: 'Challenges', Icon: Trophy },
  { href: '/rooms', label: 'Study Rooms', Icon: Users },
  { href: '/garden', label: 'Garden', Icon: Trees },
  { href: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { href: '/profile', label: 'Profile', Icon: User },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const

export default function MoreScreen() {
  const router = useRouter()

  return (
    <Screen>
      <View className="py-4">
        <Heading>More</Heading>
      </View>

      <Card className="gap-0 p-0">
        {ITEMS.map(({ href, label, Icon }, i) => (
          <Pressable
            key={href}
            accessibilityRole="button"
            onPress={() => router.push(href)}
            className={`flex-row items-center gap-3 px-4 py-4 ${
              i < ITEMS.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <Icon size={20} color="#14b8a6" />
            <Text className="flex-1 text-base text-foreground">{label}</Text>
            <ChevronRight size={18} color="#83938f" />
          </Pressable>
        ))}
      </Card>
    </Screen>
  )
}
