import { useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Check, Trophy, ChevronLeft, Coins, Pause, Flag, ChevronRight, Sparkles, Plus, X } from 'lucide-react-native'
import { HubContent, Muted, Card, GradientButton, FadeIn, SectionHeader, PressableScale, Input } from '~/components/ui'
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

function ActiveRow({
  challenge,
  onTick,
  busy,
  onOpen,
}: {
  challenge: Challenge
  onTick: () => void
  busy: boolean
  onOpen: () => void
}) {
  const today = localDateString()
  const { coinsPerDay } = getChallengeRewards(challenge.category)
  const pct = Math.min(1, challenge.current_days / Math.max(1, challenge.target_days))
  const complete = challenge.status === 'completed'
  const paused = challenge.status === 'paused'
  const failed = challenge.status === 'failed'
  const done = tickedToday(challenge, today)
  return (
    <PressableScale onPress={onOpen} accessibilityLabel={`Open ${challenge.title}`}>
    <Card className={cn('gap-2.5', failed && 'opacity-60')}>
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{challenge.title}</Text>
          <Muted className="text-xs">
            {complete
              ? 'Completed. Alhamdulillah.'
              : failed
                ? `Given up on day ${challenge.current_days} of ${challenge.target_days}`
                : `Day ${challenge.current_days} of ${challenge.target_days}${paused ? ' · paused' : ''}`}
          </Muted>
        </View>
        {complete ? (
          <Trophy size={18} color="#f59e0b" />
        ) : failed ? (
          <Flag size={16} color="#8a9793" />
        ) : paused ? (
          <View className="flex-row items-center gap-1 rounded-full bg-warn-500/10 px-3 py-1.5">
            <Pause size={11} color="#f59e0b" />
            <Text className="text-xs font-semibold text-warn-600 dark:text-warn-400">Paused</Text>
          </View>
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
        <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: complete ? '#f59e0b' : paused || failed ? '#8a9793' : '#8b5cf6' }} />
      </View>
    </Card>
    </PressableScale>
  )
}

// ─── Custom challenge ────────────────────────────────────────────────────────

const CUSTOM_DAYS = [7, 14, 21, 30, 40]
const CATEGORIES = ['spiritual', 'fitness', 'study', 'habit', 'other']

