import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Coins, Flame, Trophy, Calendar } from 'lucide-react-native'
import { Screen, Heading, Muted, Card, Button, Input } from '~/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { getCoinTransactions } from '@/lib/api/coins'

// Ported from src/views/profile/ProfileView.tsx.

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
}) {
  return (
    <Card className="flex-1 gap-1">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xl font-semibold text-foreground">{value}</Text>
      </View>
      <Muted className="text-[11px]">{label}</Muted>
    </Card>
  )
}

export default function ProfileScreen() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [saved, setSaved] = useState(false)

  // Seed the form once the profile arrives, without clobbering edits in flight.
  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setUsername(profile.username ?? '')
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: transactions } = useQuery({
    queryKey: ['coin-transactions', user?.id ?? ''],
    queryFn: () => getCoinTransactions(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  const save = () => {
    if (!user) return
    setSaved(false)
    updateProfile.mutate(
      {
        display_name: displayName.trim() || null,
        username: username.trim() || null,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  if (isLoading) {
    return (
      <Screen>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Heading>Profile</Heading>
        <Muted>{user?.email}</Muted>
      </View>

      <View className="flex-row gap-3">
        <Stat
          icon={<Coins size={16} color="#f59e0b" />}
          value={profile?.coins ?? 0}
          label="Coins"
        />
        <Stat
          icon={<Flame size={16} color="#f87171" />}
          value={profile?.streak ?? 0}
          label="Streak"
        />
        <Stat
          icon={<Trophy size={16} color="#f59e0b" />}
          value={profile?.longest_streak ?? 0}
          label="Best"
        />
      </View>

      <Card className="mt-4 gap-3">
        <Text className="text-sm font-medium text-foreground">Your details</Text>
        <Input
          label="Display name"
          value={displayName}
          onChangeText={(v) => {
            setDisplayName(v)
            setSaved(false)
          }}
          placeholder="How should we greet you?"
        />
        <Input
          label="Username"
          value={username}
          onChangeText={(v) => {
            setUsername(v)
            setSaved(false)
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="unique handle"
          error={
            updateProfile.isError
              ? 'That username may already be taken. Try another.'
              : null
          }
        />
        <Button onPress={save} loading={updateProfile.isPending}>
          {saved ? 'Saved' : 'Save changes'}
        </Button>
      </Card>

      {profile?.created_at ? (
        <View className="flex-row items-center gap-2 pt-4">
          <Calendar size={14} color="#83938f" />
          <Muted className="text-xs">
            Growing since {new Date(profile.created_at).toLocaleDateString()}
          </Muted>
        </View>
      ) : null}

      <View className="gap-2 pt-6">
        <Muted>Recent coin activity</Muted>
        {(transactions ?? []).length === 0 ? (
          <Muted className="py-4 text-center text-xs">
            Nothing yet. Log a prayer to get started.
          </Muted>
        ) : (
          (transactions ?? []).slice(0, 15).map((tx) => (
            <Card key={tx.id} className="flex-row items-center gap-3 py-2.5">
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {tx.description ?? tx.action.replace(/_/g, ' ')}
                </Text>
                <Muted className="text-[10px]">
                  {new Date(tx.created_at).toLocaleDateString()}
                </Muted>
              </View>
              <Text
                className="text-sm font-semibold"
                style={{ color: tx.amount >= 0 ? '#10b981' : '#f87171' }}
              >
                {tx.amount >= 0 ? '+' : ''}
                {tx.amount}
              </Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  )
}
