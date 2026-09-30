import { useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Brain, X, Plus } from 'lucide-react-native'
import { Screen, Muted, Card, FadeIn } from '~/components/ui'
import { useMemories, useAddMemory, useDeleteMemory } from '@/hooks/useMemories'
import type { MemoryKind, UserMemory } from '@/lib/api/memories'
import { toast } from '@/lib/platform/toast'
import { cn } from '@/lib/cn'

// Everything Noor remembers about you, in the open: what it is, when it was
// learnt, and a way to delete any of it, or all of it. Noor only knows what
// is on this list plus the app data sent with each message.

const KINDS: { value: MemoryKind; label: string; hint: string }[] = [
  { value: 'goal', label: 'Goals', hint: 'What you are working towards' },
  { value: 'preference', label: 'Preferences', hint: 'How you like things done' },
  { value: 'fact', label: 'About you', hint: 'Facts you have shared' },
  { value: 'context', label: 'Context', hint: 'What is going on right now' },
]

export default function MemoriesScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { data: memories, isLoading } = useMemories()
  const add = useAddMemory()
  const remove = useDeleteMemory()
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState<MemoryKind>('fact')
  const [clearing, setClearing] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<MemoryKind, UserMemory[]>()
    for (const m of memories ?? []) map.set(m.kind, [...(map.get(m.kind) ?? []), m])
    return map
  }, [memories])

  const forgetAll = () =>
    Alert.alert('Forget everything?', 'Noor loses everything on this list. Your chat history and app data are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget all',
        style: 'destructive',
        onPress: async () => {
          setClearing(true)
          for (const m of memories ?? []) await remove.mutateAsync(m.id).catch(() => undefined)
          setClearing(false)
          toast.success('Noor has forgotten everything')
        },
      },
    ])

  const submit = () => {
    const content = draft.trim()
    if (!content) return
    add.mutate({ content, kind }, { onSuccess: () => setDraft('') })
  }

  return (
    <Screen>
      <View className="gap-4 pb-10 pt-2">
        <FadeIn index={0}>
          <Card variant="glass-noor" className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-noor-500/15">
              <Brain size={19} color={dark ? '#2dd4bf' : '#0d9488'} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-foreground">Noor's memory</Text>
              <Muted className="text-xs">
                Noor saves things you tell it so it can help better next time. You can delete anything here, and Noor
                forgets it straight away.
              </Muted>
            </View>
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <Card className="gap-3">
            <Text className="text-[13px] font-semibold text-foreground">Tell Noor something to remember</Text>
            <View className="flex-row flex-wrap gap-2">
              {KINDS.map((k) => (
                <Pressable
                  key={k.value}
                  onPress={() => setKind(k.value)}
                  className={cn('rounded-full border px-3 py-1.5', kind === k.value ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted')}
                >
                  <Text className={cn('text-xs font-semibold', kind === k.value ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>
                    {k.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                placeholder="e.g. I study best before Fajr"
                placeholderTextColor="#83938f"
                maxLength={500}
                returnKeyType="done"
                className="h-11 flex-1 rounded-xl border border-input bg-card px-3 text-[15px] text-foreground"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save memory"
                onPress={submit}
                disabled={!draft.trim() || add.isPending}
                className="h-11 w-11 items-center justify-center rounded-xl bg-primary"
                style={{ opacity: draft.trim() ? 1 : 0.4 }}
              >
                {add.isPending ? <ActivityIndicator size="small" color="#ffffff" /> : <Plus size={18} color="#ffffff" />}
              </Pressable>
            </View>
          </Card>
        </FadeIn>

        {isLoading ? (
          <ActivityIndicator />
        ) : (memories ?? []).length === 0 ? (
          <Card variant="outline-dashed" className="items-center py-8">
            <Muted className="text-center text-xs">Noor has not saved anything yet.</Muted>
          </Card>
        ) : (
          KINDS.filter((k) => grouped.has(k.value)).map((k, gi) => (
            <FadeIn key={k.value} index={2 + gi}>
              <View className="gap-2">
                <View className="px-1">
                  <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-muted-foreground">{k.label}</Text>
                </View>
                <Card className="p-0">
                  {(grouped.get(k.value) ?? []).map((m, i) => (
                    <View key={m.id} className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 && 'border-t border-border')}>
                      <View className="min-w-0 flex-1">
                        <Text className="text-[14px] leading-5 text-foreground">{m.content}</Text>
                        <Muted className="mt-0.5 text-[11px]">
                          {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Muted>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Forget: ${m.content}`}
                        hitSlop={8}
                        onPress={() => {
                          void Haptics.selectionAsync()
                          remove.mutate(m.id)
                        }}
                        className="h-8 w-8 items-center justify-center rounded-full bg-muted"
                      >
                        <X size={14} color="#8a9793" />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              </View>
            </FadeIn>
          ))
        )}

        {(memories ?? []).length > 0 ? (
          <Pressable
            onPress={forgetAll}
            disabled={clearing}
            className="items-center rounded-2xl border border-danger-500/30 py-3"
          >
            {clearing ? <ActivityIndicator color="#ef4444" /> : <Text className="text-sm font-semibold text-danger-500">Forget everything</Text>}
          </Pressable>
        ) : null}
      </View>
    </Screen>
  )
}