function CustomForm({
  onBack,
  onCreate,
  creating,
}: {
  onBack: () => void
  onCreate: (input: { title: string; checklist: string[]; days: number; start: string; category: string }) => void
  creating: boolean
}) {
  const today = localDateString()
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [days, setDays] = useState(30)
  const [customDays, setCustomDays] = useState('')
  const [startTomorrow, setStartTomorrow] = useState(false)
  const [category, setCategory] = useState('habit')
  const [error, setError] = useState<string | null>(null)
  const rewards = getChallengeRewards(null)
  const total = customDays ? Number(customDays) || 0 : days

  const addItem = () => {
    if (!draft.trim()) return
    setItems((all) => [...all, draft.trim()])
    setDraft('')
  }

  const submit = () => {
    setError(null)
    if (!title.trim()) return setError('Give the challenge a name.')
    if (!Number.isFinite(total) || total < 1 || total > 365) return setError('Choose 1 to 365 days.')
    const start = new Date()
    if (startTomorrow) start.setDate(start.getDate() + 1)
    onCreate({
      title: title.trim(),
      checklist: [...items, draft].map((t) => t.trim()).filter(Boolean),
      days: Math.round(total),
      start: startTomorrow ? localDateString(start) : today,
      category,
    })
  }

  const chip = (active: boolean) =>
    cn('rounded-full border px-3.5 py-2', active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted')
  const chipText = (active: boolean) =>
    cn('text-xs font-semibold', active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        <Pressable accessibilityRole="button" onPress={onBack} className="flex-row items-center gap-1 self-start py-1">
          <ChevronLeft size={18} color="#14b8a6" />
          <Text className="text-sm font-medium text-noor-600 dark:text-noor-400">All challenges</Text>
        </Pressable>
        <GrowHero eyebrow="Custom challenge" title="Your own rules" sub="Name it, decide what a done day means, and how long it runs." />
        <Card className="gap-4">
          <Input label="Name" value={title} onChangeText={setTitle} placeholder="e.g. 30 days of Fajr in the masjid" maxLength={80} />

          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">What counts as a done day</Text>
            {items.map((item, i) => (
              <View key={i} className="flex-row items-center gap-2">
                <Check size={14} color="#10b981" />
                <Text className="flex-1 text-sm text-foreground">{item}</Text>
                <Pressable onPress={() => setItems((all) => all.filter((_, j) => j !== i))} hitSlop={8}>
                  <X size={15} color="#8a9793" />
                </Pressable>
              </View>
            ))}
            <View className="flex-row items-center gap-2">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={addItem}
                placeholder="Add a checklist item"
                placeholderTextColor="#83938f"
                returnKeyType="done"
                className="h-11 flex-1 rounded-xl border border-input bg-card px-3 text-[15px] text-foreground"
              />
              <Pressable onPress={addItem} accessibilityLabel="Add item" className="h-11 w-11 items-center justify-center rounded-xl bg-noor-500/10">
                <Plus size={16} color="#0d9488" />
              </Pressable>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">How many days</Text>
            <View className="flex-row flex-wrap items-center gap-2">
              {CUSTOM_DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    setCustomDays('')
                    setDays(d)
                  }}
                  className={chip(!customDays && days === d)}
                >
                  <Text className={chipText(!customDays && days === d)}>{d} days</Text>
                </Pressable>
              ))}
              <TextInput
                value={customDays}
                onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, ''))}
                placeholder="Other"
                placeholderTextColor="#83938f"
                keyboardType="number-pad"
                maxLength={3}
                className="h-[34px] w-20 rounded-full border border-input bg-card px-3 text-center text-xs text-foreground"
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Starts</Text>
            <View className="flex-row gap-2">
              {[false, true].map((t) => (
                <Pressable key={String(t)} onPress={() => setStartTomorrow(t)} className={chip(startTomorrow === t)}>
                  <Text className={chipText(startTomorrow === t)}>{t ? 'Tomorrow' : 'Today'}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Kind</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)} className={chip(category === c)}>
                  <Text className={chipText(category === c)}>{c[0].toUpperCase() + c.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row items-center gap-2 rounded-xl bg-muted p-3">
            <Coins size={14} color="#d97706" />
            <Muted className="flex-1 text-xs">
              {rewards.coinsPerDay} coins a day, plus {rewards.completionBonus} on completion:{' '}
              {(rewards.coinsPerDay * (total || 0) + rewards.completionBonus).toLocaleString()} in total.
            </Muted>
          </View>
          {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
          <GradientButton onPress={submit} loading={creating}>
            Start challenge
          </GradientButton>
        </Card>
      </View>
    </HubContent>
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
  const router = useRouter()
  const today = localDateString()
  const { data: challenges, isLoading } = useChallenges()
  const createChallenge = useCreateChallenge()
  const increment = useIncrementChallenge()
  const [openTemplate, setOpenTemplate] = useState<ChallengeTemplate | null>(null)
  const [custom, setCustom] = useState(false)
  const open = (c: Challenge) => router.push(`/challenges/${c.id}` as Href)

  const active = useMemo(() => (challenges ?? []).filter((c) => c.status === 'active'), [challenges])
  const paused = useMemo(() => (challenges ?? []).filter((c) => c.status === 'paused'), [challenges])
  const finished = useMemo(
    () => (challenges ?? []).filter((c) => c.status === 'completed' || c.status === 'failed'),
    [challenges],
  )
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
              // The web's format: the daily checklist as a JSON array.
              description: JSON.stringify(level.tasks),
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

  if (custom) {
    return (
      <CustomForm
        onBack={() => setCustom(false)}
        creating={createChallenge.isPending}
        onCreate={({ title, checklist, days, start, category }) =>
          createChallenge.mutate(
            { title, description: JSON.stringify(checklist), target_days: days, start_date: start, category },
            { onSuccess: () => setCustom(false) },
          )
        }
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
              right={
                <Pressable accessibilityRole="button" accessibilityLabel="Open challenge" onPress={() => open(lead)}>
                  <DayRing current={lead.current_days} target={lead.target_days} />
                </Pressable>
              }
              footer={
                <View className="flex-row items-center gap-2">
                <HeroAction
                  icon={<Check size={14} strokeWidth={2.5} color="#115e59" />}
                  disabled={leadDone || (increment.isPending && increment.variables?.id === lead.id)}
                  onPress={() => tick(lead)}
                >
                  {leadDone ? 'Done for today' : `Mark today done · +${leadRewards.coinsPerDay}`}
                </HeroAction>
                <Pressable onPress={() => open(lead)} hitSlop={8} className="flex-row items-center gap-0.5 px-2 py-2">
                  <Text className="text-[13px] font-semibold text-white/90">Details</Text>
                  <ChevronRight size={14} color="rgba(255,255,255,0.9)" />
                </Pressable>
                </View>
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

        {rest.length > 0 || paused.length > 0 ? (
          <FadeIn index={1}>
            <View className="gap-3">
              {rest.map((c) => (
                <ActiveRow key={c.id} challenge={c} onOpen={() => open(c)} busy={increment.isPending && increment.variables?.id === c.id} onTick={() => tick(c)} />
              ))}
              {paused.map((c) => (
                <ActiveRow key={c.id} challenge={c} onOpen={() => open(c)} busy={false} onTick={() => undefined} />
              ))}
            </View>
          </FadeIn>
        ) : null}

        {finished.length > 0 ? (
          <FadeIn index={1}>
            <View className="gap-3">
              <SectionHeader title="Finished" count={finished.length} />
              {finished.slice(0, 5).map((c) => (
                <ActiveRow key={c.id} challenge={c} onOpen={() => open(c)} busy={false} onTick={() => undefined} />
              ))}
            </View>
          </FadeIn>
        ) : null}

        <FadeIn index={2}>
          <View className="gap-3">
            <SectionHeader title="Start something new" description={`${CHALLENGE_TEMPLATES.length} templates, or your own`} />
            <PressableScale onPress={() => setCustom(true)} accessibilityLabel="Create a custom challenge">
              <Card className="flex-row items-center gap-3 border-dashed border-violet-500/40">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
                  <Sparkles size={20} color="#8b5cf6" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold text-foreground">Custom challenge</Text>
                  <Muted className="text-xs">Your own name, checklist and length</Muted>
                </View>
                <ChevronRight size={18} color="#8a9793" />
              </Card>
            </PressableScale>
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
