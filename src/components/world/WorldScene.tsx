import { useMemo } from 'react'
import type { AvatarSlot, WorldItem, WorldState } from '@/lib/database.types'
import { CATALOG_BY_KEY } from '@/data/worldCatalog'
import { Avatar, type EquippedMap } from './Avatar'
import { AmbientLife, DECORATION_SPRITES, DesertBiome, GROUND_Y, SCENE_H, SCENE_W } from './sprites'

interface WorldSceneProps {
  world: WorldState
  items: WorldItem[]
  /** Drives ambient life (birds, plants). Defaults to 1. */
  level?: number
  className?: string
}

/**
 * The full living-world canvas: biome backdrop + owned decorations placed at
 * their catalog anchors + the avatar wearing whatever is equipped. One
 * responsive SVG so everything scales and layers together.
 */
export function WorldScene({ world, items, level = 1, className }: WorldSceneProps) {
  const equipped: EquippedMap = useMemo(() => {
    const map: EquippedMap = {}
    for (const it of items) {
      if (it.equipped && it.slot) map[it.slot as AvatarSlot] = it.item_key
    }
    return map
  }, [items])

  const decorations = useMemo(
    () =>
      items
        .map((it) => CATALOG_BY_KEY[it.item_key])
        .filter((c) => c && c.category === 'decoration' && c.anchor)
        // Draw back-to-front: smaller x (further left) first is fine; sort by
        // anchor x so overlaps layer predictably.
        .sort((a, b) => a!.anchor!.x - b!.anchor!.x),
    [items],
  )

  return (
    <svg
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      className={className}
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label={`Your ${world.biome} world`}
    >
      <defs>
        <linearGradient id="sky-desert" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe0b8" />
          <stop offset="45%" stopColor="#f8c48a" />
          <stop offset="100%" stopColor="#f2a765" />
        </linearGradient>
      </defs>

      <DesertBiome />
      <AmbientLife level={level} />

      {decorations.map((c) => {
        const Sprite = DECORATION_SPRITES[c!.key]
        if (!Sprite) return null
        const { x, scale, flip } = c!.anchor!
        const sx = flip ? -scale : scale
        return (
          <g key={c!.key} transform={`translate(${x * SCENE_W} ${GROUND_Y}) scale(${sx} ${scale})`}>
            <Sprite />
          </g>
        )
      })}

      {/* Avatar, centred on the ground */}
      <g transform={`translate(${SCENE_W / 2} ${GROUND_Y})`}>
        <ellipse cx={0} cy={-1} rx={20} ry={4} fill="#00000022" />
        <Avatar variant={world.avatar_variant} equipped={equipped} />
      </g>
    </svg>
  )
}
