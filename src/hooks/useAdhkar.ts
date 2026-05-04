import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdhkarLogsForDate, logAdhkarComplete } from '@/lib/api/adhkar'
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
    onSuccess: (_data, { date }) => {
      qc.invalidateQueries({ queryKey: adhkarKeys.byDate(user!.id, date) })
    },
  })
}
