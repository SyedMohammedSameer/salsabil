import { useMemo, useState } from 'react'
import { View, Text, TextInput, ActivityIndicator } from 'react-native'
import { useColorScheme } from 'nativewind'
import { ArrowRight, BookOpen } from 'lucide-react-native'
import {
  HubContent,
  Muted,
  Card,
  Gradient,
  GradientButton,
  GRADIENT_BUTTON,
  FadeIn,
  SectionHeader,
} from '~/components/ui'
import {
  useQuranLogs,
  useQuranLogsForDate,
  useTodayQuranPages,
  useWeeklyQuranPages,
  useCreateQuranLog,
} from '@/hooks/useQuranLogs'
import { localDateString, daysAgo } from '@/lib/dates'
import { coinsFor, QURAN_PER_PAGE_COINS } from '@/lib/rewards'
import { surahName, SURAH_COUNT } from '@/data/surahs'

// The Quran section of the Deen hub. Logging goes through the shared
// useCreateQuranLog hook, which awards coins per page via the idempotent ledger.

const MUSHAF_LIGHT = ['#7c5a1e', '#b8860b', '#d6a532'] as const
const MUSHAF_DARK = ['#3f2e0e', '#7a5a0b', '#9c7a1f'] as const

/** Parses a positive integer from free text, or null when it is not one. */
function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  return n > 0 ? n : null
}

function parsePages(raw: string): number | null {
  const trimmed = raw.trim()
  // pages_read is numeric(5,1) in the schema, so half pages are valid.
  if (!/^\d+(\.\d)?$/.test(trimmed)) return null
  const n = Number(trimmed)
  return n > 0 ? n : null
}

// ─── Range box ───────────────────────────────────────────────────────────────
// "From  18 : 45" — a labelled box holding a surah and an ayah field.

