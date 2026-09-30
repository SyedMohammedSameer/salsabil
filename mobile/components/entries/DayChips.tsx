import { View, Text, Pressable, ScrollView } from 'react-native'
import * as Haptics from 'expo-haptics'
import { addDays, parseDate } from '~/lib/format'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/cn'

// Which day a log is for: today or any of the six days before it. Used to
// backdate a reading or a workout you forgot to log.

export function DayChips({
  value,
  onChange,
  days = 7,
}: {
  value: string
  onChange: (date: string) => void
  days?: number
}) {
  const today = localDateString()
  const options = Array.from({ length: days }, (_, i) => addDays(today, -i))
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((d, i) => {
        const active = d === value
        const label =
          i === 0 ? 'Today' : i === 1 ? 'Yesterday' : parseDate(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              void Haptics.selectionAsync()
              onChange(d)
            }}
            className={cn('rounded-full border px-3 py-1.5', active ? 'border-noor-500 bg-noor-500/10' : 'border-transparent bg-muted')}
          >
            <Text className={cn('text-xs font-semibold', active ? 'text-noor-600 dark:text-noor-400' : 'text-muted-foreground')}>{label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** A labelled row, for the edit screens. */
export function FieldLabel({ children }: { children: string }) {
  return (
    <View>
      <Text className="text-sm font-medium text-foreground">{children}</Text>
    </View>
  )
}
