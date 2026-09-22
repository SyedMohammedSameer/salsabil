import { useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Check, Trophy, ChevronLeft, Coins } from 'lucide-react-native'
import { HubContent, Muted, Card, GradientButton, FadeIn, SectionHeader, PressableScale } from '~/components/ui'
import { GrowHero, HeroAction } from '~/components/GrowHero'
import { useChallenges, useCreateChallenge, useIncrementChallenge } from '@/hooks/useChallenges'
import { localDateString } from '@/lib/dates'
import {
  CHALLENGE_TEMPLATES,
  DIFFICULTY_META,
  encodeChallengeCategory,
  getChallengeRewards,
  type ChallengeDifficulty,
  type ChallengeTemplate,
} from '@/data/challengeTemplates'
import { cn } from '@/lib/cn'
import type { Challenge } from '@/lib/database.types'

// The Challenges section of the Grow hub. Templates and per-level rewards
// come from the shared src/data/challengeTemplates.ts; ticking a day goes
// through useIncrementChallenge, whose daily and completion awards are
// separately keyed in the ledger so a retry cannot pay twice.

const DIFFICULTY_COLOR: Record<ChallengeDifficulty, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
}
const DIFFICULTIES: ChallengeDifficulty[] = ['easy', 'medium', 'hard']

function tickedToday(c: Challenge, today: string) {
  // updated_at moves whenever a day is ticked, so same-day means already done.
  return c.updated_at.slice(0, 10) === today && c.current_days > 0
}

function DayRing({ current, target }: { current: number; target: number }) {
  const size = 72
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(1, current / target) : 0
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#ffffff" strokeOpacity={0.22} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text className="text-[18px] font-bold leading-5 text-white">{current}</Text>
      <Text className="text-[9px] text-white/80">of {target}</Text>
    </View>
  )
}

