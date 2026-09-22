import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useColorScheme } from 'nativewind'
import {
  Moon,
  Timer,
  BookOpen,
  CheckSquare,
  Dumbbell,
  Target,
  Sunrise,
  Flame,
  Droplets,
  Award,
} from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input, Gradient, FadeIn, SectionHeader } from '~/components/ui'
import { GROW_HERO } from '~/components/GrowHero'
import { relativeDay } from '~/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { getCoinTransactions } from '@/lib/api/coins'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { CoinAction } from '@/lib/database.types'

// Profile: identity and stats in a hero, editable details, and the coin
// ledger. Ported from src/views/profile/ProfileView.tsx.

const ACTION_ICON: Record<CoinAction, { Icon: typeof Moon; bg: string; color: string; dark: string }> = {
  prayer_logged: { Icon: Moon, bg: 'bg-noor-500/10', color: '#0d9488', dark: '#2dd4bf' },
  focus_complete: { Icon: Timer, bg: 'bg-noor-500/10', color: '#0d9488', dark: '#2dd4bf' },
  quran_page: { Icon: BookOpen, bg: 'bg-gold-500/10', color: '#d97706', dark: '#fbbf24' },
  task_complete: { Icon: CheckSquare, bg: 'bg-accentGreen-500/10', color: '#059669', dark: '#34d399' },
  workout_logged: { Icon: Dumbbell, bg: 'bg-rose-500/10', color: '#e11d48', dark: '#fb7185' },
  challenge_complete: { Icon: Target, bg: 'bg-violet-500/10', color: '#7c3aed', dark: '#a78bfa' },
  adhkar_complete: { Icon: Sunrise, bg: 'bg-indigo-500/10', color: '#4f46e5', dark: '#818cf8' },
  streak_bonus: { Icon: Flame, bg: 'bg-warn-500/10', color: '#d97706', dark: '#fbbf24' },
  tree_purchase: { Icon: Droplets, bg: 'bg-emerald-500/10', color: '#059669', dark: '#34d399' },
  achievement_bonus: { Icon: Award, bg: 'bg-gold-500/10', color: '#d97706', dark: '#fbbf24' },
}

export default function ProfileScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const today = localDateString()

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
      { display_name: displayName.trim() || null, username: username.trim() || null },
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

  const name = profile?.display_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'Friend'
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <Screen>
      <View className="gap-4 pb-6 pt-2">
        <FadeIn index={0}>
          <Gradient
            colors={GROW_HERO}
            radius={24}
            orbs
            style={{
              backgroundColor: '#0f766e',
              shadowColor: '#0f766e',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.28,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            <View className="gap-3.5 px-5 pb-4 pt-[18px]">
              <View className="flex-row items-center gap-3.5">
                <View className="h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/20">
                  <Text className="text-[22px] font-bold text-white">{name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[22px] font-bold leading-7 tracking-tight text-white" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-xs text-white/80" numberOfLines={1}>
                    {profile?.username ? `@${profile.username} · ` : ''}
                    {user?.email}
                  </Text>
                  {since ? <Text className="mt-0.5 text-xs text-white/80">Growing since {since}</Text> : null}
                </View>
              </View>
              <View className="flex-row">
                {[
                  { v: (profile?.coins ?? 0).toLocaleString(), k: 'coins' },
                  { v: String(profile?.streak ?? 0), k: 'day streak' },
                  { v: String(Math.max(profile?.longest_streak ?? 0, profile?.streak ?? 0)), k: 'best streak' },
                ].map((c, i) => (
                  <View key={c.k} className={cn('flex-1', i > 0 && 'border-l border-white/20 pl-3')}>
                    <Text className="text-[20px] font-bold leading-6 text-white">{c.v}</Text>
                    <Text className="text-[11px] text-white/80">{c.k}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Gradient>
        </FadeIn>

        <FadeIn index={1}>
          <Card className="gap-3">
            <Text className="text-[13px] font-semibold text-foreground">Your details</Text>
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
              error={updateProfile.isError ? 'That username may already be taken. Try another.' : null}
            />
            <Button onPress={save} loading={updateProfile.isPending}>
              {saved ? 'Saved' : 'Save changes'}
            </Button>
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <View className="gap-3">
            <SectionHeader title="Coin activity" description="Most recent first" />
            {(transactions ?? []).length === 0 ? (
              <Card variant="outline-dashed" className="items-center py-6">
                <Muted className="text-xs">Nothing yet. Log a prayer to get started.</Muted>
              </Card>
            ) : (
              <Card className="p-0">
                {(transactions ?? []).slice(0, 20).map((tx, i) => {
                  const meta = ACTION_ICON[tx.action] ?? ACTION_ICON.achievement_bonus
                  const when = new Date(tx.created_at)
                  return (
                    <View key={tx.id} className={cn('flex-row items-center gap-3 px-4 py-2.5', i > 0 && 'border-t border-border')}>
                      <View className={cn('h-[34px] w-[34px] items-center justify-center rounded-[10px]', meta.bg)}>
                        <meta.Icon size={16} strokeWidth={1.75} color={dark ? meta.dark : meta.color} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          {tx.description ?? tx.action.replace(/_/g, ' ')}
                        </Text>
                        <Muted className="text-[11px]">
                          {relativeDay(localDateString(when), today)} · {when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </Muted>
                      </View>
                      <Text className={cn('text-sm font-semibold', tx.amount >= 0 ? 'text-accentGreen-600 dark:text-accentGreen-400' : 'text-danger-500')}>
                        {tx.amount >= 0 ? '+' : '−'}
                        {Math.abs(tx.amount)}
                      </Text>
                    </View>
                  )
                })}
              </Card>
            )}
          </View>
        </FadeIn>
      </View>
    </Screen>
  )
}
