import { useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { clock12, parseDate } from '~/lib/format'

// Date and time pickers built from plain views. The dev client has no native
// picker module compiled in, and these match the app's own look on both
// platforms anyway.

// ─── Month grid ──────────────────────────────────────────────────────────────

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MonthGrid({
  value,
  onChange,
  marks,
}: {
  /** YYYY-MM-DD */
  value: string | null
  onChange: (date: string) => void
  /** Dates that get a dot under the number (e.g. days with tasks). */
  marks?: ReadonlySet<string>
}) {
  const today = localDateString()
  const initial = value ? parseDate(value) : new Date()
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() })

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    // Monday-first offset.
    const lead = (first.getDay() + 6) % 7
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const out: (string | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= days; d++) out.push(localDateString(new Date(cursor.y, cursor.m, d)))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [cursor])

  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  const step = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} onPress={() => step(-1)} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={16} color="#8a9793" />
        </Pressable>
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} onPress={() => step(1)} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronRight size={16} color="#8a9793" />
        </Pressable>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <Text key={i} className="flex-1 text-center text-[10px] font-semibold text-muted-foreground">
            {w}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />
          const selected = date === value
          const isToday = date === today
          const day = Number(date.slice(-2))
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                void Haptics.selectionAsync()
                onChange(date)
              }}
              style={{ width: `${100 / 7}%`, height: 40 }}
              className="items-center justify-center"
            >
              <View
                className={cn(
                  'h-8 w-8 items-center justify-center rounded-full',
                  selected && 'bg-primary',
                  !selected && isToday && 'border border-noor-500',
                )}
              >
                <Text
                  className={cn(
                    'text-[13px]',
                    selected ? 'font-bold text-white' : 'font-medium text-foreground',
                    !selected && isToday && 'text-noor-600 dark:text-noor-400',
                  )}
                >
                  {day}
                </Text>
              </View>
              {marks?.has(date) && !selected ? (
                <View className="absolute bottom-0.5 h-1 w-1 rounded-full bg-noor-500" />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── Time chips ──────────────────────────────────────────────────────────────

const QUICK_TIMES: { label: string; value: string }[] = [
  { label: 'Morning', value: '09:00' },
  { label: 'Noon', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'Evening', value: '18:00' },
  { label: 'Night', value: '21:00' },
]

/** Accepts "9", "9:30", "21:05", "9.30", "9 30"; returns "HH:MM" or null. */
export function parseTimeInput(raw: string): string | null {
  const m = /^\s*(\d{1,2})(?:[:.\s](\d{1,2}))?\s*(am|pm)?\s*$/i.exec(raw)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const ap = m[3]?.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function TimeChips({
  value,
  onChange,
}: {
  /** "HH:MM" or null for no time. */
  value: string | null
  onChange: (time: string | null) => void
}) {
  const [custom, setCustom] = useState('')
  const isQuick = QUICK_TIMES.some((q) => q.value === value)

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        <Chip label="No time" active={value === null} onPress={() => onChange(null)} />
        {QUICK_TIMES.map((q) => (
          <Chip
            key={q.value}
            label={`${q.label} ${clock12(q.value)}`}
            active={value === q.value}
            onPress={() => onChange(q.value)}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={custom}
          onChangeText={(t) => {
            setCustom(t)
            const parsed = parseTimeInput(t)
            if (parsed) onChange(parsed)
          }}
          placeholder="or type a time, e.g. 4:30 pm"
          placeholderTextColor="#9aa8a4"
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Custom time"
          className="h-10 flex-1 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        />
        {value && !isQuick ? (
          <Text className="text-sm font-semibold text-noor-600 dark:text-noor-400">{clock12(value)}</Text>
        ) : null}
      </View>
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className={cn(
        'rounded-full px-3 py-1.5',
        active ? 'bg-noor-500/10 border border-noor-500' : 'border border-transparent bg-muted',
      )}
    >
      <Text
        className={cn(
          'text-xs font-semibold',
          active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground',
        )}
      >
        {label}
      </Text>
    </Pressable>
  )
}
