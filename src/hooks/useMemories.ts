import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import {
  listMemories,
  addMemory,
  forgetMemory,
  deleteMemoryById,
  type MemoryKind,
  type UserMemory,
} from '@/lib/api/memories'

export const memoryKeys = {
  all: (userId: string) => ['memories', userId] as const,
}

export function useMemories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: memoryKeys.all(user?.id ?? ''),
    queryFn: () => listMemories(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useAddMemory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ content, kind }: { content: string; kind?: MemoryKind }) =>
      addMemory(user!.id, content, kind),
    onSuccess: (mem) => {
      qc.setQueryData<UserMemory[]>(memoryKeys.all(user!.id), (old) =>
        old ? [mem, ...old] : [mem],
      )
    },
  })
}

export function useForgetMemory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contentLike: string) => forgetMemory(user!.id, contentLike),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memoryKeys.all(user!.id) })
    },
  })
}

export function useDeleteMemory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMemoryById(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memoryKeys.all(user!.id) })
    },
  })
}
