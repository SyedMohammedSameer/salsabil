import { View, Text } from 'react-native'
import { Coins } from 'lucide-react-native'
import { Hub } from '~/components/Hub'
import { useProfile } from '@/hooks/useProfile'
import GardenContent from '~/features/garden'
import ChallengesContent from '~/features/challenges'
import WorkoutsContent from '~/features/workouts'
import AnalyticsContent from '~/features/analytics'

// Grow: everything that compounds. The garden the coins buy, the challenges
// and workouts that earn them, and the analytics that show the curve.

export default function GrowHub() {
  const { data: profile } = useProfile()

  return (
    <Hub
      name="grow"
      title="Grow"
      right={
        <View className="mb-1 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <Coins size={14} color="#d97706" />
          <Text className="text-[13px] font-bold text-foreground">
            {(profile?.coins ?? 0).toLocaleString()}
          </Text>
        </View>
      }
      labels={{ garden: 'Garden', challenges: 'Challenges', workouts: 'Workouts', analytics: 'Analytics' }}
      render={(tab) =>
        tab === 'garden' ? (
          <GardenContent />
        ) : tab === 'challenges' ? (
          <ChallengesContent />
        ) : tab === 'workouts' ? (
          <WorkoutsContent />
        ) : (
          <AnalyticsContent />
        )
      }
    />
  )
}
