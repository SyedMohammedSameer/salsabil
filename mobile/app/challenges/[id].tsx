import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Check, Pause, Play, Flag, Trash2, Pencil, Plus, X, Trophy, CalendarDays } from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input, FadeIn } from '~/components/ui'
import { GrowHero, HeroAction } from '~/components/GrowHero'
import {
  useChallenges,
  useIncrementChallenge,
  useUpdateChallenge,
  useUpdateChallengeStatus,
  useDeleteChallenge,
} from '@/hooks/useChallenges'
import { challengeChecklist, getChallengeRewards, parseChallengeCategory, DIFFICULTY_META } from '@/data/challengeTemplates'
import { localDateString } from '@/lib/dates'
import { storage } from '@/lib/platform/storage'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'
import type { Challenge } from '@/lib/database.types'

// One challenge in full: today's checklist, every day of the run as a
// calendar, and the controls to pause, give up, rename, edit the checklist or
// delete it. Ticking the day still goes through useIncrementChallenge, whose
// awards are keyed per day so nothing can be paid twice.

const STATUS_LABEL: Record<Challenge['status'], string> = {
  active: 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Given up',
}

function tickedToday(c: Challenge, today: string) {
  return c.updated_at.slice(0, 10) === today && c.current_days > 0
}

/** Today's checklist ticks live on the device: they are a personal aid, not a record. */
function useDailyChecks(challengeId: string, day: string) {
  const key = `salsabil-challenge-check:${challengeId}:${day}`
  const [checked, setChecked] = useState<string[]>([])
  useEffect(() => {
    void storage.getItem(key).then((raw) => {
      try {
        setChecked(raw ? (JSON.parse(raw) as string[]) : [])
      } catch {
        setChecked([])
      }
    })
  }, [key])
  const toggle = (item: string) =>
    setChecked((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
      void storage.setItem(key, JSON.stringify(next))
      return next
    })
  return { checked, toggle }
}

