import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile, checkUsernameAvailable } from '@/lib/api/profile'
import { useAuth } from './useAuth'

export const profileKeys = {
  all: ['profile'] as const,
  byId: (id: string) => ['profile', id] as const,
}

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKeys.byId(user?.id ?? ''),
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: Parameters<typeof updateProfile>[1]) => updateProfile(user!.id, updates),
    onSuccess: (updated) => {
      qc.setQueryData(profileKeys.byId(updated.id), updated)
    },
  })
}

export function useCheckUsername() {
  return useMutation({
    mutationFn: (username: string) => checkUsernameAvailable(username),
  })
}
