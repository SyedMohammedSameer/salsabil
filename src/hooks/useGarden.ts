import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { profileKeys } from './useProfile'
import { fetchGardenTrees, plantTree, addXPToTree, waterNewestActiveTree } from '@/lib/api/garden'
import { spendCoins } from '@/lib/api/coins'
import { WATER_COST_COINS, WATER_XP_GAIN } from '@/lib/rewards'
import type { TreeSpecies, GardenTree } from '@/lib/database.types'
import { SPECIES_INFO } from '@/lib/api/garden'

export const gardenKeys = {
  all: ['garden'] as const,
  trees: (userId: string) => ['garden', 'trees', userId] as const,
}

export function useGardenTrees() {
  const { user } = useAuth()
  return useQuery({
    queryKey: gardenKeys.trees(user?.id ?? ''),
    queryFn: () => fetchGardenTrees(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function usePlantTree() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      species,
      posX,
      posY,
    }: {
      species: TreeSpecies
      posX?: number
      posY?: number
    }) => {
      const info = SPECIES_INFO[species]
      // Deduct coins first (atomic RPC — throws if insufficient)
      if (info.cost > 0) {
        await spendCoins(user!.id, 'tree_purchase', info.cost, `Planted ${info.name}`)
      }
      return plantTree(user!.id, species, posX, posY)
    },
    onSuccess: (tree) => {
      qc.setQueryData<GardenTree[]>(gardenKeys.trees(user!.id), (old) =>
        old ? [...old, tree] : [tree],
      )
      qc.invalidateQueries({ queryKey: profileKeys.byId(user!.id) })
      toast.success('Tree planted! 🌱')
    },
    onError: (err: Error) => {
      if (err.message === 'Not enough coins') {
        toast.error('Not enough coins to plant this tree.')
      } else {
        toast.error('Could not plant tree.')
      }
    },
  })
}

export function useWaterTree() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (treeId: string) => {
      // Atomic coin deduction — throws 'Not enough coins' if balance too low.
      await spendCoins(user!.id, 'tree_purchase', WATER_COST_COINS, 'Watered a tree')
      return addXPToTree(treeId, WATER_XP_GAIN)
    },
    onSuccess: (updated, _treeId, _ctx) => {
      qc.setQueryData<GardenTree[]>(gardenKeys.trees(user!.id), (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)),
      )
      qc.invalidateQueries({ queryKey: profileKeys.byId(user!.id) })
      toast.success(`+${WATER_XP_GAIN} XP — tree is now ${updated.stage}`)
    },
    onError: (err: Error) => {
      if (err.message === 'Not enough coins') {
        toast.error(
          `Watering costs ${WATER_COST_COINS} coins — earn more from focus, tasks, workouts.`,
        )
      } else {
        toast.error('Could not water tree.')
      }
    },
  })
}

// Called internally after focus session completes — waters the garden silently.
export function useWaterNewestTree() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (xp: number) => waterNewestActiveTree(user!.id, xp),
    onSuccess: (updated) => {
      if (!updated) return
      qc.setQueryData<GardenTree[]>(gardenKeys.trees(user!.id), (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)),
      )
    },
  })
}
