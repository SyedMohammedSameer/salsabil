import { useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Check, Trophy, Flame, ChevronLeft, Coins } from 'lucide-react-native'
import { Screen, Heading, Muted, Card, Button } from '~/components/ui'
import {
  useChallenges,
  useCreateChallenge,
  useIncrementChallenge,
} from '@/hooks/useChallenges'
import { localDateString } from '@/lib/dates'
import {
  CHALLENGE_TEMPLATES,
  DIFFICULTY_META,
  encodeChallengeCategory,
  getChallengeRewards,
  parseChallengeCategory,
  type ChallengeDifficulty,
  type ChallengeTemplate,
} from '@/data/challengeTemplates'
import type { Challenge } from '@/lib/database.types'

// Ported from src/views/challenges/ChallengesView.tsx. The templates and their
// per-level rewards come from the shared src/data/challengeTemplates.ts, and
// ticking a day goes through useIncrementChallenge — whose daily and completion
// awards are now separately keyed in the ledger, so a retry cannot pay twice.

const DIFFICULTY_COLOR: Record<ChallengeDifficulty, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
}

const DIFFICULTIES: ChallengeDifficulty[] = ['easy', 'medium', 'hard']

function ActiveChallenge({
  challenge,
  onTick,
  busy,
}: {
  challenge: Challenge
  onTick: () => void
  busy: boolean
}) {
  const today = localDateString()
  const { coinsPerDay } = getChallengeRewards(challenge.category)
  const pct = Math.min(1, challenge.current_days / Math.max(1, challenge.target_days))
  const complete = challenge.status === 'completed'

  // updated_at moves whenever a day is ticked, so same-day means already done.
  const tickedToday = challenge.updated_at.slice(0, 10) === today && challenge.current_days > 0

  return (
    <Card className="gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-foreground">{challenge.title}</Text>
          <Muted className="text-xs">
            Day {challenge.current_days} of {challenge.target_days}
          </Muted>
        </View>
        {complete ? <Trophy size={18} color="#f59e0b" /> : <Flame size={18} color="#f87171" />}
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: complete ? '#f59e0b' : '#14b8a6' }}
        />
      </View>

      {complete ? (
        <View className="flex-row items-center gap-2">
          <Trophy size={14} color="#f59e0b" />
          <Text className="text-sm text-foreground">Completed. Alhamdulillah.</Text>
        </View>
      ) : (
        <Button onPress={onTick} loading={busy} disabled={tickedToday}>
          {tickedToday ? 'Done for today' : `Mark today done — +${coinsPerDay} coins`}
        </Button>
      )}
    </Card>
  )
}

