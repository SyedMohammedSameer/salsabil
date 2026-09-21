import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAdhkarLogsForDate, logAdhkarComplete } from '@/lib/api/adhkar'
import { awardCoinsOnce, awardKeys } from '@/lib/api/coins'
import { coinsFor } from '@/lib/rewards'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import type { AdhkarTime } from '@/lib/database.types'
import { useAuth } from './useAuth'

export const adhkarKeys = {
  byDate: (userId: string, date: string) => ['adhkar', userId, date] as const,
}

export function useAdhkarLogs(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: adhkarKeys.byDate(user?.id ?? '', date),
    queryFn: () => getAdhkarLogsForDate(user!.id, date),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useLogAdhkarComplete() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, time }: { date: string; time: AdhkarTime }) =>
      logAdhkarComplete(user!.id, date, time),
    onSuccess: (_data, { date, time }) => {
      qc.invalidateQueries({ queryKey: adhkarKeys.byDate(user!.id, date) })
      if (!user) return

      // One payout per adhkar slot per day, so re-opening a completed session
      // does not pay again.
      const reward = coinsFor({ kind: 'adhkar' })
      awardCoinsOnce(
        user.id,
        'adhkar_complete',
        reward,
        awardKeys.adhkar(date, time),
        `Adhkar: ${time}`,
      )
        .then((balance) => {
          if (balance === null) return
          qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })
          qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) })
          toast.success(`+${reward.coins} coins — adhkar complete.`)
        })
        .catch(() => {
          /* the log itself saved; a failed payout must not surface as an error */
        })
    },
  })
}
