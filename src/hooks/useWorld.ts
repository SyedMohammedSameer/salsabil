import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { profileKeys } from './useProfile'
import {
  buyItem,
  ensureWorldState,
  fetchWorldItems,
  setAvatar,
  setBiome,
  setCustomization,
  setEquipped,
  type Customization,
} from '@/lib/api/world'
import { CATALOG_BY_KEY } from '@/data/worldCatalog'
import type { AvatarVariant, WorldBiome, WorldItem, WorldState } from '@/lib/database.types'

export const worldKeys = {
  all: ['world'] as const,
  state: (userId: string) => ['world', 'state', userId] as const,
  items: (userId: string) => ['world', 'items', userId] as const,
}

export function useWorldState() {
  const { user } = useAuth()
  return useQuery({
    queryKey: worldKeys.state(user?.id ?? ''),
    queryFn: () => ensureWorldState(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useWorldItems() {
  const { user } = useAuth()
  return useQuery({
    queryKey: worldKeys.items(user?.id ?? ''),
    queryFn: () => fetchWorldItems(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useBuyItem() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (itemKey: string) => buyItem(user!.id, itemKey),
    onSuccess: (_balance, itemKey) => {
      qc.invalidateQueries({ queryKey: worldKeys.items(user!.id) })
      qc.invalidateQueries({ queryKey: profileKeys.byId(user!.id) })
      const item = CATALOG_BY_KEY[itemKey]
      toast.success(`${item?.name ?? 'Item'} added to your world!`)
    },
    onError: (err: Error) => {
      if (err.message === 'Not enough coins') {
        toast.error('Not enough coins — earn more from focus, tasks, and prayers.')
      } else if (err.message === 'Already owned') {
        toast.error('You already own this.')
      } else {
        toast.error('Could not complete purchase.')
      }
    },
  })
}

export function useSetEquipped() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ item, equip }: { item: WorldItem; equip: boolean }) =>
      setEquipped(user!.id, item.id, equip),
    // Optimistically flip equipped state (and clear same-slot items) so the
    // avatar updates instantly.
    onMutate: async ({ item, equip }) => {
      const key = worldKeys.items(user!.id)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<WorldItem[]>(key)
      qc.setQueryData<WorldItem[]>(key, (old) =>
        old?.map((i) => {
          if (i.id === item.id) return { ...i, equipped: equip }
          if (equip && i.slot === item.slot) return { ...i, equipped: false }
          return i
        }),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(worldKeys.items(user!.id), ctx.prev)
      toast.error('Could not update your look.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: worldKeys.items(user!.id) })
    },
  })
}

export function useSetAvatar() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (variant: AvatarVariant) => setAvatar(user!.id, variant),
    onSuccess: (state) => {
      qc.setQueryData<WorldState>(worldKeys.state(user!.id), state)
    },
    onError: () => toast.error('Could not switch character.'),
  })
}

export function useSetBiome() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (biome: WorldBiome) => setBiome(user!.id, biome),
    onSuccess: (state) => {
      qc.setQueryData<WorldState>(worldKeys.state(user!.id), state)
    },
    onError: () => toast.error('Could not change biome.'),
  })
}

export function useSetCustomization() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (patch: Customization) => setCustomization(user!.id, patch),
    // Optimistic — recolour instantly.
    onMutate: async (patch) => {
      const key = worldKeys.state(user!.id)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<WorldState>(key)
      if (prev) qc.setQueryData<WorldState>(key, { ...prev, ...patch })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(worldKeys.state(user!.id), ctx.prev)
      toast.error('Could not update your look.')
    },
  })
}