function TemplateDetail({
  template,
  onBack,
  onStart,
  starting,
}: {
  template: ChallengeTemplate
  onBack: () => void
  onStart: (difficulty: ChallengeDifficulty, days: number) => void
  starting: boolean
}) {
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('easy')
  const level = template.levels[difficulty]
  const [days, setDays] = useState(level.defaultDays)

  // Day options are per level, so switching level must re-seed the choice.
  const selectLevel = (d: ChallengeDifficulty) => {
    setDifficulty(d)
    setDays(template.levels[d].defaultDays)
  }

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        className="flex-row items-center gap-1 py-4"
      >
        <ChevronLeft size={18} color="#14b8a6" />
        <Text className="text-sm text-primary">All challenges</Text>
      </Pressable>

      <View className="gap-1 pb-4">
        <Text className="text-4xl">{template.emoji}</Text>
        <Heading>{template.name}</Heading>
        <Muted>{template.tagline}</Muted>
      </View>

      <View className="gap-1.5 pb-4">
        <Text className="text-sm font-medium text-foreground">Difficulty</Text>
        <View className="flex-row gap-2">
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d
            const color = DIFFICULTY_COLOR[d]
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectLevel(d)}
                className="flex-1 items-center rounded-lg border py-2.5"
                style={{
                  borderColor: active ? color : 'transparent',
                  backgroundColor: active ? `${color}1a` : 'rgba(127,127,127,0.08)',
                }}
              >
                <Text className="text-xs" style={{ color: active ? color : '#83938f' }}>
                  {DIFFICULTY_META[d].label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <Card className="gap-3">
        <Text className="text-sm font-semibold text-foreground">{level.label}</Text>

        <View className="gap-1.5">
          {level.tasks.map((task) => (
            <View key={task} className="flex-row items-start gap-2">
              <Check size={14} color="#10b981" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-foreground/80">{task}</Text>
            </View>
          ))}
        </View>

        <View className="gap-1.5 pt-1">
          <Text className="text-sm font-medium text-foreground">How many days?</Text>
          <View className="flex-row flex-wrap gap-2">
            {level.suggestedDays.map((d) => {
              const active = days === d
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDays(d)}
                  className="rounded-lg border px-4 py-2"
                  style={{
                    borderColor: active ? '#14b8a6' : 'transparent',
                    backgroundColor: active ? 'rgba(20,184,166,0.1)' : 'rgba(127,127,127,0.08)',
                  }}
                >
                  <Text
                    className="text-xs"
                    style={{ color: active ? '#14b8a6' : '#83938f' }}
                  >
                    {d} days
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View className="flex-row items-center gap-2 rounded-lg bg-muted p-3">
          <Coins size={14} color="#f59e0b" />
          <Muted className="flex-1 text-xs">
            {level.coinsPerDay} coins a day, plus {level.completionBonus.toLocaleString()} on
            completion — {(level.coinsPerDay * days + level.completionBonus).toLocaleString()} in
            total.
          </Muted>
        </View>

        <Button onPress={() => onStart(difficulty, days)} loading={starting}>
          Start challenge
        </Button>
      </Card>
    </Screen>
  )
}

export default function ChallengesScreen() {
  const { data: challenges, isLoading } = useChallenges()
  const createChallenge = useCreateChallenge()
  const increment = useIncrementChallenge()
  const [openTemplate, setOpenTemplate] = useState<ChallengeTemplate | null>(null)

  const active = useMemo(
    () => (challenges ?? []).filter((c) => c.status === 'active' || c.status === 'completed'),
    [challenges],
  )

  if (openTemplate) {
    return (
      <TemplateDetail
        template={openTemplate}
        onBack={() => setOpenTemplate(null)}
        starting={createChallenge.isPending}
        onStart={(difficulty, days) => {
          const level = openTemplate.levels[difficulty]
          createChallenge.mutate(
            {
              title: `${openTemplate.name} — ${level.label}`,
              description: level.tasks.join(' · '),
              target_days: days,
              start_date: localDateString(),
              // The category encodes template + difficulty, which is how
              // getChallengeRewards recovers the per-level payout later.
              category: encodeChallengeCategory(openTemplate.id, difficulty),
            },
            { onSuccess: () => setOpenTemplate(null) },
          )
        }}
      />
    )
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Heading>Challenges</Heading>
        <Muted>Commit to something hard. Get rewarded properly for finishing it.</Muted>
      </View>

      {isLoading ? <ActivityIndicator /> : null}

      {active.length > 0 ? (
        <View className="gap-3 pb-6">
          <Muted>In progress</Muted>
          {active.map((c) => (
            <ActiveChallenge
              key={c.id}
              challenge={c}
              busy={increment.isPending && increment.variables?.id === c.id}
              onTick={() =>
                increment.mutate({
                  id: c.id,
                  currentDays: c.current_days,
                  targetDays: c.target_days,
                  category: c.category,
                })
              }
            />
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <Muted>Start something new</Muted>
        {CHALLENGE_TEMPLATES.map((template) => {
          const easy = template.levels.easy
          return (
            <Pressable
              key={template.id}
              accessibilityRole="button"
              accessibilityLabel={`${template.name}. ${template.tagline}`}
              onPress={() => setOpenTemplate(template)}
            >
              <Card className="flex-row items-center gap-3">
                <Text className="text-3xl">{template.emoji}</Text>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-foreground">{template.name}</Text>
                  <Muted className="text-xs">{template.tagline}</Muted>
                </View>
                <View className="items-end">
                  <Text className="text-[11px] text-muted-foreground">from</Text>
                  <Text className="text-xs font-medium text-foreground">
                    {easy.suggestedDays[0]} days
                  </Text>
                </View>
              </Card>
            </Pressable>
          )
        })}
      </View>
    </Screen>
  )
}
