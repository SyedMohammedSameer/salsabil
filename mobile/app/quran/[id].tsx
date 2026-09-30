import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Trash2 } from 'lucide-react-native'
import { Screen, Muted, Card, Button, Input } from '~/components/ui'
import { DayChips, FieldLabel } from '~/components/entries/DayChips'
import { useQuranLogs, useUpdateQuranLog, useDeleteQuranLog } from '@/hooks/useQuranLogs'
import { coinsFor } from '@/lib/rewards'
import { surahName, SURAH_COUNT } from '@/data/surahs'
import { toast } from '@/lib/platform/toast'

// Correct or delete one Quran reading. Coins stay as first paid when the
// reading is edited; deleting it takes them back.

const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : null)

export default function QuranLogEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: logs, isLoading } = useQuranLogs()
  const log = useMemo(() => (logs ?? []).find((l) => l.id === id) ?? null, [logs, id])
  const update = useUpdateQuranLog()
  const remove = useDeleteQuranLog()

  const [f, setF] = useState({ sFrom: '', aFrom: '', sTo: '', aTo: '', pages: '', mins: '', notes: '', date: '' })
  const [error, setError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }))

  useEffect(() => {
    if (seeded || !log) return
    setF({
      sFrom: String(log.surah_from),
      aFrom: String(log.ayah_from),
      sTo: String(log.surah_to),
      aTo: String(log.ayah_to),
      pages: String(Number(log.pages_read)),
      mins: log.duration_mins ? String(log.duration_mins) : '',
      notes: log.notes ?? '',
      date: log.date,
    })
    setSeeded(true)
  }, [log, seeded])

  if (isLoading) {
    return (
      <Screen>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }
  if (!log) {
    return (
      <Screen>
        <Card variant="outline-dashed" className="mt-4 items-center py-8">
          <Muted>This reading no longer exists.</Muted>
        </Card>
      </Screen>
    )
  }

  const save = () => {
    setError(null)
    const sFrom = int(f.sFrom)
    const aFrom = int(f.aFrom)
    const sTo = int(f.sTo)
    const aTo = int(f.aTo)
    const pages = /^\d+(\.\d)?$/.test(f.pages.trim()) ? Number(f.pages.trim()) : null
    const mins = f.mins.trim() ? int(f.mins) : null
    if (!sFrom || !aFrom || !sTo || !aTo) return setError('Enter the surah and ayah you started and finished at.')
    if (sFrom > SURAH_COUNT || sTo > SURAH_COUNT || sTo < sFrom) return setError('That surah range is not valid.')
    if (!pages || pages <= 0) return setError('Enter how many pages you read.')
    update.mutate(
      {
        id: log.id,
        updates: {
          surah_from: sFrom,
          ayah_from: aFrom,
          surah_to: sTo,
          ayah_to: aTo,
          pages_read: pages,
          duration_mins: mins,
          notes: f.notes.trim() || null,
          date: f.date,
        },
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.back()
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not save.'),
      },
    )
  }

  const paid = coinsFor({ kind: 'quran', pages: log.pages_read }).coins
  const confirmDelete = () =>
    Alert.alert('Delete this reading?', `The ${paid} coins it earned are taken back.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(log, {
            onSuccess: () => {
              toast.success('Reading deleted')
              router.back()
            },
          }),
      },
    ])

  const box = 'h-11 w-full rounded-xl border border-input bg-card px-3 text-center text-[16px] font-bold text-foreground'

  return (
    <Screen>
      <View className="gap-4 pb-10 pt-2">
        <Card className="gap-4">
          <View className="gap-2">
            <FieldLabel>From</FieldLabel>
            <View className="flex-row items-center gap-2">
              <View className="min-w-0 flex-1"><TextInput value={f.sFrom} onChangeText={(v) => set({ sFrom: v })} keyboardType="number-pad" maxLength={3} className={box} accessibilityLabel="From surah" /></View>
              <Text className="text-muted-foreground">:</Text>
              <View className="min-w-0 flex-1"><TextInput value={f.aFrom} onChangeText={(v) => set({ aFrom: v })} keyboardType="number-pad" maxLength={3} className={box} accessibilityLabel="From ayah" /></View>
            </View>
            {int(f.sFrom) && int(f.sFrom)! <= SURAH_COUNT ? <Muted className="text-xs">{surahName(int(f.sFrom)!)}</Muted> : null}
          </View>
          <View className="gap-2">
            <FieldLabel>To</FieldLabel>
            <View className="flex-row items-center gap-2">
              <View className="min-w-0 flex-1"><TextInput value={f.sTo} onChangeText={(v) => set({ sTo: v })} keyboardType="number-pad" maxLength={3} className={box} accessibilityLabel="To surah" /></View>
              <Text className="text-muted-foreground">:</Text>
              <View className="min-w-0 flex-1"><TextInput value={f.aTo} onChangeText={(v) => set({ aTo: v })} keyboardType="number-pad" maxLength={3} className={box} accessibilityLabel="To ayah" /></View>
            </View>
            {int(f.sTo) && int(f.sTo)! <= SURAH_COUNT ? <Muted className="text-xs">{surahName(int(f.sTo)!)}</Muted> : null}
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input label="Pages" value={f.pages} onChangeText={(v) => set({ pages: v })} keyboardType="decimal-pad" maxLength={5} />
            </View>
            <View className="flex-1">
              <Input label="Minutes (optional)" value={f.mins} onChangeText={(v) => set({ mins: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" maxLength={3} />
            </View>
          </View>
          <View className="gap-2">
            <FieldLabel>Day</FieldLabel>
            <DayChips value={f.date} onChange={(date) => set({ date })} days={14} />
          </View>
          <View className="gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <TextInput
              value={f.notes}
              onChangeText={(notes) => set({ notes })}
              placeholder="A verse that stayed with you"
              placeholderTextColor="#83938f"
              multiline
              maxLength={500}
              className="min-h-[72px] rounded-xl border border-input bg-card px-3 py-2.5 text-base text-foreground"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
          <Muted className="text-xs">Coins stay as first logged when you correct a reading.</Muted>
          {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
          <Button onPress={save} loading={update.isPending}>
            Save changes
          </Button>
        </Card>
        <Pressable onPress={confirmDelete} className="flex-row items-center justify-center gap-2 rounded-2xl border border-danger-500/30 py-3">
          <Trash2 size={16} color="#ef4444" />
          <Text className="text-sm font-semibold text-danger-500">Delete reading</Text>
        </Pressable>
      </View>
    </Screen>
  )
}
