import { View, Text } from 'react-native'
import { Link } from 'expo-router'
import { Coins, Flame } from 'lucide-react-native'
import { Screen, Heading, Muted, Card, Button } from '~/components/ui'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'

// This screen is intentionally live rather than a placeholder: it exercises
// the whole shared stack end to end — Supabase client, auth session, React
// Query cache and the profile hook, all imported unchanged from ../src. If
// this renders real numbers, the foundation is sound.

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number | string
  label: string
}) {
  return (
    <Card className="flex-1 gap-1">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-2xl font-semibold text-foreground">{value}</Text>
      </View>
      <Muted className="text-xs">{label}</Muted>
    </Card>
  )
}

export default function HomeScreen() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()

  const greeting = profile?.display_name ?? user?.email?.split('@')[0] ?? 'friend'

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Muted>Assalamu alaikum</Muted>
        <Heading>{greeting}</Heading>
      </View>

      <View className="flex-row gap-3">
        <Stat
          icon={<Coins size={20} color="#f59e0b" />}
          value={isLoading ? '—' : (profile?.coins ?? 0)}
          label="Coins"
        />
        <Stat
          icon={<Flame size={20} color="#f87171" />}
          value={isLoading ? '—' : (profile?.streak ?? 0)}
          label="Day streak"
        />
      </View>

      <View className="gap-3 pt-6">
        <Muted>Jump back in</Muted>
        <Link href="/focus" asChild>
          <Button variant="outline">Start a focus session</Button>
        </Link>
        <Link href="/prayers" asChild>
          <Button variant="outline">Log a prayer</Button>
        </Link>
      </View>

      <View className="pt-10">
        <Button variant="ghost" onPress={signOut}>
          Sign out
        </Button>
      </View>
    </Screen>
  )
}