function RangeBox({
  label,
  surah,
  ayah,
  onSurah,
  onAyah,
  placeholder,
}: {
  label: string
  surah: string
  ayah: string
  onSurah: (v: string) => void
  onAyah: (v: string) => void
  placeholder: { surah: string; ayah: string }
}) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-card px-3 py-2">
      <Muted className="text-[11px] font-medium">{label}</Muted>
      <View className="flex-row items-center">
        <TextInput
          value={surah}
          onChangeText={onSurah}
          keyboardType="number-pad"
          placeholder={placeholder.surah}
          placeholderTextColor="#9aa8a4"
          maxLength={3}
          accessibilityLabel={`${label} surah`}
          className="min-w-[34px] py-1 text-[18px] font-bold text-foreground"
        />
        <Text className="px-1 text-[18px] font-bold text-muted-foreground">:</Text>
        <TextInput
          value={ayah}
          onChangeText={onAyah}
          keyboardType="number-pad"
          placeholder={placeholder.ayah}
          placeholderTextColor="#9aa8a4"
          maxLength={3}
          accessibilityLabel={`${label} ayah`}
          className="min-w-[34px] flex-1 py-1 text-[18px] font-bold text-foreground"
        />
      </View>
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function QuranScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const today = localDateString()
  const weekStart = useMemo(() => localDateString(daysAgo(6)), [])

  const { data: logs, isLoading } = useQuranLogsForDate(today)
  const { data: allLogs } = useQuranLogs()
  const { data: todayPages } = useTodayQuranPages(today)
  const { data: week } = useWeeklyQuranPages(weekStart, today)
  const createLog = useCreateQuranLog()

  const [surahFrom, setSurahFrom] = useState('')
  const [ayahFrom, setAyahFrom] = useState('')
  const [surahTo, setSurahTo] = useState('')
  const [ayahTo, setAyahTo] = useState('')
  const [pages, setPages] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pagesValue = parsePages(pages)
  const projected = pagesValue ? coinsFor({ kind: 'quran', pages: pagesValue }) : null

  const weekPages = (week ?? []).reduce((sum, d) => sum + d.pages, 0)
  const todayCoins = coinsFor({ kind: 'quran', pages: todayPages ?? 0 }).coins

  // Where the reader stopped last: today's newest log, else the newest overall.
  const last = (logs && logs.length > 0 ? logs[0] : allLogs?.[0]) ?? null

  const continueFromLast = () => {
    if (!last) return
    setSurahFrom(String(last.surah_to))
    setAyahFrom(String(last.ayah_to + 1))
    setSurahTo('')
    setAyahTo('')
    setError(null)
  }

  const submit = () => {
    setError(null)
    const sFrom = parsePositiveInt(surahFrom)
    const aFrom = parsePositiveInt(ayahFrom)
    // Reading within one surah is the common case, so the "to" fields fall
    // back to the "from" values rather than forcing the user to repeat them.
    const sTo = parsePositiveInt(surahTo) ?? sFrom
    const aTo = parsePositiveInt(ayahTo) ?? aFrom

    if (!sFrom || !aFrom || !sTo || !aTo) {
      setError('Enter the surah and ayah you started and finished at.')
      return
    }
    if (sFrom > SURAH_COUNT || sTo > SURAH_COUNT) {
      setError(`There are ${SURAH_COUNT} surahs.`)
      return
    }
    if (sTo < sFrom) {
      setError('The ending surah cannot come before the starting one.')
      return
    }
    if (!pagesValue) {
      setError('Enter how many pages you read.')
      return
    }

    createLog.mutate(
      { date: today, surah_from: sFrom, ayah_from: aFrom, surah_to: sTo, ayah_to: aTo, pages_read: pagesValue },
      {
        onSuccess: () => {
          setSurahFrom('')
          setAyahFrom('')
          setSurahTo('')
          setAyahTo('')
          setPages('')
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not save your reading.'),
      },
    )
  }

  return (
    <HubContent>
      <View className="gap-4 pt-1">
        {/* Mushaf hero */}
        <FadeIn index={0}>
          <Gradient
            colors={dark ? MUSHAF_DARK : MUSHAF_LIGHT}
            radius={24}
            style={{
              backgroundColor: '#b8860b',
              shadowColor: '#b8860b',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.28,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            {/* Ornamental double border, as on a mushaf page. */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', inset: 8, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }}
            />
            <View
              pointerEvents="none"
              style={{ position: 'absolute', inset: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
            />
            <View className="items-center px-6 pb-6 pt-7">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/85">Today</Text>
              <Text className="mt-1 text-[48px] font-bold leading-[52px] tracking-tight text-white">
                {todayPages ?? 0}
                <Text className="text-base font-medium text-white/85">
                  {' '}
                  {todayPages === 1 ? 'page' : 'pages'}
                </Text>
              </Text>
              <Text className="mt-1 text-xs text-white/90">
                +{todayCoins} coins · {weekPages} {weekPages === 1 ? 'page' : 'pages'} this week
              </Text>
              <Text
                className="mt-2.5 text-center text-base text-white/90"
                style={{ fontFamily: 'Amiri', writingDirection: 'rtl' }}
              >
                وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
              </Text>
            </View>
          </Gradient>
        </FadeIn>

        {/* Continue where you stopped */}
        {last ? (
          <FadeIn index={1}>
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10">
                <BookOpen size={20} strokeWidth={1.75} color={dark ? '#fbbf24' : '#d97706'} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-semibold text-foreground" numberOfLines={1}>
                  Continue from {surahName(last.surah_to)} {last.surah_to}:{last.ayah_to + 1}
                </Text>
                <Muted className="text-xs">Where you stopped last time</Muted>
              </View>
              <Text
                onPress={continueFromLast}
                accessibilityRole="button"
                className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-semibold text-foreground"
              >
                Continue
              </Text>
            </Card>
          </FadeIn>
        ) : null}

        {/* Log a reading */}
        <FadeIn index={2}>
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-foreground">Log a reading</Text>
              <Muted className="text-xs">{QURAN_PER_PAGE_COINS} coins per page</Muted>
            </View>
            <View className="flex-row items-center gap-2">
              <RangeBox
                label="From"
                surah={surahFrom}
                ayah={ayahFrom}
                onSurah={setSurahFrom}
                onAyah={setAyahFrom}
                placeholder={{ surah: '1', ayah: '1' }}
              />
              <ArrowRight size={16} color="#8a9793" />
              <RangeBox
                label="To"
                surah={surahTo}
                ayah={ayahTo}
                onSurah={setSurahTo}
                onAyah={setAyahTo}
                placeholder={{ surah: surahFrom || 'same', ayah: ayahFrom || '' }}
              />
              <View className="w-[72px] rounded-xl border border-border bg-card px-3 py-2">
                <Muted className="text-[11px] font-medium">Pages</Muted>
                <TextInput
                  value={pages}
                  onChangeText={setPages}
                  keyboardType="decimal-pad"
                  placeholder="2"
                  placeholderTextColor="#9aa8a4"
                  maxLength={5}
                  accessibilityLabel="Pages read"
                  className="py-1 text-[18px] font-bold text-foreground"
                />
              </View>
            </View>
            {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
            <GradientButton
              colors={GRADIENT_BUTTON.gold}
              onPress={submit}
              loading={createLog.isPending}
            >
              {projected ? `Log reading · +${projected.coins} coins` : 'Log reading'}
            </GradientButton>
          </Card>
        </FadeIn>

        {/* Today's readings */}
        <FadeIn index={3}>
          <View className="gap-3">
            <SectionHeader title="Today's readings" />
            {isLoading ? (
              <ActivityIndicator />
            ) : (logs ?? []).length === 0 ? (
              <Card variant="outline-dashed" className="items-center py-6">
                <Muted className="text-xs">Nothing logged yet today.</Muted>
              </Card>
            ) : (
              <Card className="p-0">
                {(logs ?? []).map((log, i) => (
                  <View
                    key={log.id}
                    className={[
                      'flex-row items-center gap-3 px-4 py-3',
                      i > 0 ? 'border-t border-border' : '',
                    ].join(' ')}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                        {surahName(log.surah_from)} {log.surah_from}:{log.ayah_from} → {log.surah_to}:{log.ayah_to}
                      </Text>
                      {log.surah_to !== log.surah_from ? (
                        <Muted className="text-xs">to {surahName(log.surah_to)}</Muted>
                      ) : null}
                    </View>
                    <View className="rounded-full bg-gold-500/10 px-2.5 py-1">
                      <Text className="text-[11px] font-semibold" style={{ color: dark ? '#fbbf24' : '#b45309' }}>
                        {log.pages_read} {Number(log.pages_read) === 1 ? 'page' : 'pages'}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </FadeIn>
      </View>
    </HubContent>
  )
}