function ActiveRow({ challenge, onTick, busy }: { challenge: Challenge; onTick: () => void; busy: boolean }) {
  const today = localDateString()
  const { coinsPerDay } = getChallengeRewards(challenge.category)
  const pct = Math.min(1, challenge.current_days / Math.max(1, challenge.target_days))
  const complete = challenge.status === 'completed'
  const done = tickedToday(challenge, today)
  return (
    <Card className="gap-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{challenge.title}</Text>
          <Muted className="text-xs">
            {complete ? 'Completed. Alhamdulillah.' : `Day ${challenge.current_days} of ${challenge.target_days}`}
          </Muted>
        </View>
        {complete ? (
          <Trophy size={18} color="#f59e0b" />
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={done || busy}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              onTick()
            }}
            className={cn('rounded-full px-3 py-1.5', done ? 'bg-accentGreen-500/10' : 'bg-violet-500/10')}
          >
            <Text className={cn('text-xs font-semibold', done ? 'text-accentGreen-600 dark:text-accentGreen-400' : 'text-violet-600 dark:text-violet-400')}>
              {done ? 'Done today' : `Mark done · +${coinsPerDay}`}
            </Text>
          </Pressable>
        )}
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: complete ? '#f59e0b' : '#8b5cf6' }} />
      </View>
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
    <HubContent>
      <View className="gap-4 pt-1">
        <Pressable accessibilityRole="button" onPress={onBack} className="flex-row items-center gap-1 self-start py-1">
          <ChevronLeft size={18} color="#14b8a6" />
          <Text className="text-sm font-medium text-noor-600 dark:text-noor-400">All challenges</Text>
        </Pressable>

        <GrowHero eyebrow="Challenge" title={`${template.emoji} ${template.name}`} sub={template.tagline} />

        <Card className="gap-3">
          <Text className="text-[13px] font-semibold text-foreground">Difficulty</Text>
          <View className="flex-row gap-2">
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d
              const color = DIFFICULTY_COLOR[d]
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    selectLevel(d)
                  }}
                  className="flex-1 items-center rounded-xl border py-2.5"
                  style={{ borderColor: active ? color : 'transparent', backgroundColor: active ? `${color}1f` : 'rgba(127,127,127,0.08)' }}
                >
                  <Text className="text-xs font-semibold" style={{ color: active ? color : '#8a9793' }}>
                    {DIFFICULTY_META[d].label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text className="pt-1 text-[13px] font-semibold text-foreground">{level.label}</Text>
          <View className="gap-1.5">
            {level.tasks.map((task) => (
              <View key={task} className="flex-row items-start gap-2">
                <Check size={14} color="#10b981" style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm text-foreground/85">{task}</Text>
              </View>
            ))}
          </View>

          <Text className="pt-1 text-[13px] font-semibold text-foreground">How many days?</Text>
          <View className="flex-row flex-wrap gap-2">
            {level.suggestedDays.map((d) => {
              const active = days === d
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    setDays(d)
                  }}
                  className={cn('rounded-full border px-4 py-2', active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted')}
                >
                  <Text className={cn('text-xs font-semibold', active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                    {d} days
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View className="flex-row items-center gap-2 rounded-xl bg-muted p-3">
            <Coins size={14} color="#d97706" />
            <Muted className="flex-1 text-xs">
              {level.coinsPerDay} coins a day, plus {level.completionBonus.toLocaleString()} on completion:{' '}
              {(level.coinsPerDay * days + level.completionBonus).toLocaleString()} in total.
            </Muted>
          </View>

          <GradientButton onPress={() => onStart(difficulty, days)} loading={starting}>
            Start challenge
          </GradientButton>
        </Card>
      </View>
    </HubContent>
  )
}

export default function ChallengesScreen() {
  const today = localDateString()
  const { data: challenges, isLoading } = useChallenges()
  const createChallenge = useCreateChallenge()
  const increment = useIncrementChallenge()
  const [openTemplate, setOpenTemplate] = useState<ChallengeTemplate | null>(null)

  const active = useMemo(() => (challenges ?? []).filter((c) => c.status === 'active'), [challenges])
  const completed = useMemo(() => (challenges ?? []).filter((c) => c.status === 'completed'), [challenges])
  const lead = active[0] ?? null
  const rest = active.slice(1)

  const tick = (c: Challenge) =>
    increment.mutate({ id: c.id, currentDays: c.current_days, targetDays: c.target_days, category: c.category })

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
              start_date: today,
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

  const leadRewards = lead ? getChallengeRewards(lead.category) : null
  const leadDone = lead ? tickedToday(lead, today) : false

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        <FadeIn index={0}>
          {lead && leadRewards ? (
            <GrowHero
              eyebrow="In progress"
              title={lead.title.split(' — ')[0]}
              sub={`${lead.target_days - lead.current_days} days to go · ${leadRewards.coinsPerDay} a day, ${leadRewards.completionBonus.toLocaleString()} on completion`}
              right={<DayRing current={lead.current_days} target={lead.target_days} />}
              footer={
                <HeroAction
                  icon={<Check size={14} strokeWidth={2.5} color="#115e59" />}
                  disabled={leadDone || (increment.isPending && increment.variables?.id === lead.id)}
                  onPress={() => tick(lead)}
                >
                  {leadDone ? 'Done for today' : `Mark today done · +${leadRewards.coinsPerDay}`}
                </HeroAction>
              }
            />
          ) : (
            <GrowHero
              eyebrow="Challenges"
              title={isLoading ? 'Loading…' : 'Nothing running'}
              sub="Commit to something hard. Get rewarded properly for finishing it."
            />
          )}
        </FadeIn>

        {rest.length > 0 || completed.length > 0 ? (
          <FadeIn index={1}>
            <View className="gap-3">
              {rest.map((c) => (
                <ActiveRow key={c.id} challenge={c} busy={increment.isPending && increment.variables?.id === c.id} onTick={() => tick(c)} />
              ))}
              {completed.slice(0, 3).map((c) => (
                <ActiveRow key={c.id} challenge={c} busy={false} onTick={() => undefined} />
              ))}
            </View>
          </FadeIn>
        ) : null}

        <FadeIn index={2}>
          <View className="gap-3">
            <SectionHeader title="Start something new" description={`${CHALLENGE_TEMPLATES.length} templates`} />
            {CHALLENGE_TEMPLATES.map((template) => {
              const easy = template.levels.easy
              return (
                <PressableScale key={template.id} onPress={() => setOpenTemplate(template)} accessibilityLabel={`${template.name}. ${template.tagline}`}>
                  <Card className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
                      <Text className="text-[24px] leading-7">{template.emoji}</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[15px] font-semibold text-foreground">{template.name}</Text>
                      <Muted className="text-xs" numberOfLines={2}>{template.tagline}</Muted>
                    </View>
                    <View className="rounded-full bg-violet-500/10 px-2.5 py-1">
                      <Text className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">{easy.suggestedDays[0]}d+</Text>
                    </View>
                  </Card>
                </PressableScale>
              )
            })}
          </View>
        </FadeIn>
      </View>
    </HubContent>
  )
}
