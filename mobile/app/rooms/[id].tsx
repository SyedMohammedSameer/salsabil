import { useLocalSearchParams } from 'expo-router'
import { ComingSoon } from '~/components/ui'

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ComingSoon title="Study Room" note={`Room ${id} is ported in the social phase.`} />
}
