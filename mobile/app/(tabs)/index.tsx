import { View, Text, ActivityIndicator, RefreshControl, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Coins, Flame, Moon, ListTodo, BookOpen, Timer,
} from 'lucide-react-native'
import { Heading, Muted, Card, Button } from '~/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { localDateString } from '@/lib/dates'

// Ported from src/views/dashboard/DashboardView.tsx. Every number here comes
// from the shared useDashboardStats hook, which is the same query the web app
// runs — including the coins and streak the rebuilt economy drives.

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
}) {
  return (
    <Card className="min-w-[45%] flex-1 gap-1">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-2xl font-semibold text-foreground">{value}</Text>
      </View>
      <Muted className="text-xs">{label}</Muted>
    </Card>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const today = localDateString()
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const { data: stats, isLoading, isRefetching, refetch } = useDashboardStats(today)

  const greeting = profile?.display_name ?? user?.email?.split('@')[0] ?? 'friend'
  const dash = (v: number | undefined) => (isLoading ? '—' : (v ?? 0))

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <View className="gap-1 py-4">
          <Muted>Assalamu alaikum</Muted>
          <Heading>{greeting}</Heading>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <StatTile
            icon={<Coins size={20} color="#f59e0b" />}
            value={dash(stats?.coins)}
            label="Coins"
          />
          <StatTile
            icon={<Flame size={20} color="#f87171" />}
            value={dash(stats?.streak)}
            label="Day streak"
          />
          <StatTile
            icon={<Moon size={20} color="#14b8a6" />}
            value={isLoading ? '—' : `${stats?.prayers ?? 0}/5`}
            label="Prayers today"
          />
          <StatTile
            icon={<Timer size={20} color="#10b981" />}
            value={isLoading ? '—' : `${stats?.focusMinutes ?? 0}m`}
            label="Focused today"
          />
          <StatTile
            icon={<ListTodo size={20} color="#14b8a6" />}
            value={
              isLoading
                ? '—'
                : `${stats?.tasks?.completed ?? 0}/${stats?.tasks?.total ?? 0}`
            }
            label="Tasks done"
          />
          <StatTile
            icon={<BookOpen size={20} color="#f59e0b" />}
            value={dash(stats?.quranPages)}
            label="Quran pages"
          />
        </View>

        {isLoading ? (
          <View className="py-6">
            <ActivityIndicator />
          </View>
        ) : null}

        <View className="gap-3 pt-6">
          <Muted>Jump back in</Muted>
          <Button variant="outline" onPress={() => router.push('/prayers')}>
            Log a prayer
          </Button>
          <Button variant="outline" onPress={() => router.push('/focus')}>
            Start a focus session
          </Button>
          <Button variant="outline" onPress={() => router.push('/tasks')}>
            Today&apos;s tasks
          </Button>
        </View>

        <View className="pt-10">
          <Button variant="ghost" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