function DayGrid({ challenge, today, doneToday }: { challenge: Challenge; today: string; doneToday: boolean }) {
  const start = new Date(`${challenge.start_date}T00:00:00`)
  const now = new Date(`${today}T00:00:00`)
  const sinceStart = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  const cell = challenge.target_days <= 14 ? 36 : challenge.target_days <= 40 ? 30 : 22
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {Array.from({ length: challenge.target_days }, (_, i) => {
        const n = i + 1
        const done = n <= challenge.current_days
        // The next slot is today's only while today is still open.
        const isToday = !done && !doneToday && n === challenge.current_days + 1 && challenge.status === 'active' && sinceStart >= i - 1
        return (
          <View
            key={n}
            style={{ width: cell, height: cell }}
            className={cn(
              'items-center justify-center rounded-lg',
              done ? 'bg-violet-500' : isToday ? 'border-[1.5px] border-violet-500 bg-violet-500/10' : 'bg-muted',
            )}
          >
            {cell >= 30 ? (
              <Text className={cn('text-[11px] font-semibold', done ? 'text-white' : isToday ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground')}>
                {n}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()

  const { data: challenges, isLoading } = useChallenges()
  const challenge = useMemo(() => (challenges ?? []).find((c) => c.id === id) ?? null, [challenges, id])
  const increment = useIncrementChallenge()
  const update = useUpdateChallenge()
  const setStatus = useUpdateChallengeStatus()
  const remove = useDeleteChallenge()
  const { checked, toggle } = useDailyChecks(id ?? '', today)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState('')

  if (isLoading) {
    return (
      <Screen>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }
  if (!challenge) {
    return (
      <Screen>
        <Card variant="outline-dashed" className="mt-4 items-center py-8">
          <Muted>This challenge no longer exists.</Muted>
        </Card>
      </Screen>
    )
  }

  const rewards = getChallengeRewards(challenge.category)
  const { difficulty } = parseChallengeCategory(challenge.category)
  const checklist = challengeChecklist(challenge)
  const done = tickedToday(challenge, today)
  const isActive = challenge.status === 'active'
  const daysLeft = challenge.target_days - challenge.current_days
  const end = new Date(`${challenge.start_date}T00:00:00`)
  end.setDate(end.getDate() + challenge.target_days - 1)
  const earned = challenge.current_days * rewards.coinsPerDay + (challenge.status === 'completed' ? rewards.completionBonus : 0)
  const allChecked = checklist.length > 0 && checklist.every((t) => checked.includes(t))

  const tick = () =>
    increment.mutate(
      { id: challenge.id, currentDays: challenge.current_days, targetDays: challenge.target_days, category: challenge.category },
      {
        onSuccess: (c) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          if (c.status === 'completed') toast.success(`Challenge complete. +${rewards.completionBonus} bonus coins`)
        },
      },
    )

  const startEditing = () => {
    setTitle(challenge.title)
    setItems(checklist)
    setDraft('')
    setEditing(true)
  }

  const saveEdits = () => {
    const name = title.trim()
    if (!name) return
    const list = [...items, draft].map((t) => t.trim()).filter(Boolean)
    update.mutate(
      { id: challenge.id, title: name, description: JSON.stringify(list) },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success('Challenge updated')
        },
      },
    )
  }

  const confirm = (titleText: string, body: string, action: string, run: () => void) =>
    Alert.alert(titleText, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: 'destructive', onPress: run },
    ])

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Challenge' }} />
      <View className="gap-4 pb-10 pt-2">
        <FadeIn index={0}>
          <GrowHero
            eyebrow={`${STATUS_LABEL[challenge.status]}${difficulty ? ` · ${DIFFICULTY_META[difficulty].label}` : ''}`}
            title={challenge.title.split(' — ')[0]}
            sub={
              challenge.status === 'completed'
                ? `All ${challenge.target_days} days done. ${earned.toLocaleString()} coins earned.`
                : `Day ${challenge.current_days} of ${challenge.target_days} · ${daysLeft} to go · ends ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            }
            right={challenge.status === 'completed' ? <Trophy size={34} color="#fde68a" /> : undefined}
            footer={
              isActive ? (
                <HeroAction
                  icon={<Check size={14} strokeWidth={2.5} color="#115e59" />}
                  disabled={done || increment.isPending}
                  onPress={tick}
                >
                  {done ? 'Done for today' : `Mark today done · +${rewards.coinsPerDay}`}
                </HeroAction>
              ) : challenge.status === 'paused' ? (
                <HeroAction icon={<Play size={14} color="#115e59" fill="#115e59" />} onPress={() => setStatus.mutate({ id: challenge.id, status: 'active' })}>
                  Resume challenge
                </HeroAction>
              ) : undefined
            }
          />
        </FadeIn>

        {/* Today's checklist, or editing it */}
        <FadeIn index={1}>
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] font-semibold text-foreground">{editing ? 'Edit challenge' : "Today's checklist"}</Text>
              {!editing ? (
                <Pressable onPress={startEditing} hitSlop={8} className="flex-row items-center gap-1">
                  <Pencil size={13} color={dark ? '#2dd4bf' : '#0d9488'} />
                  <Text className="text-xs font-semibold text-noor-600 dark:text-noor-400">Edit</Text>
                </Pressable>
              ) : null}
            </View>

            {editing ? (
              <View className="gap-3">
                <Input label="Name" value={title} onChangeText={setTitle} maxLength={80} />
                <Text className="text-sm font-medium text-foreground">Daily checklist</Text>
                {items.map((item, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <TextInput
                      value={item}
                      onChangeText={(v) => setItems((all) => all.map((x, j) => (j === i ? v : x)))}
                      className="h-11 flex-1 rounded-xl border border-input bg-card px-3 text-[15px] text-foreground"
                      accessibilityLabel={`Checklist item ${i + 1}`}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove item"
                      onPress={() => setItems((all) => all.filter((_, j) => j !== i))}
                      className="h-11 w-11 items-center justify-center rounded-xl bg-muted"
                    >
                      <X size={16} color="#8a9793" />
                    </Pressable>
                  </View>
                ))}
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={() => {
                      if (!draft.trim()) return
                      setItems((all) => [...all, draft.trim()])
                      setDraft('')
                    }}
                    placeholder="Add an item"
                    placeholderTextColor="#83938f"
                    returnKeyType="done"
                    className="h-11 flex-1 rounded-xl border border-dashed border-input bg-card px-3 text-[15px] text-foreground"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add item"
                    onPress={() => {
                      if (!draft.trim()) return
                      setItems((all) => [...all, draft.trim()])
                      setDraft('')
                    }}
                    className="h-11 w-11 items-center justify-center rounded-xl bg-noor-500/10"
                  >
                    <Plus size={16} color={dark ? '#2dd4bf' : '#0d9488'} />
                  </Pressable>
                </View>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button variant="outline" onPress={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button onPress={saveEdits} loading={update.isPending}>
                      Save
                    </Button>
                  </View>
                </View>
              </View>
            ) : checklist.length === 0 ? (
              <Muted className="text-xs">No checklist yet. Tap Edit to add what counts as a done day.</Muted>
            ) : (
              <View className="gap-1">
                {checklist.map((item) => {
                  const on = checked.includes(item)
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => {
                        void Haptics.selectionAsync()
                        toggle(item)
                      }}
                      className="flex-row items-start gap-3 py-1.5"
                    >
                      <View
                        className={cn(
                          'mt-0.5 h-5 w-5 items-center justify-center rounded-md border-[1.5px]',
                          on ? 'border-violet-500 bg-violet-500' : 'border-muted-foreground/50',
                        )}
                      >
                        {on ? <Check size={12} strokeWidth={3} color="#ffffff" /> : null}
                      </View>
                      <Text className={cn('flex-1 text-[14px] text-foreground', on && 'text-muted-foreground line-through')}>{item}</Text>
                    </Pressable>
                  )
                })}
                {isActive && allChecked && !done ? (
                  <Button onPress={tick} loading={increment.isPending} className="mt-2">
                    Everything done · mark today
                  </Button>
                ) : null}
              </View>
            )}
          </Card>
        </FadeIn>

        {/* Every day of the run */}
        <FadeIn index={2}>
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <CalendarDays size={15} color="#8b5cf6" />
              <Text className="flex-1 text-[14px] font-semibold text-foreground">{challenge.target_days} days</Text>
              <Muted className="text-xs">
                {earned.toLocaleString()} coins so far
              </Muted>
            </View>
            <DayGrid challenge={challenge} today={today} doneToday={done} />
            <Muted className="text-xs">
              {rewards.coinsPerDay} coins a day and {rewards.completionBonus.toLocaleString()} for finishing. Started{' '}
              {new Date(`${challenge.start_date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.
            </Muted>
          </Card>
        </FadeIn>

        {/* Controls */}
        <FadeIn index={3}>
          <Card className="p-0">
            {isActive ? (
              <Pressable
                onPress={() => setStatus.mutate({ id: challenge.id, status: 'paused' }, { onSuccess: () => toast.info('Challenge paused') })}
                className="flex-row items-center gap-3 px-4 py-3.5"
              >
                <Pause size={17} color="#f59e0b" />
                <View className="flex-1">
                  <Text className="text-[14px] font-medium text-foreground">Pause</Text>
                  <Muted className="text-xs">Travelling or ill? Pick it up again later.</Muted>
                </View>
              </Pressable>
            ) : null}
            {challenge.status === 'active' || challenge.status === 'paused' ? (
              <Pressable
                onPress={() =>
                  confirm('Give up this challenge?', 'Days done so far keep their coins. You can start a new one any time.', 'Give up', () =>
                    setStatus.mutate({ id: challenge.id, status: 'failed' }),
                  )
                }
                className={cn('flex-row items-center gap-3 px-4 py-3.5', isActive && 'border-t border-border')}
              >
                <Flag size={17} color="#8a9793" />
                <View className="flex-1">
                  <Text className="text-[14px] font-medium text-foreground">Give up</Text>
                  <Muted className="text-xs">Ends it without the completion bonus</Muted>
                </View>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                confirm('Delete this challenge?', 'It is removed from your list. Coins already earned stay.', 'Delete', () =>
                  remove.mutate(challenge.id, {
                    onSuccess: () => {
                      toast.success('Challenge deleted')
                      router.back()
                    },
                  }),
                )
              }
              className={cn('flex-row items-center gap-3 px-4 py-3.5', challenge.status !== 'completed' && challenge.status !== 'failed' && 'border-t border-border')}
            >
              <Trash2 size={17} color="#ef4444" />
              <Text className="flex-1 text-[14px] font-medium text-danger-500">Delete</Text>
            </Pressable>
          </Card>
        </FadeIn>
      </View>
    </Screen>
  )
}
