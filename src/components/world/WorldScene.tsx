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
  /** When false the avatar stands still (used for static previews). */
  animate?: boolean
  /** When false the (vector) avatar is omitted — the pixel character overlays instead. */
  showAvatar?: boolean
  className?: string
}

// Walk cycle. Scoped under `.world-walker` so it only animates the scene's
// avatar, never the shop-preview avatars, and it's fully disabled for users
// who prefer reduced motion. Pure CSS → works without JS and costs nothing.
const WALK_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .world-walker { animation: world-stroll 26s ease-in-out infinite; transform-box: fill-box; transform-origin: center bottom; }
  .world-walker .world-bob { animation: world-bob 0.62s ease-in-out infinite; }
  .world-walker .world-foot--l { animation: world-step-l 0.62s ease-in-out infinite; transform-box: fill-box; }
  .world-walker .world-foot--r { animation: world-step-r 0.62s ease-in-out infinite; transform-box: fill-box; }
}
@keyframes world-stroll {
  0%   { transform: translateX(-70px) scaleX(1); }
  46%  { transform: translateX(70px)  scaleX(1); }
  50%  { transform: translateX(70px)  scaleX(-1); }
  96%  { transform: translateX(-70px) scaleX(-1); }
  100% { transform: translateX(-70px) scaleX(1); }
}
@keyframes world-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes world-step-l { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes world-step-r { 0%,100% { transform: translateY(-2.5px); } 50% { transform: translateY(0); } }
`

/**
 * The full living-world canvas: biome backdrop + owned decorations placed at
 * their catalog anchors + the avatar wearing whatever is equipped. One
 * responsive SVG so everything scales and layers together.
 */
export function WorldScene({
  world,
  items,
  level = 1,
  animate = true,
  showAvatar = true,
  className,
}: WorldSceneProps) {
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
      {animate && <style>{WALK_CSS}</style>}

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

      {/* Legacy vector avatar — omitted when the pixel character overlays. */}
      {showAvatar && (
        <g transform={`translate(${SCENE_W / 2} ${GROUND_Y})`}>
          <g className={animate ? 'world-walker' : undefined}>
            <g transform="scale(0.9)">
              <g className="world-bob">
                <Avatar variant={world.avatar_variant} equipped={equipped} />
              </g>
            </g>
          </g>
        </g>
      )}
    </svg>
  )
}
