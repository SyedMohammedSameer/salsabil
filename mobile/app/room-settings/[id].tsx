import { View, Text, Pressable, Alert, Share, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Share2, Trash2 } from 'lucide-react-native'
import { Screen, Muted, Card, FadeIn } from '~/components/ui'
import { RoomForm } from '~/components/rooms/RoomForm'
import { useRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useStudyRooms'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/platform/toast'

// Room settings, for the room's owner: rename it, change its length, size and
// visibility, share the invite code, or close it for everyone. Row-level
// security already limits updates and deletes to the owner; the screen just
// does not offer them to anyone else.

export default function RoomSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { data: room, isLoading } = useRoom(id)
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  if (isLoading) {
    return (
      <Screen>
        <View className="py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }

  if (!room || room.owner_id !== user?.id) {
    return (
      <Screen>
        <Card variant="outline-dashed" className="mt-4 items-center py-8">
          <Muted>{room ? 'Only the host can change this room.' : 'This room no longer exists.'}</Muted>
        </Card>
      </Screen>
    )
  }

  const inSession = room.timer_state === 'running' || room.timer_state === 'paused'

  const share = () => {
    void Share.share({
      message: `Join my study room "${room.name}" on Salsabil. Room code: ${room.code}`,
    })
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete this room?',
      'Everyone in it is removed and its chat is deleted. This cannot be undone.',
      [
        { text: 'Keep room', style: 'cancel' },
        {
          text: 'Delete room',
          style: 'destructive',
          onPress: () => {
            deleteRoom.mutate(room.id, {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                toast.success('Room deleted')
                // Back past the room itself to the Rooms list.
                router.dismissAll()
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not delete the room.'),
            })
          },
        },
      ],
    )
  }

  return (
    <Screen>
      <View className="gap-4 pb-10 pt-2">
        <FadeIn index={0}>
          <Card className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1">
              <Muted className="text-xs">Invite code</Muted>
              <Text className="text-[22px] font-bold tracking-[4px] text-foreground">{room.code}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share invite"
              onPress={share}
              className="h-10 flex-row items-center gap-1.5 rounded-xl bg-noor-500/10 px-3.5"
            >
              <Share2 size={16} color="#0d9488" />
              <Text className="text-[13px] font-semibold text-noor-700 dark:text-noor-300">Share</Text>
            </Pressable>
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <Card>
            <RoomForm
              initial={{
                name: room.name,
                description: room.description ?? '',
                timer_duration: room.timer_duration,
                max_participants: room.max_participants,
                is_public: room.is_public,
              }}
              submitLabel="Save changes"
              busy={updateRoom.isPending}
              lengthLocked={inSession}
              onSubmit={(v) =>
                updateRoom.mutate(
                  {
                    id: room.id,
                    updates: {
                      name: v.name,
                      description: v.description || null,
                      max_participants: v.max_participants,
                      is_public: v.is_public,
                      ...(inSession ? {} : { timer_duration: v.timer_duration }),
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success('Room updated')
                      router.back()
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save the room.'),
                  },
                )
              }
            />
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            disabled={deleteRoom.isPending}
            className="flex-row items-center gap-3 rounded-2xl border border-danger-500/30 bg-danger-500/5 px-4 py-3.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-danger-500/10">
              {deleteRoom.isPending ? <ActivityIndicator size="small" color="#ef4444" /> : <Trash2 size={18} color="#ef4444" />}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-danger-500">Delete room</Text>
              <Muted className="text-xs">Closes it for everyone and deletes its chat</Muted>
            </View>
          </Pressable>
        </FadeIn>
      </View>
    </Screen>
  )
}

