import { useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { BookOpen } from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input } from '~/components/ui'
import {
  useQuranLogsForDate,
  useTodayQuranPages,
  useCreateQuranLog,
} from '@/hooks/useQuranLogs'
import { localDateString } from '@/lib/dates'
import { coinsFor, QURAN_PER_PAGE_COINS } from '@/lib/rewards'

// Ported from src/views/quran/QuranView.tsx. Logging goes through the shared
// useCreateQuranLog hook, which awards coins per page via the idempotent ledger.

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

export default function QuranScreen() {
  const today = localDateString()
  const { data: logs, isLoading } = useQuranLogsForDate(today)
  const { data: todayPages } = useTodayQuranPages(today)
  const createLog = useCreateQuranLog()

  const [surahFrom, setSurahFrom] = useState('')
  const [ayahFrom, setAyahFrom] = useState('')
  const [surahTo, setSurahTo] = useState('')
  const [ayahTo, setAyahTo] = useState('')
  const [pages, setPages] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pagesValue = parsePages(pages)
  const projected = pagesValue ? coinsFor({ kind: 'quran', pages: pagesValue }) : null

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
    if (sFrom > 114 || sTo > 114) {
      setError('There are 114 surahs.')
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
      {
        date: today,
        surah_from: sFrom,
        ayah_from: aFrom,
        surah_to: sTo,
        ayah_to: aTo,
        pages_read: pagesValue,
      },
      {
        onSuccess: () => {
          setSurahFrom('')
          setAyahFrom('')
          setSurahTo('')
          setAyahTo('')
          setPages('')
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : 'Could not save your reading.'),
      },
    )
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Muted>{QURAN_PER_PAGE_COINS} coins per page. May Allah accept your recitation.</Muted>
      </View>

      <Card className="flex-row items-center gap-3">
        <BookOpen size={20} color="#f59e0b" />
        <View>
          <Text className="text-2xl font-semibold text-foreground">{todayPages ?? 0}</Text>
          <Muted className="text-xs">pages today</Muted>
        </View>
      </Card>

      <Card className="mt-3 gap-3">
        <Text className="text-sm font-medium text-foreground">Log a reading</Text>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="From surah"
              value={surahFrom}
              onChangeText={setSurahFrom}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Ayah"
              value={ayahFrom}
              onChangeText={setAyahFrom}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="To surah"
              value={surahTo}
              onChangeText={setSurahTo}
              keyboardType="number-pad"
              placeholder="same"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Ayah"
              value={ayahTo}
              onChangeText={setAyahTo}
              keyboardType="number-pad"
              placeholder="same"
            />
          </View>
        </View>

        <Input
          label="Pages read"
          value={pages}
          onChangeText={setPages}
          keyboardType="decimal-pad"
          placeholder="2"
          error={error}
        />

        <Button onPress={submit} loading={createLog.isPending}>
          {projected ? `Log reading — +${projected.coins} coins` : 'Log reading'}
        </Button>
      </Card>

      <View className="gap-2 pt-6">
        <Muted>Today&apos;s readings</Muted>
        {isLoading ? (
          <ActivityIndicator />
        ) : (logs ?? []).length === 0 ? (
          <Muted className="py-4 text-center text-xs">Nothing logged yet today.</Muted>
        ) : (
          (logs ?? []).map((log) => (
            <Card key={log.id} className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">
                {log.surah_from}:{log.ayah_from} → {log.surah_to}:{log.ayah_to}
              </Text>
              <Muted className="text-xs">{log.pages_read} pages</Muted>
            </Card>
          ))
        )}
      </View>
    </Screen>
  )
}
