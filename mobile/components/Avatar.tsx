import { useState } from 'react'
import { View, Text, Image } from 'react-native'
import { cn } from '@/lib/cn'

// A profile photo, or the first letter of the name when there is none (or it
// fails to load).

export function Avatar({
  url,
  name,
  size = 42,
  className,
  textClassName,
}: {
  url: string | null | undefined
  name: string
  size?: number
  className?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const initial = (name.trim().charAt(0) || '?').toUpperCase()
  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      {url && !failed ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Text className={cn('font-bold', textClassName)} style={{ fontSize: size * 0.4 }}>
          {initial}
        </Text>
      )}
    </View>
  )
}
