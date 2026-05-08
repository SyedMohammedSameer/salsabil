import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/lib/api/stats'
import { useProfile } from './useProfile'

export const statsKeys = {
  dashboard: (userId: string, date: string) => ['dashboard-stats', userId, date] as const,
}

export function useDashboardStats(today: string) {
  const { data: profile } = useProfile()
  // profile.id in the key is sufficient — adding full profile object wastes cache
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return useQuery({
    queryKey: statsKeys.dashboard(profile?.id ?? '', today),
    queryFn: () => getDashboardStats(profile!, today),
    enabled: !!profile?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
