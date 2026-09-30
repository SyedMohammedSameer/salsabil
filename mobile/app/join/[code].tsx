import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DoorClosed } from 'lucide-react-native'
import { Button, Muted } from '~/components/ui'
import { fetchRoomByCode } from '@/lib/api/studyRooms'
import { hubHref } from '~/lib/nav'

// An invite link: salsabil://join/<code>. Looks the room up and opens it, or
// says plainly that the code no longer works. A room id is accepted too.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function JoinRoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!code) return
    if (UUID.test(code)) {
      router.replace(`/rooms/${code}` as Href)
      return
    }
    fetchRoomByCode(code)
      .then((room) => router.replace(`/rooms/${room.id}` as Href))
      .catch(() => setFailed(true))
  }, [code, router])

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-background px-8">
      {failed ? (
        <>
          <DoorClosed size={36} strokeWidth={1.5} color="#8a9793" />
          <Text className="text-center text-[17px] font-semibold text-foreground">That invite no longer works</Text>
          <Muted className="text-center text-sm">The room may have been deleted, or the code mistyped.</Muted>
          <Button variant="outline" onPress={() => router.replace(hubHref('focus', 'rooms'))}>
            Open study rooms
          </Button>
        </>
      ) : (
        <View className="items-center gap-3">
          <ActivityIndicator />
          <Muted>Opening the room…</Muted>
        </View>
      )}
    </SafeAreaView>
  )
}
